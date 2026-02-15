"""
Phase 2: User profile and preferences.
GET/PUT /api/user/profile. DB columns: user_id, created_at, updated_at, zip,
budget_weekly, diet, allergies, dislikes, max_prep_minutes, household_size, prefs.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

user_bp = Blueprint("user", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


def _row_to_response(row, saved_ids, made_entries):
    """Serialize DB row to API response. Reads from flat columns or preferences JSONB."""
    prefs = row.get("preferences") or {}
    return {
        "id": str(row["user_id"]),
        "zip": row.get("zip") or prefs.get("zip") or "",
        "budget_weekly": row.get("budget_weekly") if row.get("budget_weekly") is not None else prefs.get("budget_weekly", prefs.get("budget", 80)),
        "diet": row.get("diet") or (prefs.get("dietaryRestrictions") or [None])[0] or prefs.get("diet") or "",
        "allergies": row.get("allergies") if isinstance(row.get("allergies"), list) else (prefs.get("allergies") or []),
        "dislikes": row.get("dislikes") if isinstance(row.get("dislikes"), list) else (prefs.get("dislikedFoods") or []),
        "max_prep_minutes": row.get("max_prep_minutes") if row.get("max_prep_minutes") is not None else prefs.get("availableTime", prefs.get("max_prep_minutes", 30)),
        "household_size": row.get("household_size") if row.get("household_size") is not None else prefs.get("householdSize", prefs.get("household_size", 1)),
        "prefs": row.get("prefs") or {k: v for k, v in prefs.items() if k not in ("zip", "budget_weekly", "diet", "dietaryRestrictions", "allergies", "dislikedFoods", "budget", "budgetPeriod", "availableTime", "householdSize")},
        "savedRecipes": saved_ids,
        "madeRecipes": made_entries,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _default_profile_row(uid):
    return {
        "user_id": uid,
        "zip": "",
        "budget_weekly": 80,
        "diet": "",
        "allergies": [],
        "dislikes": [],
        "max_prep_minutes": 30,
        "household_size": 1,
        "prefs": {},
        "created_at": None,
        "updated_at": None,
    }


@user_bp.get("/user/profile")
@require_user
def get_profile():
    """Get user profile with preferences, saved recipe IDs, and made recipes (journal)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    uid = g.user_id

    res = sb.table("user_profiles").select("*").eq("user_id", uid).limit(1).execute()
    if not res.data:
        saved_res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", uid).execute()
        made_res = sb.table("recipe_journal").select("*").eq("user_id", uid).order("made_at", desc=True).execute()
        saved_ids = [r["recipe_id"] for r in (saved_res.data or [])]
        made = [_serialize_journal(r) for r in (made_res.data or [])]
        return jsonify(_row_to_response(_default_profile_row(uid), saved_ids, made))

    row = res.data[0]
    saved_res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", uid).execute()
    made_res = sb.table("recipe_journal").select("*").eq("user_id", uid).order("made_at", desc=True).execute()
    saved_ids = [r["recipe_id"] for r in (saved_res.data or [])]
    made = [_serialize_journal(r) for r in (made_res.data or [])]

    return jsonify(_row_to_response(row, saved_ids, made))


def _serialize_journal(r):
    return {
        "id": str(r["id"]),
        "recipeId": r["recipe_id"],
        "recipeName": r.get("recipe_name") or "",
        "madeAt": r["made_at"],
        "rating": r.get("rating") or 0,
        "photos": r.get("photos") or [],
        "notes": r.get("notes") or "",
        "modifications": r.get("modifications") or "",
        "wouldMakeAgain": r.get("would_make_again"),
    }


@user_bp.put("/user/profile")
@require_user
def put_profile():
    """Update user profile. Accepts: zip, budget_weekly, diet, allergies, dislikes, max_prep_minutes, household_size, prefs."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    uid = g.user_id

    zip_val = (body.get("zip") or "").strip() or None
    budget_weekly = body.get("budget_weekly") if body.get("budget_weekly") is not None else 80
    diet = (body.get("diet") or "").strip() or None
    allergies = body.get("allergies") if isinstance(body.get("allergies"), list) else []
    dislikes = body.get("dislikes") if isinstance(body.get("dislikes"), list) else []
    max_prep_minutes = body.get("max_prep_minutes") if body.get("max_prep_minutes") is not None else 30
    household_size = body.get("household_size") if body.get("household_size") is not None else 1
    prefs_extra = body.get("prefs") if isinstance(body.get("prefs"), dict) else {}

    # preferences JSONB (legacy format) – consumed by meal plans, Mahm agent, etc.
    preferences = {
        "zip": zip_val,
        "budget_weekly": budget_weekly,
        "dietaryRestrictions": [diet] if diet else [],
        "allergies": allergies,
        "dislikedFoods": dislikes,
        "budget": budget_weekly,
        "budgetPeriod": "weekly",
        "availableTime": max_prep_minutes,
        "householdSize": household_size,
        **prefs_extra,
    }

    profile = {
        "user_id": uid,
        "zip": zip_val,
        "budget_weekly": budget_weekly,
        "diet": diet,
        "allergies": allergies,
        "dislikes": dislikes,
        "max_prep_minutes": max_prep_minutes,
        "household_size": household_size,
        "prefs": prefs_extra,
        "preferences": preferences,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    res = sb.table("user_profiles").upsert(profile, on_conflict="user_id").execute()
    if not res.data:
        return jsonify({"error": "update_failed"}), 500

    row = res.data[0]
    saved_res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", uid).execute()
    made_res = sb.table("recipe_journal").select("*").eq("user_id", uid).order("made_at", desc=True).execute()
    saved_ids = [r["recipe_id"] for r in (saved_res.data or [])]
    made = [_serialize_journal(r) for r in (made_res.data or [])]

    return jsonify(_row_to_response(row, saved_ids, made))


@user_bp.get("/user/saved-recipes")
@require_user
def get_saved_recipes():
    """Get list of saved recipe IDs."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", g.user_id).execute()
    ids = [r["recipe_id"] for r in (res.data or [])]
    return jsonify(ids)


@user_bp.get("/user/made-recipes")
@require_user
def get_made_recipes():
    """Get cooking journal (RecipeJournalEntry[])."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("recipe_journal").select("*").eq("user_id", g.user_id).order("made_at", desc=True).execute()
    return jsonify([_serialize_journal(r) for r in (res.data or [])])


@user_bp.get("/user/meal-logs")
@require_user
def get_meal_logs():
    """Get user's meal logs (optional query: from, to, limit)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    from_date = request.args.get("from")
    to_date = request.args.get("to")
    limit = request.args.get("limit", type=int) or 100

    q = sb.table("meal_logs").select("*").eq("user_id", g.user_id).order("log_date", desc=True).limit(limit)
    if from_date:
        q = q.gte("log_date", from_date)
    if to_date:
        q = q.lte("log_date", to_date)

    res = q.execute()
    return jsonify([_serialize_meal_log(r) for r in (res.data or [])])


def _serialize_meal_log(r):
    return {
        "id": str(r["id"]),
        "date": r["log_date"],
        "mealType": r["meal_type"],
        "description": r.get("description") or "",
        "photoUrl": r.get("photo_url"),
        "isFromMealPlan": r.get("is_from_meal_plan") or False,
        "recipeId": r.get("recipe_id"),
        "recipeName": r.get("recipe_name"),
        "nutrition": r.get("nutrition") or {},
        "feedback": r.get("feedback") or {},
    }
