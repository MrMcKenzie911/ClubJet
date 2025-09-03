-- Add a verification timestamp to accounts to allow simple pending->verified flow
alter table if exists public.accounts
  add column if not exists verified_at timestamptz;

-- Optional helpful index
create index if not exists idx_accounts_verified_at on public.accounts(verified_at);

