"""
Phase 4: Marketplace utilities.
scrape_one_item calls the scraper service (SCRAPER_SERVICE_URL). No caching - every call hits Bright Data.
"""
import os
import re
from typing import Any, Dict, List, Optional

DEFAULT_STORE = "walmart"
DEFAULT_STORE_NAME = "Walmart"

_UNITS = r"(tbsp|tsp|cup|cups|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|clove|cloves|can|cans|pinch|dash)"
_LEADING_QTY_RE = re.compile(rf"^\s*(\d+(\.\d+)?|\.\d+)\s*({_UNITS})?\s+", re.IGNORECASE)


def normalize_ingredient_to_query(ing: Any) -> tuple:
    if isinstance(ing, str):
        name = ing
    elif isinstance(ing, dict):
        name = ing.get("name") or ing.get("ingredient") or ""
    else:
        name = str(ing)
    ingredient_display = name.strip()
    q = ingredient_display.lower().strip()
    q = _LEADING_QTY_RE.sub("", q)
    q = re.sub(r"\s+", " ", q).strip()
    return ingredient_display, q


def scrape_one_item(
    store: str, zip_code: str, query: str, sb, ttl_seconds: int = 1800,
    scraper_url: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    scraper_url = (scraper_url or os.getenv("SCRAPER_SERVICE_URL") or "").strip() or None
    if not scraper_url:
        return None

    try:
        import urllib.request
        import json

        req = urllib.request.Request(
            f"{scraper_url.rstrip('/')}/api/scrape-ingredient",
            data=json.dumps({"store": store, "zip": zip_code, "query": query}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, dict) and data.get("name"):
                return data
            return None
    except Exception:
        return None


def quote_marketplace(
    payload: Dict[str, Any], sb, ttl_seconds: int = 1800,
    scraper_url: Optional[str] = None,
) -> Dict[str, Any]:
    zip_code = (payload.get("zip") or "").strip()
    ingredients = payload.get("ingredients") or []
    store = (payload.get("store") or DEFAULT_STORE).strip().lower()

    if not zip_code:
        return {"error": "zip_required", "message": "zip is required"}

    if not isinstance(ingredients, list) or len(ingredients) == 0:
        return {"error": "ingredients_required", "message": "ingredients must be a non-empty list"}

    store_obj = {"id": store, "name": DEFAULT_STORE_NAME if store == "walmart" else store, "distance_miles": None, "address": None}

    items_out: List[Dict[str, Any]] = []

    for ing in ingredients:
        try:
            ingredient_display, query = normalize_ingredient_to_query(ing)
            if not query:
                items_out.append({"ingredient": ingredient_display, "query": query, "matched_item": None, "confidence": 0.0, "error": "empty_query"})
                continue

            try:
                matched = scrape_one_item(
                    store, zip_code, query, sb, ttl_seconds,
                    scraper_url=scraper_url,
                )
            except Exception:
                matched = None

            normalized = {
                "ingredient": ingredient_display,
                "query": query,
                "matched_item": matched,
                "confidence": 0.75 if matched else 0.0,
            }
            if not matched:
                normalized["error"] = "no_match_found"

            items_out.append(normalized)

        except Exception as e:
            items_out.append({"ingredient": str(ing), "query": None, "matched_item": None, "confidence": 0.0, "error": "exception", "detail": str(e)})

    return {
        "store": store_obj,
        "items": items_out,
        "meta": {"zip": zip_code, "store": store},
    }


def stores_from_config(stores_csv: str) -> List[Dict[str, Any]]:
    """Parse MARKETPLACE_STORES (comma-separated) into store dicts for Bright Data scraping."""
    if not stores_csv or not stores_csv.strip():
        return []
    names = {
        "walmart": "Walmart",
        "safeway": "Safeway",
        "target": "Target",
        "traderjoes": "Trader Joe's",
        "tj": "Trader Joe's",
        "costco": "Costco",
        "kroger": "Kroger",
        "wholefoods": "Whole Foods",
        "albertsons": "Albertsons",
    }
    out = []
    for s in stores_csv.split(","):
        sid = s.strip().lower()
        if not sid:
            continue
        out.append({
            "id": sid,
            "name": names.get(sid, sid.replace("_", " ").title()),
            "address": None,
            "distance_miles": None,
        })
    return out
