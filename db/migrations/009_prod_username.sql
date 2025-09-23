-- 009_prod_username.sql
-- Production-safe username migration: adds column, unique index, backfills, sync trigger, and aligns referral_code

BEGIN;

-- 1) Add username column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2) Unique index on lower(username) (case-insensitive uniqueness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_profiles_username_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_username_unique ON public.profiles (LOWER(username))';
  END IF;
END$$;

-- 3) Backfill username from referral_code when missing
UPDATE public.profiles
SET username = referral_code
WHERE username IS NULL AND referral_code IS NOT NULL;

-- 4) Keep referral_code in sync with username (function)
CREATE OR REPLACE FUNCTION public.sync_referral_code_with_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL AND (OLD.username IS DISTINCT FROM NEW.username) THEN
    NEW.referral_code := NEW.username;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Trigger to enforce sync on insert/update
DROP TRIGGER IF EXISTS trg_sync_refcode_username ON public.profiles;
CREATE TRIGGER trg_sync_refcode_username
BEFORE INSERT OR UPDATE OF username ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_referral_code_with_username();

-- 6) Optional alignment pass: ensure referral_code matches username for all rows
UPDATE public.profiles
SET referral_code = username
WHERE username IS NOT NULL AND referral_code IS DISTINCT FROM username;

COMMIT;

