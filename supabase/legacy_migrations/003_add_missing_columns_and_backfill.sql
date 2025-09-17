-- 003_add_missing_columns_and_backfill.sql
-- Add missing columns with IF NOT EXISTS guards

-- profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_level int;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founding_member boolean NOT NULL DEFAULT false;

-- accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance numeric(14,2);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Backfill approval_status based on role
UPDATE profiles SET approval_status = 'approved' WHERE role IN ('user','admin');

-- Backfill verified_at from start_date for users marked as 'user'
UPDATE accounts a
SET verified_at = COALESCE(a.verified_at, a.start_date::timestamptz)
FROM profiles p
WHERE a.user_id = p.id AND p.role = 'user' AND a.start_date IS NOT NULL AND a.verified_at IS NULL;

-- Backfill initial_balance from earliest DEPOSIT per account if present
WITH first_deposits AS (
  SELECT DISTINCT ON (account_id) account_id, amount
  FROM transactions
  WHERE type = 'DEPOSIT'
  ORDER BY account_id, created_at ASC
)
UPDATE accounts a
SET initial_balance = fd.amount
FROM first_deposits fd
WHERE a.id = fd.account_id AND (a.initial_balance IS NULL OR a.initial_balance = 0);

-- For remaining accounts without a deposit record, use current balance as initial_balance
UPDATE accounts SET initial_balance = balance WHERE initial_balance IS NULL;

-- Compute referral levels using a recursive CTE (root = profiles with no referrer)
WITH RECURSIVE tree AS (
  SELECT id, referrer_id, 0 AS level
  FROM profiles
  WHERE referrer_id IS NULL
  UNION ALL
  SELECT p.id, p.referrer_id, t.level + 1
  FROM profiles p
  JOIN tree t ON p.referrer_id = t.id
)
UPDATE profiles p
SET referral_level = tree.level
FROM tree
WHERE p.id = tree.id;

-- Mark known founding members by referral_code if present in data
UPDATE profiles SET is_founding_member = true WHERE referral_code IN ('JORDAN2024','JARED2024','RICHARD2024','DIANA2024');

