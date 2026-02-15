-- Mahm backend – recipes table for Supabase (CSV import source)
-- Matches columns from Supabase Snippet Fetch Single Recipe CSV.
-- Run after 00001_initial_schema.sql, then run scripts/import_recipes.py.

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY,
  recipe_name TEXT,
  recipe_category TEXT,
  image_link TEXT,
  dietary_preference JSONB,
  cuisines JSONB,
  allergens JSONB,
  recipe_source TEXT,
  status TEXT,
  chef JSONB,
  ingredients_list JSONB,
  web_link TEXT,
  recipe_description TEXT,
  recipe_id TEXT,
  cooking_time INTEGER,
  dish_type JSONB,
  flavours JSONB,
  meat_type JSONB,
  prep_method JSONB,
  preptime INTEGER,
  protein JSONB,
  spice_level JSONB,
  time_of_the_day JSONB,
  main_ingredients JSONB,
  nutrition JSONB,
  event_type TEXT,
  budget TEXT,
  eligible_events JSONB,
  event_service TEXT,
  servings INTEGER,
  shrtd_recipe_name TEXT,
  instructions JSONB,
  source_name TEXT,
  created TIMESTAMPTZ,
  image_link_portrait TEXT,
  image_link_landscape TEXT,
  updated TIMESTAMPTZ,
  access_control TEXT,
  auth TEXT,
  vector_data JSONB,
  non_staple_total_price NUMERIC(10, 2),
  carbs JSONB,
  fats JSONB,
  progress_status TEXT,
  edamam_response JSONB,
  organization_reference TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_recipes_recipe_id ON recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_name ON recipes(recipe_name);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status) WHERE is_deleted = false;

COMMENT ON TABLE recipes IS 'Recipe catalog from CSV import.';
