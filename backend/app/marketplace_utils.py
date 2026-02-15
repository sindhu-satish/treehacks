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

from .parsing_utils import extract_top_instore_items, walmart_extract_top_instore_items

import requests

REQUEST_API_URL = "https://api.brightdata.com/request"

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

def unlocker_get(url: str, timeout=(5.0, 25.0)) -> str:
    host = os.getenv("BRIGHTDATA_HOST", "brd.superproxy.io")
    port = os.getenv("BRIGHTDATA_PORT", "22225")

    customer = os.getenv("BRIGHTDATA_CUSTOMER")
    zone = os.getenv("BRIGHTDATA_ZONE")
    password = os.getenv("BRIGHTDATA_PASSWORD")

    if not customer or not zone or not password:
        raise RuntimeError("Missing BRIGHTDATA_CUSTOMER / BRIGHTDATA_ZONE")

    username = f"brd-customer-{customer}-zone-{zone}"
    proxy = f"http://{username}:{password}@{host}:{port}"

    proxies = {"http": proxy}
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9",
    }

    r = requests.get(url, headers=headers, proxies=proxies, timeout=timeout)
    r.raise_for_status()
    return r.text


# Safety limit if __NEXT_DATA__ not found
_MAX_HTML_BYTES = 1_500_000


def _find_complete_next_data_end(html: str) -> int:
    """Return index of char after </script> of __NEXT_DATA__, or -1 if incomplete."""
    m = re.search(r'<script[^>]*\bid="__NEXT_DATA__"[^>]*>', html, re.IGNORECASE)
    if not m:
        return -1
    start = m.end()
    depth = 0
    in_str = False
    esc = False
    i = start
    while i < len(html):
        c = html[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    rest = html[i + 1 :]
                    j = rest.find("</script>")
                    if j == -1:
                        return -1
                    return i + 1 + j + len("</script>")
        i += 1
    return -1


def _fetch_via_brightdata_request(url: str) -> Optional[str]:
    """Fetch URL via Bright Data Request API. Streams and stops once the complete
    __NEXT_DATA__ script (with product data) is received. Reduces download time."""
    api_key = (os.getenv("BRIGHTDATA_API_KEY") or "").strip()
    zone = (os.getenv("BRIGHTDATA_REQUEST_ZONE") or os.getenv("BRIGHTDATA_ZONE") or "mcp_unlocker").strip()
    cookie = (os.getenv("BRIGHTDATA_COOKIE") or "").strip()
    if not api_key:
        return None
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if cookie:
        headers["Cookie"] = cookie
    payload = {"zone": zone, "url": url, "format": "raw", "method": "GET", "country": "US"}
    try:
        resp = requests.post(
            f"{REQUEST_API_URL}?async=false",
            headers=headers,
            json=payload,
            timeout=60,
            stream=True,
        )
        resp.raise_for_status()
        chunks = []
        total = 0
        for chunk in resp.iter_content(chunk_size=16384, decode_unicode=False):
            if chunk:
                chunks.append(chunk)
                total += len(chunk)
                html = b"".join(chunks).decode("utf-8", errors="replace")
                end = _find_complete_next_data_end(html)
                if end >= 0:
                    resp.close()
                    return html[:end]
                if total >= _MAX_HTML_BYTES:
                    resp.close()
                    return html
        return b"".join(chunks).decode("utf-8", errors="replace")
    except requests.RequestException as e:
        import sys

        print(f"[brightdata] Request API error: {e}", file=sys.stderr)
        return None


def _item_to_store_price(store: Dict[str, Any], item: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert parsed item to grocery comparison store entry."""
    if not item:
        return {
            "store": store,
            "price": 0,
            "inStock": False,
            "productName": None,
            "image": None,
            "linePriceDisplay": None,
            "unitPrice": None,
        }
    price = None
    if item.get("price") is not None:
        try:
            price = float(item["price"])
        except (TypeError, ValueError):
            pass
    avail = (item.get("availability") or "").strip().upper()
    in_stock = avail == "IN_STOCK"
    return {
        "store": store,
        "price": price if price is not None else 0,
        "inStock": in_stock,
        "productName": item.get("name"),
        "image": item.get("image"),
        "linePriceDisplay": item.get("linePriceDisplay"),
        "unitPrice": item.get("unitPrice"),
    }


def compare_prices_via_request_api(ingredients: List[Any], zip_code: str) -> List[Dict[str, Any]]:
    """
    For each ingredient: fetch Walmart HTML via Bright Data Request API,
    extract top 2 items via walmart_extract_top_instore_items.
    First item = Walmart, second = Target (placeholder until Target parsing).
    """
    import urllib.parse

    stores = [
        {"id": "walmart", "name": "Walmart", "distance_miles": None, "address": None},
        {"id": "target", "name": "Target", "distance_miles": None, "address": None},
    ]
    grocery_comparison: List[Dict[str, Any]] = []

    for idx, ing in enumerate(ingredients[:5]):
        if idx > 0:
            time.sleep(2)  # Avoid rate limiting / timeouts from back-to-back requests
        display, query = normalize_ingredient_to_query(ing)
        if not query:
            continue
        print(f"[compare-prices] ingredient {idx + 1}/{len(ingredients)}: {query!r}")
        url = f"https://www.walmart.com/search?q={urllib.parse.quote(query)}"
        html = _fetch_via_brightdata_request(url)
        if not html and idx > 0:
            time.sleep(3)
            html = _fetch_via_brightdata_request(url)  # Retry once on timeout
        print(f"[compare-prices]   -> html len={len(html) if html else 0}")
        items: List[Dict[str, Any]] = []
        if html:
            try:
                items = walmart_extract_top_instore_items(html, top_n=2)
            except Exception:
                pass

        walmart_item = items[0] if len(items) >= 1 else None
        target_item = items[1] if len(items) >= 2 else None

        stores_list = [
            _item_to_store_price(stores[0], walmart_item),
            _item_to_store_price(stores[1], target_item),
        ]
        min_price = None
        for s in stores_list:
            p = s.get("price")
            if p is not None and p > 0:
                if min_price is None or p < min_price:
                    min_price = p
        for s in stores_list:
            s["isCheapest"] = min_price is not None and s.get("price") == min_price and s.get("price", 0) > 0
        grocery_comparison.append({"ingredient": display, "stores": stores_list})

    return grocery_comparison


def scrape_one_item(
    store: str,
    zip_code: str,
    query: str,
    sb,
    ttl_seconds: int = 1800,
    scraper_url: Optional[str] = None,   # kept for signature compatibility; unused
) -> Optional[Dict[str, Any]]:
    try:
        import urllib.parse

        store_id = (store or "").strip().lower()

        # Build retailer search URL (only Walmart implemented right now)
        if store_id in ("walmart", "wm"):
            url = f"https://www.walmart.com/search?q={urllib.parse.quote(query)}"
        elif store_id in ("target", "tgt"):
            url = f"https://www.target.com/s?searchTerm={urllib.parse.quote(query)}"
        else:
            return None

        html = unlocker_get(url, timeout=(5.0, 25.0))

        # Parse top in-store item from returned HTML
        items = extract_top_instore_items(html, retailer=store_id, top_n=1)
        return items[0] if items else None

    except Exception:
        return None

# def scrape_one_item(
#     store: str, zip_code: str, query: str, sb, ttl_seconds: int = 1800,
#     scraper_url: Optional[str] = None,
# ) -> Optional[Dict[str, Any]]:
#     scraper_url = (scraper_url or os.getenv("SCRAPER_SERVICE_URL") or "").strip() or None
#     if not scraper_url:
#         return None

#     try:
#         import urllib.request
#         import json

#         req = urllib.request.Request(
#             f"{scraper_url.rstrip('/')}/api/scrape-ingredient",
#             data=json.dumps({"store": store, "zip": zip_code, "query": query}).encode("utf-8"),
#             headers={"Content-Type": "application/json"},
#             method="POST",
#         )
#         with urllib.request.urlopen(req, timeout=25) as resp:
#             data = json.loads(resp.read().decode())
#             if isinstance(data, dict) and data.get("name"):
#                 return data
#             return None
#     except Exception:
#         return None

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
