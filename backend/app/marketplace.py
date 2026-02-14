from flask import Blueprint, request, jsonify, current_app

from .marketplace_utils import quote_marketplace

mktplace = Blueprint("marketplace", __name__)

@mktplace.post("/marketplace")
def marketplace_quote():
    sb = current_app.extensions.get("supabase")
    ttl = current_app.config.get("CACHE_TTL_SECONDS", 1800)

    payload = request.get_json(force=True) or {}
    result = quote_marketplace(payload, sb, ttl_seconds=ttl)

    if "error" in result:
        return jsonify(result), 400

    return jsonify(result), 200

@mktplace.get("/marketplace")
def marketplace_get():
    # agent-friendly adapter
    sb = current_app.extensions.get("supabase")
    ttl = current_app.config.get("CACHE_TTL_SECONDS", 1800)

    zip_code = (request.args.get("zip") or request.args.get("zip_code") or "").strip()
    store = (request.args.get("store") or "walmart").strip().lower()

    # support repeated params: ?ingredients=a&ingredients=b
    ings = request.args.getlist("ingredients")
    if len(ings) == 1 and "," in ings[0]:
        # also support comma-separated: ?ingredients=a,b,c
        ings = [x.strip() for x in ings[0].split(",") if x.strip()]

    payload = {
        "zip": zip_code,
        "ingredients": [{"name": x} for x in ings],
        "store": store,
    }

    result = quote_marketplace(payload, sb, ttl_seconds=ttl)
    return jsonify(result), (400 if "error" in result else 200)

@mktplace.get("/marketplace/test")
def marketplace_debug():
    zip_code = request.args.get("zip", "94107")
    ingredients = request.args.get("ingredients", "bananas,rice,olive oil,yellow onion,canned chickpeas")
    ingredients_list = [x.strip() for x in ingredients.split(",") if x.strip()]

    payload = {"zip": zip_code, "ingredients": ingredients_list}
    sb = current_app.extensions.get("supabase")
    ttl = current_app.config.get("CACHE_TTL_SECONDS", 1800)

    result = quote_marketplace(payload, sb, ttl_seconds=ttl)
    status = 400 if "error" in result else 200
    return result, status