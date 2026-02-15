"""
Phase 2: User profile and preferences.
GET/PUT /api/user/profile matching UserProfile and UserPreferences from UI types.
"""
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

user_bp = Blueprint("user", __name__)

DEFAULT_PREFERENCES = {
    "dietaryRestrictions": [],
    "allergies": [],
    "dislikedFoods": [],
    "budget": 80,
    "budgetPeriod": "weekly",
    "cookingSkill": "beginner",
    "availableTime": 30,
    "healthGoals": [],
    "householdSize": 1,
}


def _get_supabase():
    return current_app.extensions.get("supabase")


def _serialize_profile(row, saved_ids, made_entries):
    return {
        "id": str(row["user_id"]),
        "name": row.get("name") or "",
        "email": row.get("email"),
        "avatarUrl": row.get("avatar_url"),
        "preferences": row.get("preferences") or DEFAULT_PREFERENCES,
        "savedRecipes": saved_ids,
        "madeRecipes": made_entries,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
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
        return jsonify(
            _serialize_profile(
                {"user_id": uid, "name": None, "email": None, "avatar_url": None, "preferences": DEFAULT_PREFERENCES, "created_at": None, "updated_at": None},
                saved_ids,
                made,
            )
        )

    row = res.data[0]
    saved_res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", uid).execute()
    made_res = sb.table("recipe_journal").select("*").eq("user_id", uid).order("made_at", desc=True).execute()
    saved_ids = [r["recipe_id"] for r in (saved_res.data or [])]
    made = [_serialize_journal(r) for r in (made_res.data or [])]

    return jsonify(_serialize_profile(row, saved_ids, made))


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
    """Update user profile and full UserPreferences."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable", "message": "Supabase not configured"}), 503

    body = request.get_json(force=True) or {}
    uid = g.user_id

    prefs = body.get("preferences", {})
    profile = {
        "user_id": uid,
        "name": body.get("name"),
        "email": body.get("email"),
        "avatar_url": body.get("avatarUrl"),
        "preferences": {
            "dietaryRestrictions": prefs.get("dietaryRestrictions", []),
            "allergies": prefs.get("allergies", []),
            "dislikedFoods": prefs.get("dislikedFoods", []),
            "budget": prefs.get("budget", DEFAULT_PREFERENCES["budget"]),
            "budgetPeriod": prefs.get("budgetPeriod", DEFAULT_PREFERENCES["budgetPeriod"]),
            "cookingSkill": prefs.get("cookingSkill", DEFAULT_PREFERENCES["cookingSkill"]),
            "availableTime": prefs.get("availableTime", DEFAULT_PREFERENCES["availableTime"]),
            "healthGoals": prefs.get("healthGoals", []),
            "householdSize": prefs.get("householdSize", DEFAULT_PREFERENCES["householdSize"]),
        },
    }

    res = sb.table("user_profiles").upsert(profile, on_conflict="user_id").execute()
    if not res.data:
        return jsonify({"error": "update_failed"}), 500

    row = res.data[0]
    saved_res = sb.table("user_saved_recipes").select("recipe_id").eq("user_id", uid).execute()
    made_res = sb.table("recipe_journal").select("*").eq("user_id", uid).order("made_at", desc=True).execute()
    saved_ids = [r["recipe_id"] for r in (saved_res.data or [])]
    made = [_serialize_journal(r) for r in (made_res.data or [])]

    return jsonify(_serialize_profile(row, saved_ids, made))


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
