-- Club Aureus / Supabase: Full Schema (run top-to-bottom)
-- Use Supabase SQL Editor. Run in production project. Safe to re-run (IF NOT EXISTS guards).
-- Prereqs: set env NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, VAPI_WEBHOOK_URL in Netlify.

-- 0) Extensions
create extension if not exists pgcrypto;

-- 1) profiles (1 row per auth user)
create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'pending' check (role in ('user','admin','pending')),
  approval_status text not null default 'pending',
  referrer_id uuid references profiles(id) on delete set null,
  referral_code text unique,
  referral_level int,
  is_founding_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_profiles_referrer on profiles(referrer_id);

-- 2) accounts
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('LENDER','NETWORK')),
  balance numeric(14,2) not null default 0,
  reserved_amount numeric(14,2) not null default 0,
  minimum_balance numeric(14,2) not null default 0,
  start_date date,
  lockup_end_date date,
  initial_balance numeric(14,2),
  verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_accounts_user on accounts(user_id);

-- 3) transactions
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  type text not null check (type in ('DEPOSIT','WITHDRAWAL','INTEREST','COMMISSION')),
  amount numeric(14,2) not null,
  status text not null default 'completed' check (status in ('pending','posted','completed','denied')),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_account on transactions(account_id);
create index if not exists idx_tx_type on transactions(type);

-- 4) withdrawal_requests
create table if not exists withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  amount numeric(14,2) not null,
  method text not null check (method in ('STRIPE','ACH','WIRE')),
  status text not null default 'pending' check (status in ('pending','approved','denied','completed')),
  requested_at timestamptz not null default now(),
  scheduled_release_at date,
  processed_at timestamptz
);
create index if not exists idx_wr_account on withdrawal_requests(account_id);
create index if not exists idx_wr_status on withdrawal_requests(status);

-- 5) earnings_rates (admin-set monthly fixed % for types)
create table if not exists earnings_rates (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('LENDER','NETWORK')),
  fixed_rate_monthly numeric(6,4),
  effective_from date not null
);
create index if not exists idx_rates_effective on earnings_rates(effective_from desc);

-- 6) referral_relationships (computed ancestry for fast L1..L5 lookups)
create table if not exists referral_relationships (
  user_id uuid primary key references profiles(id) on delete cascade,
  level_1_referrer_id uuid references profiles(id) on delete set null,
  level_2_referrer_id uuid references profiles(id) on delete set null,
  level_3_referrer_id uuid references profiles(id) on delete set null,
  level_4_referrer_id uuid references profiles(id) on delete set null,
  level_5_referrer_id uuid references profiles(id) on delete set null
);

-- 7) signup_fees (one-time fees charged on initial deposit approval)
create table if not exists signup_fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  initial_deposit numeric(14,2) not null,
  fee_amount numeric(14,2) not null,
  referrer1_share numeric(14,2) not null default 0,
  referrer2_share numeric(14,2) not null default 0,
  slush_fund_share numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_signup_fees_user on signup_fees(user_id);

-- 8) commission_distributions (monthly summary per account)
create table if not exists commission_distributions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  calculation_month date not null,
  gross_rate numeric(6,3) not null,
  gross_amount numeric(14,2) not null,
  member_share numeric(14,2) not null,
  referrer1_share numeric(14,2) not null,
  referrer2_share numeric(14,2) not null,
  slush_share numeric(14,2) not null,
  jared_share numeric(14,2) not null,
  ross_share numeric(14,2) not null,
  bne_share numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_commission_month on commission_distributions(account_id, calculation_month);

-- 9) slush_fund_transactions (platform-level inflows/outflows)
create table if not exists slush_fund_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type text not null check (transaction_type in ('deposit','payout')),
  amount numeric(14,2) not null,
  reference_account_id uuid references accounts(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

-- 10) pending_deposits (pre-approval, used to create account & apply signup fee)
create table if not exists pending_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  account_type text not null check (account_type in ('LENDER','NETWORK')),
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pending_deposits_user on pending_deposits(user_id);

-- 11) founder_override_payouts (FM Level 3–5 overrides)
create table if not exists founder_override_payouts (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  level int not null check (level in (3,4,5)),
  member_interest_amount numeric(12,2) not null,
  override_rate numeric(6,4) not null,
  override_amount numeric(12,2) not null,
  calculation_month date not null,
  created_at timestamptz not null default now(),
  unique(founder_id, account_id, calculation_month, level)
);

-- 12) audit_log (optional; lightweight)
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  event text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 13) OPTIONAL legacy/supporting tables (keep if you already use them)
create table if not exists investment_tiers (
  id uuid primary key default gen_random_uuid(),
  label text,
  min_amount numeric(14,2),
  max_amount numeric(14,2)
);
create table if not exists lender_bands (
  id uuid primary key default gen_random_uuid(),
  label text,
  min_balance numeric(14,2),
  rate numeric(6,4)
);
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  kind text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 14) RPC helpers
-- Increments balance atomically
create or replace function increment_balance(account_id uuid, amount numeric)
returns void as $$
begin
  update accounts set balance = balance + amount where id = account_id;
end; $$ language plpgsql;

-- Reserve funds (for pending withdrawal)
create or replace function reserve_funds(account_id uuid, amount numeric)
returns boolean as $$
declare
  ok boolean := false;
begin
  update accounts
    set balance = balance - amount,
        reserved_amount = reserved_amount + amount
  where id = account_id and balance >= amount;
  -- FOUND is true if the previous SQL affected at least one row
  ok := FOUND;
  return ok;
end; $$ language plpgsql;

-- Process withdrawal (release reserved)
create or replace function process_withdrawal(account_id uuid, amount numeric)
returns void as $$
begin
  update accounts set reserved_amount = greatest(reserved_amount - amount, 0) where id = account_id;
end; $$ language plpgsql;

-- Check if a column exists (utility)
create or replace function check_column_exists(p_table text, p_column text)
returns boolean as $$
  select exists (
    select 1 from information_schema.columns
    where table_name = p_table and column_name = p_column
  );
$$ language sql stable;

-- 15) Suggested RLS (optional; admin uses service key)
-- Enable at your discretion; not enabling here to avoid breaking admin ops.
-- alter table profiles enable row level security;
-- alter table accounts enable row level security;
-- ... add policies for user_id = auth.uid().

-- DONE

