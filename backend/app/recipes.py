"""
Phase 6: Saved recipes and cooking journal.
POST /api/recipes/<id>/save, DELETE /api/recipes/<id>/save, POST /api/recipes/<id>/rate.
"""
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

recipes_bp = Blueprint("recipes", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


@recipes_bp.post("/recipes/<recipe_id>/save")
@require_user
def save_recipe(recipe_id):
    """Add recipe to user's saved list."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    try:
        sb.table("user_saved_recipes").insert({"user_id": g.user_id, "recipe_id": recipe_id}).execute()
    except Exception:
        pass

    return jsonify({"ok": True, "recipe_id": recipe_id})


@recipes_bp.delete("/recipes/<recipe_id>/save")
@require_user
def unsave_recipe(recipe_id):
    """Remove recipe from saved list."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    sb.table("user_saved_recipes").delete().eq("user_id", g.user_id).eq("recipe_id", recipe_id).execute()
    return jsonify({"ok": True})


@recipes_bp.post("/recipes/<recipe_id>/rate")
@require_user
def rate_recipe(recipe_id):
    """Log as made with rating, notes, etc. (cooking journal)."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    body = request.get_json(force=True) or {}
    rating = body.get("rating")
    notes = body.get("notes", "")
    photos = body.get("photos") or []
    modifications = body.get("modifications", "")
    would_make_again = body.get("wouldMakeAgain")
    recipe_name = body.get("recipeName", "")

    if rating is None or not (1 <= int(rating) <= 5):
        return jsonify({"error": "invalid_rating", "message": "rating 1-5 required"}), 400

    res = sb.table("recipe_journal").insert({
        "user_id": g.user_id,
        "recipe_id": recipe_id,
        "recipe_name": recipe_name,
        "rating": int(rating),
        "notes": notes,
        "photos": photos,
        "modifications": modifications,
        "would_make_again": would_make_again,
    }).execute()

    if not res.data:
        return jsonify({"error": "insert_failed"}), 500

    row = res.data[0]
    return jsonify({
        "id": str(row["id"]),
        "recipeId": recipe_id,
        "recipeName": recipe_name,
        "madeAt": row["made_at"],
        "rating": row["rating"],
        "notes": row.get("notes", ""),
        "photos": row.get("photos") or [],
        "modifications": row.get("modifications", ""),
        "wouldMakeAgain": row.get("would_make_again"),
    }), 201
