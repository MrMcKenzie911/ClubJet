-- Extensions
create extension if not exists pgcrypto;

-- ============================
-- Tables
-- ============================

-- Profiles: maps to auth users (id should equal auth.user.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'pending' check (role in ('pending','user','admin')),
  referrer_id uuid references public.profiles(id) on delete set null,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('LENDER','NETWORK')),
  balance numeric not null default 0,
  start_date date not null default current_date,
  minimum_balance numeric not null default 5000,
  lockup_end_date date,
  created_at timestamptz not null default now()
);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text not null check (type in ('DEPOSIT','WITHDRAWAL','INTEREST','COMMISSION')),
  amount numeric not null,
  status text not null default 'posted',
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Withdrawal Requests
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount numeric not null,
  method text not null check (method in ('STRIPE','ACH','WIRE')),
  status text not null default 'pending' check (status in ('pending','approved','denied','released')),
  requested_at timestamptz not null default now(),
  scheduled_release_at date
);

-- Referrals (simple two-level)
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  referrer_level1_id uuid references public.profiles(id) on delete set null,
  referrer_level2_id uuid references public.profiles(id) on delete set null
);

-- Earnings Rates
create table if not exists public.earnings_rates (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('LENDER','NETWORK')),
  fixed_rate_monthly numeric,
  effective_from date not null,
  effective_to date
);

-- Payment Methods
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  details_json jsonb,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit Log
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  diff_json jsonb,
  created_at timestamptz not null default now()
);

-- ============================
-- Helper Functions
-- ============================

-- Helper: admin check function to simplify RLS
drop function if exists public.is_admin(uuid);
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to public;

-- ============================
-- RLS enable
-- ============================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.payment_methods enable row level security;
alter table public.referrals enable row level security;
alter table public.earnings_rates enable row level security;
alter table public.audit_log enable row level security;

-- ============================
-- Policies (DROP then CREATE; no IF NOT EXISTS)
-- ============================

-- Admin policies (full access)
drop policy if exists admin_all_profiles on public.profiles;
create policy admin_all_profiles on public.profiles
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_accounts on public.accounts;
create policy admin_all_accounts on public.accounts
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_transactions on public.transactions;
create policy admin_all_transactions on public.transactions
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_withdrawals on public.withdrawal_requests;
create policy admin_all_withdrawals on public.withdrawal_requests
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_payment_methods on public.payment_methods;
create policy admin_all_payment_methods on public.payment_methods
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_referrals on public.referrals;
create policy admin_all_referrals on public.referrals
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_earnings_rates on public.earnings_rates;
create policy admin_all_earnings_rates on public.earnings_rates
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists admin_all_audit_log on public.audit_log;
create policy admin_all_audit_log on public.audit_log
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- User-owned data policies

-- Profiles: a user can read and update their own profile
drop policy if exists self_read_profile on public.profiles;
create policy self_read_profile on public.profiles
  for select using (id = auth.uid());

drop policy if exists own_profile_update on public.profiles;
create policy own_profile_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Accounts: a user can read their own accounts
drop policy if exists own_accounts_select on public.accounts;
create policy own_accounts_select on public.accounts
  for select using (user_id = auth.uid());

-- Transactions: a user can read transactions tied to their accounts
drop policy if exists own_transactions_select on public.transactions;
create policy own_transactions_select on public.transactions
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = transactions.account_id and a.user_id = auth.uid()
    )
  );

-- Withdrawal requests: a user can read withdrawals tied to their accounts
drop policy if exists own_withdrawals_select on public.withdrawal_requests;
create policy own_withdrawals_select on public.withdrawal_requests
  for select using (
    exists (
      select 1 from public.accounts a
      where a.id = withdrawal_requests.account_id and a.user_id = auth.uid()
    )
  );

-- Payment methods: user can fully manage their own
drop policy if exists own_payment_methods_select on public.payment_methods;
create policy own_payment_methods_select on public.payment_methods
  for select using (user_id = auth.uid());

drop policy if exists own_payment_methods_insert on public.payment_methods;
create policy own_payment_methods_insert on public.payment_methods
  for insert with check (user_id = auth.uid());

drop policy if exists own_payment_methods_update on public.payment_methods;
create policy own_payment_methods_update on public.payment_methods
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_payment_methods_delete on public.payment_methods;
create policy own_payment_methods_delete on public.payment_methods
  for delete using (user_id = auth.uid());

-- Referrals: user can read their own referral row (add insert if needed during signup)
drop policy if exists own_referrals_select on public.referrals;
create policy own_referrals_select on public.referrals
  for select using (user_id = auth.uid());

drop policy if exists own_referrals_insert on public.referrals;
create policy own_referrals_insert on public.referrals
  for insert with check (user_id = auth.uid());

