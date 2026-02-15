"""
Phase 4: Marketplace utilities.
Bright Data: when BRIGHTDATA_API_KEY is set, uses requests (trigger + poll + download).
Otherwise scrape_one_item calls the scraper service (SCRAPER_SERVICE_URL).
"""
import os
import re
import time
from typing import Any, Dict, List, Optional

import requests

DEFAULT_STORE = "walmart"
DEFAULT_STORE_NAME = "Walmart"

WALMART_DATASET_ID = "gd_l95fol7l1ru6rlo116"
TARGET_DATASET_ID = "gd_ltppk5mx2lp0v1k0vo"
TRIGGER_URL = "https://api.brightdata.com/datasets/v3/trigger"
POLL_INTERVAL = 5
POLL_TIMEOUT = 90

_UNITS = r"(tbsp|tsp|cup|cups|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|clove|cloves|can|cans|pinch|dash)"
_LEADING_QTY_RE = re.compile(rf"^\s*(\d+(\.\d+)?|\.\d+)\s*({_UNITS})?\s+", re.IGNORECASE)


def _extract_price(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not (isinstance(value, bool)):
        return float(value)
    if isinstance(value, str):
        s = value.replace("$", "").replace(",", "").strip()
        match = re.search(r"[\d.]+", s)
        if match:
            try:
                return float(match.group())
            except ValueError:
                pass
    return None


def _get_single_record(snapshot: Any) -> Optional[Dict[str, Any]]:
    if isinstance(snapshot, list) and snapshot:
        return snapshot[0] if isinstance(snapshot[0], dict) else None
    if isinstance(snapshot, dict):
        for key in ("results", "data", "records"):
            arr = snapshot.get(key)
            if isinstance(arr, list) and arr and isinstance(arr[0], dict):
                return arr[0]
        return snapshot
    return None


def _parse_record(record: Dict[str, Any]) -> Dict[str, Any]:
    name = record.get("title") or record.get("name") or record.get("product_name") or ""
    price = _extract_price(
        record.get("final_price") or record.get("price") or record.get("current_price")
    )
    url = record.get("url") or record.get("link") or record.get("product_url") or ""
    image = record.get("main_image") or record.get("image") or record.get("image_url")
    return {
        "name": name or None,
        "price": price,
        "currency": "USD",
        "availability": "in_stock" if price is not None else "unknown",
        "url": url or None,
        "image": image,
    }


def brightdata_scrape_one_item(store: str, zip_code: str, query: str) -> Optional[Dict[str, Any]]:
    """Use Bright Data API with requests (trigger + poll + download). Walmart and Target only."""
    api_key = (os.getenv("BRIGHTDATA_API_KEY") or "").strip()
    if not api_key:
        return None
    store = (store or "walmart").strip().lower()
    if store == "target":
        params = {
            "dataset_id": TARGET_DATASET_ID,
            "include_errors": "true",
            "type": "discover_new",
            "discover_by": "keywords",
            "limit_per_input": 1,
        }
        data = [{"keywords": query, "zipcode": zip_code or ""}]
    else:
        params = {
            "dataset_id": WALMART_DATASET_ID,
            "include_errors": "true",
            "type": "discover_new",
            "discover_by": "keyword",
            "limit_per_input": 1,
        }
        data = [{"keyword": query, "domain": "https://www.walmart.com/", "all_variations": False}]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(TRIGGER_URL, headers=headers, params=params, json=data, timeout=30)
        resp.raise_for_status()
        out = resp.json()
        snapshot_id = out.get("snapshot_id")
        if not snapshot_id:
            return None

        progress_url = f"https://api.brightdata.com/datasets/v3/progress/{snapshot_id}"
        started = time.monotonic()
        while time.monotonic() - started < POLL_TIMEOUT:
            pr = requests.get(progress_url, headers=headers, timeout=10)
            pr.raise_for_status()
            body = pr.json()
            status = body.get("status", "")
            if status == "ready":
                break
            if status == "failed":
                return None
            time.sleep(POLL_INTERVAL)

        download_url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}"
        dl = requests.get(download_url, headers=headers, params={"format": "json"}, timeout=30)
        if dl.status_code == 409:
            return None
        dl.raise_for_status()
        snapshot = dl.json()
        record = _get_single_record(snapshot)
        if not record:
            return None
        return _parse_record(record)
    except Exception:
        return None


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
    store_normalized = (store or "walmart").strip().lower()
    # Prefer direct Bright Data with requests when API key is set (Walmart/Target only)
    if os.getenv("BRIGHTDATA_API_KEY") and store_normalized in ("walmart", "target"):
        return brightdata_scrape_one_item(store, zip_code, query)

    scraper_url = (scraper_url or os.getenv("SCRAPER_SERVICE_URL") or "").strip() or None
    if not scraper_url:
        return None

    try:
        import json
        import urllib.request

        req = urllib.request.Request(
            f"{scraper_url.rstrip('/')}/api/scrape-ingredient",
            data=json.dumps({"store": store, "zip": zip_code, "query": query}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
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
