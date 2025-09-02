-- Enable RLS on accounts and investment_tiers, and allow admins full manage privileges.

-- ACCOUNTS
alter table if exists public.accounts enable row level security;

-- Select: owners can view their own accounts (adjust owner column if different)
create policy if not exists "owners can select accounts"
  on public.accounts for select
  using (user_id = auth.uid());

-- Admins can update balances and manage accounts
create policy if not exists "admins can update accounts"
  on public.accounts for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (true);

-- INVESTMENT_TIERS
alter table if exists public.investment_tiers enable row level security;

-- Admins manage tiers
create policy if not exists "admins manage tiers"
  on public.investment_tiers for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

