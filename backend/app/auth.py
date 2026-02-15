"""
Phase 1: Auth and user identity.
Provides register, login, logout; user_id via session or X-User-Id header.
Register creates users + user_profiles (with preferences). Login supports email+password.
"""
from flask import Blueprint, request, jsonify, session, g, current_app
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


def _build_preferences_from_body(profile):
    """Build preferences JSONB from onboarding/profile payload."""
    if not profile or not isinstance(profile, dict):
        return {}
    dietary = profile.get("dietary") or profile.get("dietaryRestrictions") or []
    diet = dietary[0] if isinstance(dietary, list) and dietary else profile.get("diet") or ""
    allergies = profile.get("allergies") or []
    dislikes_raw = profile.get("dislikes") or profile.get("dislikedFoods")
    if isinstance(dislikes_raw, list):
        dislikes = [str(x).strip() for x in dislikes_raw if x]
    elif isinstance(dislikes_raw, str) and dislikes_raw.strip():
        dislikes = [x.strip() for x in dislikes_raw.split(",") if x.strip()]
    else:
        dislikes = []
    budget = profile.get("budget") or profile.get("budget_weekly") or 80
    cooking_time = profile.get("cookingTime") or profile.get("availableTime") or profile.get("max_prep_minutes") or 30
    household = profile.get("householdSize") or profile.get("household_size") or 1
    return {
        "zip": profile.get("zip") or "",
        "budget_weekly": budget,
        "budget": budget,
        "budgetPeriod": "weekly",
        "dietaryRestrictions": [diet] if diet else dietary if isinstance(dietary, list) else [],
        "diet": diet if isinstance(diet, str) else (dietary[0] if dietary else ""),
        "allergies": allergies if isinstance(allergies, list) else [],
        "dislikedFoods": dislikes if isinstance(dislikes, list) else [],
        "availableTime": cooking_time,
        "max_prep_minutes": cooking_time,
        "householdSize": household,
        "household_size": household,
        "healthGoals": profile.get("goals") or profile.get("healthGoals") or [],
        "cookingSkill": profile.get("skillLevel") or profile.get("cookingSkill") or "beginner",
        "pantryItems": profile.get("pantryItems") or [],
    }


@auth_bp.post("/auth/register")
def register():
    """Create user + user_profiles with preferences. Requires name, email, password. Optional: profile (preferences)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    password = body.get("password")

    if not email:
        return jsonify({"error": "email_required", "message": "Email is required"}), 400
    if not password:
        return jsonify({"error": "password_required", "message": "Password is required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password_too_short", "message": "Password must be at least 6 characters"}), 400

    password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    try:
        res = sb.table("users").insert({
            "name": name or email.split("@")[0],
            "email": email,
            "password_hash": password_hash,
        }).execute()
    except Exception as e:
        err = str(e).lower()
        if "duplicate" in err or "unique" in err or "already exists" in err:
            return jsonify({"error": "email_taken", "message": "Email already registered"}), 409
        raise

    if not res.data:
        return jsonify({"error": "insert_failed", "message": "Could not create user"}), 500

    user = res.data[0]
    user_id = str(user["id"])

    profile_data = body.get("profile") or body
    preferences = _build_preferences_from_body(profile_data)
    dislikes = preferences.get("dislikedFoods") or []
    allergies = preferences.get("allergies") or []

    profile_row_min = {
        "user_id": user_id,
        "name": user.get("name"),
        "email": email,
        "preferences": preferences,
    }
    profile_row = {
        **profile_row_min,
        "zip": (profile_data.get("zip") or "") if isinstance(profile_data, dict) else "",
        "budget_weekly": preferences.get("budget_weekly", 80),
        "diet": preferences.get("diet") or (preferences.get("dietaryRestrictions") or [None])[0] or "",
        "allergies": allergies,
        "dislikes": dislikes,
        "max_prep_minutes": preferences.get("availableTime", 30),
        "household_size": preferences.get("householdSize", 1),
    }

    try:
        sb.table("user_profiles").upsert(profile_row, on_conflict="user_id").execute()
    except Exception:
        sb.table("user_profiles").upsert(profile_row_min, on_conflict="user_id").execute()

    session["user_id"] = user_id
    session.permanent = True

    return jsonify({"user_id": user_id, "name": user.get("name"), "email": email}), 201


@auth_bp.post("/auth/login")
def login():
    """Login by email+password, or by user_id (legacy)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    email = (body.get("email") or "").strip()
    password = body.get("password")
    user_id = body.get("user_id")

    if user_id:
        res = sb.table("users").select("id, name, email").eq("id", user_id).limit(1).execute()
        if not res.data:
            return jsonify({"error": "user_not_found", "message": "User not found"}), 404
        uid = str(res.data[0]["id"])
    elif email:
        res = sb.table("users").select("id, name, email, password_hash").eq("email", email).limit(1).execute()
        if not res.data:
            return jsonify({"error": "invalid_credentials", "message": "Invalid email or password"}), 401
        row = res.data[0]
        if row.get("password_hash") and password is not None:
            if not check_password_hash(row["password_hash"], password):
                return jsonify({"error": "invalid_credentials", "message": "Invalid email or password"}), 401
        elif not row.get("password_hash") and password:
            return jsonify({"error": "invalid_credentials", "message": "Account has no password set"}), 401
        uid = str(row["id"])
    else:
        return jsonify({"error": "missing_identifier", "message": "email or user_id required"}), 400

    session["user_id"] = uid
    session.permanent = True

    return jsonify({"user_id": uid})


@auth_bp.post("/auth/logout")
def logout():
    """Clear session."""
    session.pop("user_id", None)
    return jsonify({"ok": True})


@auth_bp.get("/auth/me")
def me():
    """Get current user from session or X-User-Id header."""
    user_id = _current_user_id()
    if not user_id:
        return jsonify({"error": "unauthorized", "message": "Not logged in"}), 401

    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not res.data:
        session.pop("user_id", None)
        return jsonify({"error": "user_not_found"}), 404

    u = res.data[0]
    return jsonify({"user_id": str(u["id"]), "name": u.get("name"), "email": u.get("email")})


def _current_user_id():
    """Get user_id from session or X-User-Id header."""
    uid = session.get("user_id")
    if uid:
        return uid
    return request.headers.get("X-User-Id")


def require_user(f):
    """Decorator: require valid user_id; set g.user_id."""
    from functools import wraps

    @wraps(f)
    def wrapped(*args, **kwargs):
        uid = _current_user_id()
        if not uid:
            return jsonify({"error": "unauthorized", "message": "X-User-Id header or login required"}), 401
        g.user_id = uid
        return f(*args, **kwargs)

    return wrapped
