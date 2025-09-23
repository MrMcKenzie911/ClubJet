-- 009_add_username.sql
-- Adds a platform-wide username for profiles and keeps referral_code aligned

-- 1) Add username column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2) Enforce uniqueness (case-insensitive) via unique index on lower(username)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_username_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles (LOWER(username))';
  END IF;
END$$;

-- 3) Backfill: if username is null and referral_code not null, set username = referral_code
UPDATE profiles
SET username = referral_code
WHERE username IS NULL AND referral_code IS NOT NULL;

-- 4) For new/updated rows, keep referral_code in sync with username.
--    If your Postgres allows, we define an upsert trigger to mirror username into referral_code when username changes.
--    This preserves your existing referral_code usage transparently.

CREATE OR REPLACE FUNCTION sync_referral_code_with_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL AND (OLD.username IS DISTINCT FROM NEW.username) THEN
    NEW.referral_code := NEW.username;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_refcode_username ON profiles;
CREATE TRIGGER trg_sync_refcode_username
BEFORE INSERT OR UPDATE OF username ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_referral_code_with_username();

-- Note: Application code should continue to treat referral_code as the public referral identifier.
-- With this migration, referral_code will equal username for all users going forward.

