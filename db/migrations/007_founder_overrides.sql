-- 007_founder_overrides.sql

CREATE TABLE IF NOT EXISTS founder_override_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (3,4,5)),
  member_interest_amount NUMERIC(12,2) NOT NULL,
  override_rate NUMERIC(6,4) NOT NULL,
  override_amount NUMERIC(12,2) NOT NULL,
  calculation_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_override_month ON founder_override_payouts(founder_id, account_id, calculation_month, level);
CREATE INDEX IF NOT EXISTS idx_founder_override_founder ON founder_override_payouts(founder_id);
CREATE INDEX IF NOT EXISTS idx_founder_override_user ON founder_override_payouts(user_id);

