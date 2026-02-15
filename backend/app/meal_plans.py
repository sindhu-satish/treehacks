"""
Phase 3: Meal plans.
GET/POST/PUT meal plans, swap-meal, regenerate-meal, grocery-list.
"""
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

meal_plans_bp = Blueprint("meal_plans", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


def _serialize_plan(plan_row, days_rows, grocery_list):
    return {
        "id": str(plan_row["id"]),
        "startDate": plan_row["start_date"],
        "endDate": plan_row["end_date"],
        "days": [_serialize_day(d) for d in days_rows],
        "totalCost": float(plan_row.get("total_cost") or 0),
        "groceryList": grocery_list,
    }


def _serialize_day(d):
    return {
        "date": d["day_date"],
        "meals": d.get("meals") or {},
        "dailyNutrition": (d.get("meals") or {}).get("dailyNutrition") or {},
    }


@meal_plans_bp.get("/meal-plans")
@require_user
def list_plans():
    """List user's meal plans."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_plans").select("*").eq("user_id", g.user_id).order("start_date", desc=True).execute()
    out = []
    for p in (res.data or []):
        days_res = sb.table("meal_plan_days").select("*").eq("plan_id", p["id"]).order("day_date").execute()
        days = days_res.data or []
        grocery = _derive_grocery(days)
        out.append(_serialize_plan(p, days, grocery))

    return jsonify(out)


def _derive_grocery(days_rows):
    """Derive grocery list from days' meals."""
    items = []
    seen = set()
    for d in days_rows:
        meals = d.get("meals") or {}
        for meal_key in ("breakfast", "lunch", "dinner", "snacks"):
            val = meals.get(meal_key)
            if isinstance(val, dict) and val.get("recipe"):
                ing = val["recipe"].get("ingredients") if isinstance(val["recipe"], dict) else []
                if isinstance(ing, list):
                    for i in ing:
                        name = i.get("name") if isinstance(i, dict) else str(i)
                        if name and name not in seen:
                            seen.add(name)
                            items.append({"ingredient": {"name": name, "amount": 1, "unit": ""}, "recipes": [], "estimatedCost": None})
            elif isinstance(val, list):
                for v in val:
                    if isinstance(v, dict) and v.get("recipe"):
                        ing = v["recipe"].get("ingredients") if isinstance(v["recipe"], dict) else []
                        if isinstance(ing, list):
                            for i in ing:
                                name = i.get("name") if isinstance(i, dict) else str(i)
                                if name and name not in seen:
                                    seen.add(name)
                                    items.append({"ingredient": {"name": name, "amount": 1, "unit": ""}, "recipes": [], "estimatedCost": None})
    return items


@meal_plans_bp.post("/meal-plans")
@require_user
def create_plan():
    """Create meal plan."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    body = request.get_json(force=True) or {}
    start_date = body.get("startDate")
    end_date = body.get("endDate")
    days = body.get("days", [])
    total_cost = body.get("totalCost", 0)
    grocery_list = body.get("groceryList", [])

    if not start_date or not end_date:
        return jsonify({"error": "missing_dates", "message": "startDate and endDate required"}), 400

    plan_res = sb.table("meal_plans").insert({
        "user_id": g.user_id,
        "start_date": start_date,
        "end_date": end_date,
        "total_cost": total_cost,
    }).execute()

    if not plan_res.data:
        return jsonify({"error": "insert_failed"}), 500

    plan = plan_res.data[0]
    plan_id = plan["id"]

    for day in days:
        day_date = day.get("date") if isinstance(day, dict) else None
        if not day_date:
            continue
        meals = day.get("meals", {}) if isinstance(day, dict) else {}
        sb.table("meal_plan_days").insert({
            "plan_id": plan_id,
            "day_date": day_date,
            "meals": meals,
        }).execute()

    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    return jsonify(_serialize_plan(plan, days_res.data or [], grocery_list)), 201


@meal_plans_bp.put("/meal-plans/<plan_id>")
@require_user
def update_plan(plan_id):
    """Full update of meal plan."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_plans").select("*").eq("id", plan_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    body = request.get_json(force=True) or {}
    start_date = body.get("startDate")
    end_date = body.get("endDate")
    total_cost = body.get("totalCost")
    days = body.get("days", [])

    updates = {}
    if start_date is not None:
        updates["start_date"] = start_date
    if end_date is not None:
        updates["end_date"] = end_date
    if total_cost is not None:
        updates["total_cost"] = total_cost

    if updates:
        sb.table("meal_plans").update(updates).eq("id", plan_id).execute()

    if days:
        sb.table("meal_plan_days").delete().eq("plan_id", plan_id).execute()
        for day in days:
            day_date = day.get("date") if isinstance(day, dict) else None
            if day_date:
                meals = day.get("meals", {}) if isinstance(day, dict) else {}
                sb.table("meal_plan_days").insert({"plan_id": plan_id, "day_date": day_date, "meals": meals}).execute()

    plan_res = sb.table("meal_plans").select("*").eq("id", plan_id).limit(1).execute()
    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    grocery = _derive_grocery(days_res.data or [])
    return jsonify(_serialize_plan(plan_res.data[0], days_res.data or [], grocery))


@meal_plans_bp.post("/meal-plans/<plan_id>/swap-meal")
@require_user
def swap_meal(plan_id):
    """Swap meal in plan: body: dayIndex or date, mealType, newRecipe."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_plans").select("*").eq("id", plan_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    body = request.get_json(force=True) or {}
    day_index = body.get("dayIndex")
    day_date = body.get("date")
    meal_type = body.get("mealType")
    new_recipe = body.get("newRecipe")

    if not meal_type or not new_recipe:
        return jsonify({"error": "missing_fields", "message": "mealType and newRecipe required"}), 400

    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    days = days_res.data or []
    if not days:
        return jsonify({"error": "no_days"}), 404

    if day_date:
        target = next((d for d in days if str(d["day_date"]) == str(day_date)), None)
    elif day_index is not None and 0 <= day_index < len(days):
        target = days[day_index]
    else:
        return jsonify({"error": "invalid_day"}), 400

    if not target:
        return jsonify({"error": "day_not_found"}), 404

    meals = dict(target.get("meals") or {})
    meals[meal_type] = {"recipe": new_recipe, "servings": new_recipe.get("servings", 1) if isinstance(new_recipe, dict) else 1}

    sb.table("meal_plan_days").update({"meals": meals}).eq("id", target["id"]).execute()

    plan_res = sb.table("meal_plans").select("*").eq("id", plan_id).limit(1).execute()
    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    return jsonify(_serialize_plan(plan_res.data[0], days_res.data or [], _derive_grocery(days_res.data or [])))


@meal_plans_bp.post("/meal-plans/<plan_id>/regenerate-meal")
@require_user
def regenerate_meal(plan_id):
    """Regenerate meal slot - stub: returns current plan with placeholder or calls recipe service."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_plans").select("*").eq("id", plan_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    body = request.get_json(force=True) or {}
    day_index = body.get("dayIndex")
    day_date = body.get("date")
    meal_type = body.get("mealType")

    if not meal_type:
        return jsonify({"error": "missing_meal_type"}), 400

    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    days = days_res.data or []
    if not days:
        return jsonify({"error": "no_days"}), 404

    if day_date:
        target = next((d for d in days if str(d["day_date"]) == str(day_date)), None)
    elif day_index is not None and 0 <= day_index < len(days):
        target = days[day_index]
    else:
        target = days[0]

    stub_recipe = {"id": "stub", "name": "Suggested meal (stub)", "servings": 1}
    meals = dict(target.get("meals") or {})
    meals[meal_type] = {"recipe": stub_recipe, "servings": 1}

    sb.table("meal_plan_days").update({"meals": meals}).eq("id", target["id"]).execute()

    plan_res = sb.table("meal_plans").select("*").eq("id", plan_id).limit(1).execute()
    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    return jsonify(_serialize_plan(plan_res.data[0], days_res.data or [], _derive_grocery(days_res.data or [])))


@meal_plans_bp.get("/meal-plans/<plan_id>/grocery-list")
@require_user
def get_grocery_list(plan_id):
    """Get grocery list for plan."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("meal_plans").select("*").eq("id", plan_id).eq("user_id", g.user_id).limit(1).execute()
    if not res.data:
        return jsonify({"error": "not_found"}), 404

    days_res = sb.table("meal_plan_days").select("*").eq("plan_id", plan_id).order("day_date").execute()
    grocery = _derive_grocery(days_res.data or [])
    return jsonify(grocery)
