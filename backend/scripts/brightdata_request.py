#!/usr/bin/env python3
"""
Fetch Walmart and Target search pages via Bright Data Request API.

Uses env vars from backend/.env:
  BRIGHTDATA_API_KEY      - Bearer token (required)
  BRIGHTDATA_REQUEST_ZONE - Zone name (default: mcp_unlocker or mahm_unlocker)
  BRIGHTDATA_COOKIE       - Optional Cookie header for request

Run from project root:
  python backend/scripts/brightdata_request.py yogurt
  python backend/scripts/brightdata_request.py organic milk
"""
import json
import os
import sys
from pathlib import Path
from urllib.parse import quote

# Load backend .env
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

import requests

API_URL = "https://api.brightdata.com/request"

STORE_URLS = {
    "walmart": "https://www.walmart.com/search?q={query}",
    "target": "https://www.target.com/s?searchTerm={query}",
}


def fetch_store(store: str, url: str) -> dict:
    api_key = (os.getenv("BRIGHTDATA_API_KEY") or "").strip()
    zone = (os.getenv("BRIGHTDATA_REQUEST_ZONE") or os.getenv("BRIGHTDATA_ZONE") or "mcp_unlocker").strip()
    cookie = (os.getenv("BRIGHTDATA_COOKIE") or "").strip()

    if not api_key:
        return {"store": store, "error": "BRIGHTDATA_API_KEY not set in .env"}

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if cookie:
        headers["Cookie"] = cookie

    payload = {
        "zone": zone,
        "url": url,
        "format": "raw",
        "method": "GET",
        "country": "US",
    }

    try:
        # async=false for synchronous response (immediate HTML)
        resp = requests.post(
            f"{API_URL}?async=false",
            headers=headers,
            json=payload,
            timeout=90,
        )
        resp.raise_for_status()
        return {"store": store, "url": url, "status": resp.status_code, "html": resp.text, "bytes": len(resp.text)}
    except requests.RequestException as e:
        return {"store": store, "url": url, "error": str(e)}


def main():
    ingredient = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "yogurt"
    query = quote(ingredient)

    print(f"Ingredient: {ingredient}\n")

    results = {}
    for store, tmpl in STORE_URLS.items():
        url = tmpl.format(query=query)
        print(f"Fetching {store}...")
        out = fetch_store(store, url)
        results[store] = out
        if "error" in out:
            print(f"  Error: {out['error']}")
        else:
            print(f"  OK: {out.get('bytes', 0)} bytes")

    # Save HTML for inspection (optional)
    out_dir = Path(__file__).resolve().parent.parent.parent / "data-apis"
    out_dir.mkdir(exist_ok=True)
    for store, data in results.items():
        if "html" in data:
            path = out_dir / f"brightdata_{store}_{ingredient.replace(' ', '_')}.html"
            path.write_text(data["html"], encoding="utf-8")
            print(f"  Saved: {path}")

    # Summary JSON (no HTML to keep it small)
    summary = {k: {kk: vv for kk, vv in v.items() if kk != "html"} for k, v in results.items()}
    print("\nSummary:", json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
