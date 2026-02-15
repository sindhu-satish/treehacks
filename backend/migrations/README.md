# Database migrations (Supabase / Postgres)

Migrations create the schema required by the Mahm backend plan (auth, profiles, meal plans, cart, marketplace cache, saved/made recipes, meal logs, and recipes catalog).

## Order

Run in numeric order:

1. **00001_initial_schema.sql** – Core app tables: `users`, `user_profiles`, `scrape_cache`, `meal_plans`, `meal_plan_days`, `cart_items`, `user_saved_recipes`, `recipe_journal`, `meal_logs`.
2. **00002_recipes_table.sql** – `recipes` table for the CSV import (Supabase Snippet Fetch Single Recipe.csv).

## How to run

### Option A: Supabase Dashboard

1. Open your project at [app.supabase.com](https://app.supabase.com).
2. Go to **SQL Editor**.
3. Paste the contents of `00001_initial_schema.sql` and run.
4. Paste the contents of `00002_recipes_table.sql` and run.

### Option B: Supabase CLI

If you use the Supabase CLI and link this repo:

```bash
# From repo root
supabase link --project-ref YOUR_REF
# Copy migrations into supabase/migrations/ if you use supabase db push
cp backend/migrations/*.sql supabase/migrations/
supabase db push
```

Or run SQL files directly with `psql`:

```bash
psql "$DATABASE_URL" -f backend/migrations/00001_initial_schema.sql
psql "$DATABASE_URL" -f backend/migrations/00002_recipes_table.sql
```

### After migrations

- **Load recipes from CSV:** Run the import script from project root:
  ```bash
  python backend/scripts/import_recipes.py
  ```
  Uses `recipes.csv` in the project root. Requires `backend/.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Backend expects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` to use these tables.
