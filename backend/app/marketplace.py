"""
Phase 4: Marketplace and stores.
GET /api/stores, POST /api/marketplace, POST /api/marketplace/compare-prices.
"""
import os
import time
from flask import Blueprint, request, jsonify, current_app

from .marketplace_utils import quote_marketplace, stores_from_config, unlocker_get, compare_prices_via_request_api
from .parsing_utils import extract_top_instore_items

marketplace_bp = Blueprint("marketplace", __name__)

def _get_supabase():
    return current_app.extensions.get("supabase")


def _get_stores():
    """Stores from config, filtered to Walmart and Target only."""
    config = current_app.config.get("MARKETPLACE_STORES", "walmart,target")
    all_stores = stores_from_config(config)
    filtered = [s for s in all_stores if s["id"] in ("walmart", "target")]
    return filtered if filtered else stores_from_config("walmart,target")


@marketplace_bp.get("/stores")
def get_stores():
    """Return stores from MARKETPLACE_STORES env (comma-separated). Used for Bright Data scraping."""
    return jsonify(_get_stores())


@marketplace_bp.post("/marketplace")
def marketplace_quote():
    """Quote ingredient prices (agent proxy shape: zip + ingredients)."""
    sb = _get_supabase()
    ttl = current_app.config.get("CACHE_TTL_SECONDS", 1800)
    scraper_url = current_app.config.get("SCRAPER_SERVICE_URL")

    payload = request.get_json(force=True) or {}
    result = quote_marketplace(payload, sb, ttl_seconds=ttl, scraper_url=scraper_url)

    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 200


@marketplace_bp.post("/marketplace/compare-prices")
def compare_prices():
    """Compare ingredient prices across stores for UI GroceryComparison.
    Uses Bright Data Request API + Walmart HTML extraction when BRIGHTDATA_API_KEY is set:
    fetches HTML per ingredient, extracts top 2 items — first=Walmart, second=Target.
    """
    import json as _json
    payload = request.get_json(force=True) or {}
    zip_code = (payload.get("zip") or "").strip()
    ingredients = payload.get("ingredients") or []

    if not zip_code:
        return jsonify({"error": "zip_required", "message": "zip is required"}), 400
    if not isinstance(ingredients, list) or len(ingredients) == 0:
        return jsonify({"error": "ingredients_required", "message": "ingredients must be a non-empty list"}), 400

    print(f"[compare-prices] START zip={zip_code} ingredients={len(ingredients)}: {ingredients[:5]}{'...' if len(ingredients) > 5 else ''}")

    # Prefer Bright Data Request API pipeline (download HTML + extract first 2 items)
    if (os.environ.get("BRIGHTDATA_API_KEY") or "").strip():
        grocery_comparison = compare_prices_via_request_api(ingredients, zip_code)
        print(f"[compare-prices] DONE pipeline=request_api results={len(grocery_comparison)}")
        print(_json.dumps({"zip": zip_code, "grocery_comparison": grocery_comparison}, indent=2, default=str))
        return jsonify(grocery_comparison)

    # Fallback to quote_marketplace (unlocker/scraper)
    sb = _get_supabase()
    ttl = current_app.config.get("CACHE_TTL_SECONDS", 1800)
    scraper_url = current_app.config.get("SCRAPER_SERVICE_URL")
    stores = _get_stores()
    if not stores:
        return jsonify({"error": "no_stores", "message": "MARKETPLACE_STORES not configured"}), 400

    store_results = []
    for store in stores:
        payload_one = {"zip": zip_code, "ingredients": ingredients, "store": store["id"]}
        result = quote_marketplace(payload_one, sb, ttl_seconds=ttl, scraper_url=scraper_url)
        if "error" in result:
            continue
        store_results.append({"store": store, "items": result.get("items") or []})

    ingredient_names = []
    for it in (store_results[0]["items"] if store_results else []):
        ing = it.get("ingredient", "")
        if ing and ing not in ingredient_names:
            ingredient_names.append(ing)
    if not ingredient_names:
        ingredient_names = [str(i) if isinstance(i, str) else (i.get("name") or str(i)) for i in ingredients]

    grocery_comparison = []
    for ing in ingredient_names:
        stores_list = []
        min_price = None
        for entry in store_results:
            s = entry["store"]
            matched = None
            for it in entry.get("items", []):
                if it.get("ingredient") == ing:
                    matched = it.get("matched_item")
                    break
            price = float(matched["price"]) if matched and matched.get("price") is not None else None
            avail = matched.get("availability", "in_stock") if matched else "out_of_stock"
            in_stock = avail == "in_stock" if isinstance(avail, str) else bool(avail)
            stores_list.append({"store": s, "price": price, "inStock": in_stock})
            if price is not None and (min_price is None or price < min_price):
                min_price = price

        for s in stores_list:
            s["isCheapest"] = min_price is not None and s.get("price") is not None and s["price"] == min_price

        grocery_comparison.append({"ingredient": ing, "stores": stores_list})

    print(f"[compare-prices] DONE pipeline=quote_marketplace results={len(grocery_comparison)}")
    return jsonify(grocery_comparison)

@marketplace_bp.get("/unlocker/test")
def unlocker_test():
    """
    Quick in-browser test:
      /api/unlocker/test?url=https%3A%2F%2Fwww.walmart.com%2Fsearch%3Fq%3Dbananas

    Optional:
      &timeout=25
      &truncate=800
    """
    url = (request.args.get("url") or "").strip()
    if not url:
        return jsonify({"error": "url_required"}), 400

    timeout = float(request.args.get("timeout", "25"))
    truncate = int(request.args.get("truncate", "1200"))

    t0 = time.time()
    html = unlocker_get(url, timeout=(5.0, timeout))
    ms = int((time.time() - t0) * 1000)

    retailer = "walmart" if "walmart" in url.lower() else "target"
    try:
        items = extract_top_instore_items(html, retailer=retailer, top_n=5)
    except Exception:
        items = []

    return jsonify({
        "ok": True,
        "url": url,
        "items": items,
    }), 200