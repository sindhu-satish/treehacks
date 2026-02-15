"""
Phase 5: Shopping cart.
GET/POST cart, add, update, delete.
"""
from collections import defaultdict
from flask import Blueprint, request, jsonify, g, current_app

from .auth import require_user

cart_bp = Blueprint("cart", __name__)


def _get_supabase():
    return current_app.extensions.get("supabase")


def _serialize_cart_item(r):
    return {
        "id": str(r["id"]),
        "ingredient": r["ingredient"],
        "storeId": r["store_id"],
        "storeName": r["store_name"],
        "price": float(r["price"]),
        "quantity": int(r["quantity"]),
        "unit": r.get("unit") or "",
        "recipeId": r.get("recipe_id"),
        "recipeName": r.get("recipe_name"),
    }


def _build_cart_response(items):
    items_list = [_serialize_cart_item(r) for r in items]
    total = sum(float(r["price"]) * int(r["quantity"]) for r in items)

    by_store = defaultdict(list)
    for r in items:
        by_store[(r["store_id"], r["store_name"])].append(_serialize_cart_item(r))

    store_breakdown = [
        {"storeId": sid, "storeName": sname, "items": its, "subtotal": sum(i["price"] * i["quantity"] for i in its)}
        for (sid, sname), its in by_store.items()
    ]

    return {"items": items_list, "totalCost": round(total, 2), "storeBreakdown": store_breakdown}


@cart_bp.get("/cart")
@require_user
def get_cart():
    """Get current user cart."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    res = sb.table("cart_items").select("*").eq("user_id", g.user_id).order("created_at").execute()
    return jsonify(_build_cart_response(res.data or []))


@cart_bp.post("/cart/add")
@require_user
def add_to_cart():
    """Add item to cart or merge quantity if exists."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    body = request.get_json(force=True) or {}
    ingredient = body.get("ingredient") or ""
    store_id = body.get("storeId") or ""
    store_name = body.get("storeName") or ""
    price = body.get("price", 0)
    quantity = body.get("quantity", 1)
    unit = body.get("unit") or ""
    recipe_id = body.get("recipeId")
    recipe_name = body.get("recipeName")

    if not ingredient or not store_id:
        return jsonify({"error": "missing_fields", "message": "ingredient and storeId required"}), 400

    existing = sb.table("cart_items").select("*").eq("user_id", g.user_id).eq("ingredient", ingredient).eq("store_id", store_id).limit(1).execute()

    if existing.data:
        row = existing.data[0]
        new_qty = int(row["quantity"]) + int(quantity)
        sb.table("cart_items").update({"quantity": new_qty}).eq("id", row["id"]).execute()
    else:
        sb.table("cart_items").insert({
            "user_id": g.user_id,
            "ingredient": ingredient,
            "store_id": store_id,
            "store_name": store_name,
            "price": price,
            "quantity": quantity,
            "unit": unit,
            "recipe_id": recipe_id,
            "recipe_name": recipe_name,
        }).execute()

    res = sb.table("cart_items").select("*").eq("user_id", g.user_id).order("created_at").execute()
    return jsonify(_build_cart_response(res.data or []))


@cart_bp.post("/cart/update")
@require_user
def update_cart():
    """Update quantity; remove if quantity <= 0."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    body = request.get_json(force=True) or {}
    item_id = body.get("itemId")
    quantity = body.get("quantity", 0)

    if not item_id:
        return jsonify({"error": "missing_item_id"}), 400

    if quantity <= 0:
        sb.table("cart_items").delete().eq("id", item_id).eq("user_id", g.user_id).execute()
    else:
        sb.table("cart_items").update({"quantity": quantity}).eq("id", item_id).eq("user_id", g.user_id).execute()

    res = sb.table("cart_items").select("*").eq("user_id", g.user_id).order("created_at").execute()
    return jsonify(_build_cart_response(res.data or []))


@cart_bp.delete("/cart/<item_id>")
@require_user
def delete_cart_item(item_id):
    """Remove item from cart."""
    sb = _get_supabase()
    if not sb:
        return jsonify({"error": "database_unavailable"}), 503

    sb.table("cart_items").delete().eq("id", item_id).eq("user_id", g.user_id).execute()
    res = sb.table("cart_items").select("*").eq("user_id", g.user_id).order("created_at").execute()
    return jsonify(_build_cart_response(res.data or []))
