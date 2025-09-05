-- 004_pending_deposits.sql

CREATE TABLE IF NOT EXISTS pending_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  account_type VARCHAR(16) NOT NULL CHECK (account_type IN ('LENDER','NETWORK')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_deposits_user ON pending_deposits(user_id);

