-- User profiles schema: flat columns
-- user_id, created_at, updated_at, zip, budget_weekly, diet, allergies, dislikes, max_prep_minutes, household_size, prefs

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS budget_weekly INTEGER DEFAULT 80;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS diet TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS dislikes JSONB DEFAULT '[]';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS max_prep_minutes INTEGER DEFAULT 30;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS household_size INTEGER DEFAULT 1;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS prefs JSONB DEFAULT '{}';
