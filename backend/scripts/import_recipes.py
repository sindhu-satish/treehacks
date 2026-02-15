#!/usr/bin/env python3
"""
Push recipes from CSV to Supabase.

Prerequisites:
  1. Run migrations: backend/migrations/00001_initial_schema.sql and 00002_recipes_table.sql
  2. backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
  3. pip install supabase python-dotenv  (or: pip install -r requirements.txt from project root)

Run from project root:
  python backend/scripts/import_recipes.py

Uses: recipes.csv in project root
"""
import csv
import json
import os
import re
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.chdir(Path(__file__).resolve().parent.parent.parent)

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from supabase import create_client

CSV_PATH = Path(__file__).resolve().parent.parent.parent / "recipes.csv"
BATCH_SIZE = 50

JSON_COLUMNS = {
    "dietary_preference", "cuisines", "allergens", "chef", "ingredients_list",
    "dish_type", "flavours", "meat_type", "prep_method", "protein",
    "spice_level", "time_of_the_day", "main_ingredients", "nutrition",
    "eligible_events", "instructions", "vector_data", "carbs", "fats",
    "edamam_response",
}

INT_COLUMNS = {"cooking_time", "preptime", "servings"}
FLOAT_COLUMNS = {"non_staple_total_price"}
BOOL_COLUMNS = {"is_deleted"}


def parse_value(col: str, val: str):
    if val is None or val == "":
        return None
    if col in JSON_COLUMNS:
        try:
            return json.loads(val) if val.strip() else None
        except json.JSONDecodeError:
            return None
    if col in INT_COLUMNS:
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
    if col in FLOAT_COLUMNS:
        try:
            return float(val)
        except (ValueError, TypeError):
            return None
    if col in BOOL_COLUMNS:
        return str(val).lower() in ("1", "true", "yes")
    return val


def main():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")
        sys.exit(1)

    if not CSV_PATH.exists():
        print(f"Error: CSV not found at {CSV_PATH}")
        sys.exit(1)

    client = create_client(url, key)

    rows = []
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        for row in reader:
            out = {}
            for col in columns:
                if col not in row:
                    continue
                v = parse_value(col, row[col])
                if v is not None:
                    out[col] = v
            if out.get("id"):
                rows.append(out)

    total = len(rows)
    print(f"Loaded {total} rows from CSV")

    skip_columns = set()
    i = 0
    while i < total:
        batch = rows[i : i + BATCH_SIZE]
        filtered = []
        for row in batch:
            filtered.append({k: v for k, v in row.items() if k not in skip_columns})
        try:
            client.table("recipes").upsert(filtered, on_conflict="id").execute()
            print(f"  Upserted rows {i + 1}-{min(i + BATCH_SIZE, total)}/{total}")
            i += BATCH_SIZE
        except Exception as e:
            err = str(e)
            if hasattr(e, "args") and e.args and isinstance(e.args[0], dict):
                err = e.args[0].get("message", err)
            m = re.search(r"Could not find the '([^']+)' column", err)
            if m:
                col = m.group(1)
                skip_columns.add(col)
                print(f"  Skipping column '{col}' (not in table), retrying...")
            else:
                print(f"Error at batch {i // BATCH_SIZE + 1}: {e}")
                raise

    if skip_columns:
        print(f"Skipped columns (not in DB): {', '.join(sorted(skip_columns))}")
    print("Done.")


if __name__ == "__main__":
    main()
