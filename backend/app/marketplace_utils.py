from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import hashlib
import re
import os

DEFAULT_STORE = "walmart"
DEFAULT_STORE_NAME = "Walmart"

_UNITS = r"(tbsp|tsp|cup|cups|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|clove|cloves|can|cans|pinch|dash)"
_LEADING_QTY_RE = re.compile(rf"^\s*(\d+(\.\d+)?|\.\d+)\s*({_UNITS})?\s+", re.IGNORECASE)

DEV_CATALOG = {
    "bananas": {"name": "Bananas, 1 lb", "price": 0.58, "currency": "USD", "availability": "in_stock",
                "url": "https://example.com/bananas", "image": None},
    "yellow onion": {"name": "Yellow Onion, 1 ct", "price": 0.79, "currency": "USD", "availability": "in_stock",
                     "url": "https://example.com/onion", "image": None},
    "rice": {"name": "Long Grain White Rice, 5 lb", "price": 4.98, "currency": "USD", "availability": "in_stock",
             "url": "https://example.com/rice", "image": None},
    "olive oil": {"name": "Extra Virgin Olive Oil, 16.9 fl oz", "price": 7.48, "currency": "USD", "availability": "in_stock",
                  "url": "https://example.com/olive-oil", "image": None},
    "canned chickpeas": {"name": "Chickpeas Garbanzo Beans, 15 oz", "price": 0.98, "currency": "USD", "availability": "in_stock",
                         "url": "https://example.com/chickpeas", "image": None},
}

def make_cache_key(store: str, zip_code: str, query: str) -> str:
    raw = f"{store}:{zip_code or ''}:{query.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def is_fresh(fetched_at_iso: str, ttl_seconds: int) -> bool:
    if not fetched_at_iso:
        return False
    dt = datetime.fromisoformat(fetched_at_iso.replace("Z", "+00:00"))
    age = (datetime.now(timezone.utc) - dt).total_seconds()
    return age <= ttl_seconds

def cache_age_seconds(fetched_at_iso: str) -> int:
    dt = datetime.fromisoformat(fetched_at_iso.replace("Z", "+00:00"))
    return int((datetime.now(timezone.utc) - dt).total_seconds())

def cache_get(sb, cache_key: str) -> Optional[Dict[str, Any]]:
    res = (
        sb.table("scrape_cache")
        .select("response,fetched_at")
        .eq("cache_key", cache_key)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None

def cache_set(sb, cache_key: str, store: str, zip_code: str, query: str, response: dict) -> None:
    sb.table("scrape_cache").upsert(
        {
            "cache_key": cache_key,
            "store": store,
            "zip": zip_code,
            "query": query,
            "response": response,
        }
    ).execute()

def normalize_ingredient_to_query(ing: Any) -> Tuple[str, str]:
    """
    Returns (ingredient_display, normalized_query)

    Accepts:
      - "olive oil"
      - {"name": "2 tbsp olive oil"}
    """
    if isinstance(ing, str):
        name = ing
    elif isinstance(ing, dict):
        name = ing.get("name") or ""
    else:
        name = str(ing)

    ingredient_display = name.strip()
    q = ingredient_display.lower().strip()
    q = _LEADING_QTY_RE.sub("", q)          # remove leading qty and units
    q = re.sub(r"\s+", " ", q).strip()      # collapse spaces
    return ingredient_display, q

def scrape_one_item(store: str, zip_code: str, query: str):
    if os.getenv("MARKETPLACE_PROVIDER", "dev") == "dev":

        if query in DEV_CATALOG:
            return DEV_CATALOG[query]
        for k, v in DEV_CATALOG.items():
            if k in query or query in k:
                return v
        return None

    # real data goes here
    return None

def quote_marketplace(payload: Dict[str, Any], sb, ttl_seconds: int = 1800) -> Dict[str, Any]:
    zip_code = (payload.get("zip") or "").strip()
    ingredients = payload.get("ingredients") or []
    store = (payload.get("store") or DEFAULT_STORE).strip().lower()

    if not zip_code:
        return {
            "error": "zip_required",
            "message": "zip is required",
        }

    if not isinstance(ingredients, list) or len(ingredients) == 0:
        return {
            "error": "ingredients_required",
            "message": "ingredients must be a non-empty list",
        }

    store_obj = {
        "id": store,
        "name": DEFAULT_STORE_NAME if store == "walmart" else store,
        "distance_miles": None,
        "address": None,
    }

    items_out: List[Dict[str, Any]] = []
    cached_count = 0

    for ing in ingredients:
        try:
            ingredient_display, query = normalize_ingredient_to_query(ing)

            if not query:
                items_out.append(
                    {
                        "ingredient": ingredient_display,
                        "query": query,
                        "matched_item": None,
                        "confidence": 0.0,
                        "error": "empty_query",
                    }
                )
                continue

            key = make_cache_key(store, zip_code, query)
            cached = cache_get(sb, key) if sb else None

            if cached and is_fresh(cached.get("fetched_at"), ttl_seconds):
                cached_count += 1
                resp = cached["response"]
                resp["_cache"] = {
                    "hit": True,
                    "age_seconds": cache_age_seconds(cached["fetched_at"]),
                }
                items_out.append(resp)
                continue

            matched = scrape_one_item(store, zip_code, query)

            normalized = {
                "ingredient": ingredient_display,
                "query": query,
                "matched_item": matched,
                "confidence": 0.75 if matched else 0.0,
            }
            if not matched:
                normalized["error"] = "no_match_found"

            normalized["_cache"] = {"hit": False, "age_seconds": 0}

            if sb:
                cache_set(sb, key, store, zip_code, query, normalized)

            items_out.append(normalized)
            
        except Exception as e:
            items_out.append({
                "ingredient": str(ing),
                "query": None,
                "matched_item": None,
                "confidence": 0.0,
                "error": "exception",
                "detail": str(e),
            })

    return {
        "store": store_obj,
        "items": items_out,
        "meta": {
            "zip": zip_code,
            "store": store,
            "cached": cached_count > 0,
            "cached_count": cached_count,
            "ttl_seconds": ttl_seconds,
        },
    }