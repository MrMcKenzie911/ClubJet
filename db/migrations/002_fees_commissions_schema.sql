-- 002_fees_commissions_schema.sql

-- signup fees ledger
CREATE TABLE IF NOT EXISTS signup_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  initial_deposit NUMERIC(12,2) NOT NULL,
  fee_amount NUMERIC(12,2) NOT NULL,
  referrer1_share NUMERIC(12,2) NOT NULL DEFAULT 0,
  referrer2_share NUMERIC(12,2) NOT NULL DEFAULT 0,
  slush_fund_share NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- commission distributions per month/account
CREATE TABLE IF NOT EXISTS commission_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  gross_rate NUMERIC(6,4) NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL,
  member_share NUMERIC(12,2) NOT NULL,
  referrer1_share NUMERIC(12,2) NOT NULL,
  referrer2_share NUMERIC(12,2) NOT NULL,
  slush_share NUMERIC(12,2) NOT NULL,
  jared_share NUMERIC(12,2) NOT NULL,
  ross_share NUMERIC(12,2) NOT NULL,
  bne_share NUMERIC(12,2) NOT NULL,
  calculation_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- slush fund transactions
CREATE TABLE IF NOT EXISTS slush_fund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2),
  reference_account_id UUID REFERENCES accounts(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

