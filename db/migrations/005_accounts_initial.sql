-- 005_accounts_initial.sql

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS initial_balance NUMERIC(12,2);

