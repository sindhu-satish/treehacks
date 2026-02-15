-- Mahm backend – initial schema for Supabase (Postgres)
-- Run in Supabase SQL Editor or via psql in order.
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Auth & users (Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- User profiles & preferences (Phase 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN user_profiles.preferences IS 'UserPreferences: dietaryRestrictions, allergies, dislikedFoods, budget, budgetPeriod, cookingSkill, availableTime, healthGoals, householdSize (arrays/values as per UI types)';

-- ---------------------------------------------------------------------------
-- Scrape cache for Bright Data / marketplace (Phase 4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_cache (
  cache_key TEXT PRIMARY KEY,
  store TEXT NOT NULL,
  zip TEXT NOT NULL,
  query TEXT NOT NULL,
  response JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scrape_cache_fetched_at ON scrape_cache(fetched_at);

-- ---------------------------------------------------------------------------
-- Meal plans (Phase 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);

CREATE TABLE IF NOT EXISTS meal_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_date DATE NOT NULL,
  meals JSONB NOT NULL DEFAULT '{}',
  UNIQUE(plan_id, day_date)
);

COMMENT ON COLUMN meal_plan_days.meals IS 'MealDay.meals: breakfast, lunch, dinner, snacks (PlannedMeal objects)';

CREATE INDEX IF NOT EXISTS idx_meal_plan_days_plan_id ON meal_plan_days(plan_id);

-- ---------------------------------------------------------------------------
-- Shopping cart (Phase 5)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '',
  recipe_id TEXT,
  recipe_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- ---------------------------------------------------------------------------
-- Saved recipes (Phase 6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_saved_recipes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_recipes_user_id ON user_saved_recipes(user_id);

-- ---------------------------------------------------------------------------
-- Cooking journal / made recipes (Phase 6)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipe_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_name TEXT,
  made_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  notes TEXT DEFAULT '',
  photos JSONB DEFAULT '[]',
  modifications TEXT DEFAULT '',
  would_make_again BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_recipe_journal_user_id ON recipe_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_journal_recipe_id ON recipe_journal(recipe_id);

-- ---------------------------------------------------------------------------
-- Meal logs (Phase 7)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  description TEXT DEFAULT '',
  photo_url TEXT,
  is_from_meal_plan BOOLEAN DEFAULT false,
  recipe_id TEXT,
  recipe_name TEXT,
  nutrition JSONB DEFAULT '{}',
  feedback JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN meal_logs.nutrition IS 'NutritionInfo: calories, protein, carbs, fat, fiber, etc.';
COMMENT ON COLUMN meal_logs.feedback IS 'rating, notes, wouldMakeAgain';

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_log_date ON meal_logs(log_date);

-- ---------------------------------------------------------------------------
-- RLS (optional): enable Row Level Security and policies per table if needed
-- ---------------------------------------------------------------------------
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ... (add policies so users can only read/write their own rows when using Supabase Auth JWT)
