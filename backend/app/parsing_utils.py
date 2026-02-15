"""
utils_retail_parse.py

Drop-in helper functions to extract embedded JSON state from retailer HTML,
then normalize “search results” into a common product-tile schema.

Designed to work for Walmart now, and be extendable for Target later.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from html import unescape
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

_NEXT_DATA_RE = re.compile(
    r'<script[^>]*\bid="__NEXT_DATA__"[^>]*>(?P<json>.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)

# Generic HTML -> JSON helpers
@dataclass(frozen=True)
class EmbeddedJsonPattern:
    """
    A pattern describing how to find a JSON object/array embedded in HTML/JS.

    - name: just for debugging/logging
    - anchor_regex: regex that identifies a location near the JSON payload
    - start_from: where to start brace/array scanning relative to anchor match
                  ("match_start", "match_end")
    - seek_open_char: if set, we first seek backwards to this char before scanning,
                      e.g. '{' for object payloads.
    """
    name: str
    anchor_regex: re.Pattern
    start_from: str = "match_start"
    seek_open_char: Optional[str] = "{"
    allow_array_root: bool = False


def _scan_balanced_json(text: str, start_idx: int) -> Tuple[str, int]:
    """
    Given text and an index that points at '{' or '[' (possibly after seeking),
    return (json_substring, end_idx_exclusive).
    """
    # Seek to first opening brace/bracket at or after start_idx
    i = start_idx
    while i < len(text) and text[i] not in "{[":
        i += 1
    if i >= len(text):
        raise ValueError("No JSON opening brace/bracket found")

    open_ch = text[i]
    close_ch = "}" if open_ch == "{" else "]"

    depth = 0
    in_str = False
    esc = False
    j = i

    while j < len(text):
        ch = text[j]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[i : j + 1], j + 1
            elif ch in "{[":
                # nested other-type container
                # treat it as depth increase only if matches current open_ch
                # (we handle other types naturally because we only decrement on close_ch)
                # This is okay because JSON nesting is well-formed; we only need to find the
                # matching close for the root container.
                pass
        j += 1

    raise ValueError("Unbalanced JSON; did not find matching closing brace/bracket")


def extract_embedded_json(
    html: str,
    patterns: Iterable[EmbeddedJsonPattern],
    *,
    html_unescape: bool = True,
) -> Dict[str, Any]:
    """
    Try multiple patterns to locate an embedded JSON blob and parse it.

    Returns the first successfully parsed JSON object (dict or list root; caller can validate).
    """
    hay = unescape(html) if html_unescape else html

    last_err: Optional[Exception] = None
    for pat in patterns:
        m = pat.anchor_regex.search(hay)
        if not m:
            continue

        idx = m.start() if pat.start_from == "match_start" else m.end()

        if pat.seek_open_char:
            # Heuristic: walk backwards to nearest opening char to capture full object
            back = hay.rfind(pat.seek_open_char, 0, idx)
            if back != -1:
                idx = back

        try:
            blob, _end = _scan_balanced_json(hay, idx)
            parsed = json.loads(blob)
            # If arrays are not allowed but we got an array, fail here
            if isinstance(parsed, list) and not pat.allow_array_root:
                raise ValueError(f"Pattern {pat.name} produced array root unexpectedly")
            if not isinstance(parsed, (dict, list)):
                raise ValueError(f"Pattern {pat.name} produced non-container root")
            return parsed if isinstance(parsed, dict) else {"_root": parsed}
        except Exception as e:
            last_err = e
            continue

    raise ValueError(f"Failed to extract embedded JSON with provided patterns. Last error: {last_err}")

def to_out(p: dict) -> dict:
    price_info = p.get("priceInfo") or {}
    rating = p.get("rating") or {}

    return {
        "usItemId": p.get("usItemId"),
        "name": p.get("name"),
        "price": p.get("price"),
        "linePriceDisplay": price_info.get("linePriceDisplay"),
        "unitPrice": price_info.get("unitPrice"),
        "canonicalUrl": p.get("canonicalUrl"),
        "image": p.get("image") or (p.get("imageInfo") or {}).get("thumbnailUrl"),
        "sellerName": p.get("sellerName"),
        "fulfillmentType": p.get("fulfillmentType"),
        "availability": (p.get("availabilityStatusV2") or {}).get("value"),
        "rating": rating.get("averageRating"),
        "reviewCount": rating.get("numberOfReviews"),
    }

def extract_next_data_json(html: str) -> dict:
    m = _NEXT_DATA_RE.search(html)
    if not m:
        raise ValueError("Could not find __NEXT_DATA__ script tag")
    payload = unescape(m.group("json")).strip()
    return json.loads(payload)

# Retailer-specific extractors
# Walmart patterns (works with your snippet where a large JSON object contains "searchResult": {...})
# 1) add this pattern first
WALMART_EMBEDDED_JSON_PATTERNS = [
    EmbeddedJsonPattern(
        name="walmart_next_data",
        anchor_regex=re.compile(r'id="__NEXT_DATA__"\s*type="application/json"\s*>'),
        start_from="match_end",
        seek_open_char=None,          # JSON starts right after the '>' of the script tag
        allow_array_root=False,
    ),
    EmbeddedJsonPattern(
        name="walmart_searchResult_key",
        anchor_regex=re.compile(r'"searchResult"(?!s)\s*:'),
        start_from="match_start",
        seek_open_char="{",
    ),
]

def _find_first_key(obj, key: str):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            hit = _find_first_key(v, key)
            if hit is not None:
                return hit
    elif isinstance(obj, list):
        for x in obj:
            hit = _find_first_key(x, key)
            if hit is not None:
                return hit
    return None

def debug_walmart_shape(data: dict) -> None:
    sr = data.get("searchResult")
    print("has searchResult:", isinstance(sr, dict))
    if not isinstance(sr, dict):
        print("top-level keys sample:", list(data.keys())[:50])
        return

    stacks = sr.get("itemStacks") or []
    print("itemStacks:", len(stacks))
    if stacks:
        print("first stack keys:", list(stacks[0].keys()))
        items = (stacks[0].get("items") or [])
        print("first stack items:", len(items))
        if items:
            ft = {}
            for it in items[:40]:
                ft[it.get("fulfillmentType")] = ft.get(it.get("fulfillmentType"), 0) + 1
            print("fulfillmentType counts (first 40):", ft)
            print("example item keys:", list(items[0].keys())[:40])
            print("example fulfillmentSummary:", items[0].get("fulfillmentSummary"))

def walmart_extract_top_instore_items(html: str, *, top_n: int = 5) -> list[dict]:
    data = extract_next_data_json(html)

    # find searchResult anywhere in the Next.js payload
    sr = _find_first_key(data, "searchResult") or {}
    stacks = sr.get("itemStacks") or []

    all_items = []
    for st in stacks:
        all_items.extend(st.get("items") or [])

    instore = [p for p in all_items if p.get("fulfillmentType") == "STORE"]
    return [to_out(p) for p in instore[:top_n]]

# Placeholder patterns; you’ll likely update once you inspect Target HTML.
TARGET_EMBEDDED_JSON_PATTERNS: List[EmbeddedJsonPattern] = [
    # Example possibilities you might encounter:
    # - __NEXT_DATA__ (Next.js)
    # - some "preloadedState" assignment
    EmbeddedJsonPattern(
        name="target_next_data",
        anchor_regex=re.compile(r'id="__NEXT_DATA__"\s*type="application/json"\s*>'),
        start_from="match_end",
        seek_open_char=None,        # the JSON starts right after the tag close
        allow_array_root=False,
    ),
]

def target_extract_top_instore_items(html: str, *, top_n: int = 5) -> List[Dict[str, Any]]:
    raise NotImplementedError("Target parsing not implemented yet; add once you capture Target HTML + JSON structure.")

def extract_top_instore_items(html: str, *, retailer: str, top_n: int = 5) -> List[Dict[str, Any]]:
    # call like extract_top_instore_items(html, retailer="walmart", top_n=5)

    r = retailer.strip().lower()
    if r in ("walmart", "wm"):
        return walmart_extract_top_instore_items(html, top_n=top_n)
    if r in ("target", "tgt"):
        return target_extract_top_instore_items(html, top_n=top_n)
    raise ValueError(f"Unknown retailer: {retailer}")