#!/usr/bin/env python3
"""Run Walmart HTML file through extraction and print items."""
import json
import sys
from pathlib import Path

# Add backend to path, import parsing_utils before app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.parsing_utils import walmart_extract_top_instore_items

def main():
    html_path = Path(__file__).resolve().parent.parent.parent / "data-apis" / "brightdata_walmart_yogurt.html"
    if len(sys.argv) > 1:
        html_path = Path(sys.argv[1])
    if not html_path.exists():
        print(f"File not found: {html_path}")
        return 1
    html = html_path.read_text(encoding="utf-8")
    items = walmart_extract_top_instore_items(html, top_n=5)
    print(json.dumps(items, indent=2))
    return 0

if __name__ == "__main__":
    sys.exit(main())
