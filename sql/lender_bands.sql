-- LENDER fixed bands configuration
-- Run this once in Supabase SQL Editor

create table if not exists public.lender_bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,                      -- e.g., "1.00%", "1 1/8", "1.25%"
  min_amount numeric not null default 0,   -- inclusive
  max_amount numeric not null default 0,   -- inclusive; use very large number for top band
  rate_percent numeric not null,          -- 1.00, 1.125, 1.25
  duration_months integer not null default 12,
  created_at timestamptz not null default now()
);

alter table if exists public.lender_bands enable row level security;

-- Admins manage bands
drop policy if exists "admins manage lender bands" on public.lender_bands;
create policy "admins manage lender bands"
  on public.lender_bands for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

