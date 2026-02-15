# Mahm Backend

Flask API for auth, user profiles, meal plans, marketplace (stores/prices), cart, saved/made recipes, and meal logs.

## Setup

```bash
cd backend
pip install -r ../requirements.txt
```

## Env vars (backend/.env)

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FLASK_SECRET_KEY=your-secret-for-sessions
CACHE_TTL_SECONDS=1800
MARKETPLACE_PROVIDER=dev   # or "brightdata" for live scraping
SCRAPER_SERVICE_URL=http://localhost:3000  # multiagents URL when using Bright Data MCP
CORS_ORIGINS=http://localhost:3000
```

## Run

```bash
python run.py
```

Server runs on port 5000.

## Migrations

Run `backend/migrations/00001_initial_schema.sql` and `00002_recipes_table.sql` in Supabase SQL Editor before using the API. See [migrations/README.md](migrations/README.md).

## API overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /health | GET | - | Health check |
| /api/auth/register | POST | - | Create user |
| /api/auth/login | POST | - | Login |
| /api/auth/logout | POST | - | Logout |
| /api/auth/me | GET | session | Current user |
| /api/user/profile | GET/PUT | required | Profile + preferences |
| /api/user/saved-recipes | GET | required | Saved recipe IDs |
| /api/user/made-recipes | GET | required | Cooking journal |
| /api/user/meal-logs | GET | required | Meal logs |
| /api/meal-plans | GET/POST | required | Meal plans |
| /api/meal-plans/<id> | PUT | required | Update plan |
| /api/meal-plans/<id>/swap-meal | POST | required | Swap meal |
| /api/meal-plans/<id>/regenerate-meal | POST | required | Regenerate meal |
| /api/meal-plans/<id>/grocery-list | GET | required | Grocery list |
| /api/stores | GET | - | Stores near zip |
| /api/marketplace | POST | - | Quote prices (agent) |
| /api/marketplace/compare-prices | POST | - | Compare prices |
| /api/cart | GET | required | Get cart |
| /api/cart/add | POST | required | Add to cart |
| /api/cart/update | POST | required | Update quantity |
| /api/cart/<id> | DELETE | required | Remove item |
| /api/recipes/<id>/save | POST/DELETE | required | Save/unsave recipe |
| /api/recipes/<id>/rate | POST | required | Log made + rating |
| /api/meal-logs | POST | required | Create meal log |
| /api/meal-logs/<id> | PATCH | required | Update meal log |
| /api/meal-logs/<id>/feedback | POST | required | Add feedback |

Protected routes require `X-User-Id` header or a valid session (login first).
