-- 008_fix_missing_columns.sql
-- Add missing columns to profiles and accounts tables

-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_amount NUMERIC(14,2);

-- Ensure accounts table has reserved_amount column
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Add check constraint for account_type
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_account_type_check 
CHECK (account_type IS NULL OR account_type IN ('LENDER', 'NETWORK'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_pin_code ON profiles(pin_code);
