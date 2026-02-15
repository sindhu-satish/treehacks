"""
Phase 7: Meal logging.
POST /api/meal-logs, PATCH /api/meal-logs/<id> (feedback).
GET /api/user/meal-logs is in user_profile.
"""
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

meal_logs_bp = Blueprint("meal_logs", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


def _serialize_log(r):
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


@meal_logs_bp.post("/meal-logs")
@require_user
def create_meal_log():
    """Create meal log entry."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    body = request.get_json(force=True) or {}
    date = body.get("date")
    meal_type = body.get("mealType")
    description = body.get("description", "")
    photo_url = body.get("photoUrl")
    is_from_meal_plan = body.get("isFromMealPlan", False)
    recipe_id = body.get("recipeId")
    recipe_name = body.get("recipeName")
    nutrition = body.get("nutrition") or {}

    if not date or not meal_type:
        return jsonify({"error": "missing_fields", "message": "date and mealType required"}), 400

    res = sb.table("meal_logs").insert({
        "user_id": g.user_id,
        "log_date": date,
        "meal_type": meal_type,
        "description": description,
        "photo_url": photo_url,
        "is_from_meal_plan": is_from_meal_plan,
        "recipe_id": recipe_id,
        "recipe_name": recipe_name,
        "nutrition": nutrition,
    }).execute()

    if not res.data:
        return jsonify({"error": "insert_failed"}), 500

    return jsonify(_serialize_log(res.data[0])), 201


@meal_logs_bp.patch("/meal-logs/<log_id>")
@require_user
def update_meal_log(log_id):
    """Update meal log (e.g. add feedback)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_logs").select("*").eq("id", log_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    body = request.get_json(force=True) or {}
    updates = {}

    if "description" in body:
        updates["description"] = body["description"]
    if "photoUrl" in body:
        updates["photo_url"] = body["photoUrl"]
    if "nutrition" in body:
        updates["nutrition"] = body["nutrition"]
    if "feedback" in body:
        updates["feedback"] = body["feedback"]

    if not updates:
        return jsonify(_serialize_log(res.data[0]))

    sb.table("meal_logs").update(updates).eq("id", log_id).eq("user_id", g.user_id).execute()
    updated = sb.table("meal_logs").select("*").eq("id", log_id).limit(1).execute()
    return jsonify(_serialize_log(updated.data[0]))


@meal_logs_bp.post("/meal-logs/<log_id>/feedback")
@require_user
def add_feedback(log_id):
    """Add or update feedback (rating, notes, wouldMakeAgain) on meal log."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_logs").select("*").eq("id", log_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    body = request.get_json(force=True) or {}
    feedback = dict(res.data[0].get("feedback") or {})
    if "rating" in body:
        feedback["rating"] = body["rating"]
    if "notes" in body:
        feedback["notes"] = body["notes"]
    if "wouldMakeAgain" in body:
        feedback["wouldMakeAgain"] = body["wouldMakeAgain"]

    sb.table("meal_logs").update({"feedback": feedback}).eq("id", log_id).eq("user_id", g.user_id).execute()
    updated = sb.table("meal_logs").select("*").eq("id", log_id).limit(1).execute()
    return jsonify(_serialize_log(updated.data[0]))
