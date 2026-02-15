#!/usr/bin/env python3
"""
Call the unlocker test API for Walmart and Target, then extract and print items.

Prerequisites:
  - Backend running: flask run (or python run.py) in backend/
  - Bright Data env vars in backend/.env (BRIGHTDATA_CUSTOMER, BRIGHTDATA_ZONE, BRIGHTDATA_PASSWORD)

Run from project root:
  python backend/scripts/fetch_store_prices.py [query]

Example:
  python backend/scripts/fetch_store_prices.py bananas
  python backend/scripts/fetch_store_prices.py organic milk
"""
import json
import sys
from urllib.parse import quote
from urllib.request import urlopen

BASE_URL = "http://localhost:5000/api/unlocker/test"


def fetch_items(store: str, query: str) -> dict:
    """Call unlocker/test for the given store and query. Returns raw response dict."""
    if store == "walmart":
        url = f"https://www.walmart.com/search?q={quote(query)}"
    elif store == "target":
        url = f"https://www.target.com/s?searchTerm={quote(query)}"
    else:
        raise ValueError(f"Unknown store: {store}")

    api_url = f"{BASE_URL}?url={quote(url)}"
    with urlopen(api_url, timeout=60) as resp:
        return json.loads(resp.read().decode())


def extract_values(resp: dict) -> list[dict]:
    """Extract item fields (name, price, etc.) from unlocker response."""
    items = resp.get("items") or []
    return [
        {
            "name": it.get("name"),
            "price": it.get("price"),
            "unitPrice": it.get("unitPrice"),
            "linePriceDisplay": it.get("linePriceDisplay"),
            "image": it.get("image"),
            "availability": it.get("availability"),
        }
        for it in items
    ]


def main():
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "bananas"

    print(f"Query: {query}\n")

    for store in ("walmart", "target"):
        print(f"--- {store.upper()} ---")
        try:
            resp = fetch_items(store, query)
            items = extract_values(resp)
            ms = resp.get("ms", "?")
            bytes_count = resp.get("bytes", "?")
            print(f"  Fetched in {ms}ms, {bytes_count} bytes")
            print(f"  Items: {len(items)}")
            for i, it in enumerate(items, 1):
                print(f"    {i}. {it.get('name', 'N/A')}")
                print(f"       price={it.get('price')}, unitPrice={it.get('unitPrice')}, availability={it.get('availability')}")
            if not items:
                print("  (no items extracted - may be CAPTCHA or empty)")
        except Exception as e:
            print(f"  Error: {e}")
        print()

    return 0


if __name__ == "__main__":
    sys.exit(main())