-- 003_accounts_lockup.sql

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS lockup_end_date DATE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(12,2) DEFAULT 0;
-- is_in_lockup as a computed column alternative is not directly supported; use a view if needed

