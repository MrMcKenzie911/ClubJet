# Changelog

All notable changes for Club Aureus app in this session.

## 2025-09-09

- style(admin): Match user dashboard container look (rounded, dark card stack) without changing admin names/tabs
- feat(admin): Add Quick Invite (same component as user) using admin's referral code
- feat(admin): Keep Verified Users list at the very top of the main admin dashboard container
- polish(admin): Unify card borders/backgrounds to the same palette as user dashboard; keep all existing admin actions intact

## 2025-09-08

- chore(build): Sweep unused warnings; remove `any` types; fix `InvitePanel` props; wrap admin sidebar in `Suspense` to avoid prerender CSR bailout
- chore(build): Clean dashboard page lint errors; type transactions and table rows; remove unused server actions
- feat(admin): Add overview stat cards on admin dashboard (Pending Users/Deposits/Withdrawals/Accounts, Current Earnings %) while keeping Verified Users at top
- feat(ui): Polish dashboards (typography, labels, helper texts); refine chart footer note; modernize admin actions styling
- feat(dashboard): Add Month Progress (30-day progress bar with 1.5% target note) and re-enable Invite Panel with referral code

Notes:

- Verified Users list includes working edit and delete icons
- Admin sidebar links act as tabs (filtered views for queues and settings)
- User dashboard is a single large container with inner components (KPIs, chart, quick actions, forms)
- Build is clean and compiles successfully

## 2025-09-17

- chore(repo): Fully remove duplicate `clubjet-app/` app (legacy scaffold, node_modules, assets) to reduce size and speed up TS/IDE
- chore(scripts): Repoint scripts off `clubjet-app` paths
  - seed-from-dataset.ps1 now reads `scripts/seed-clubjet-payload.json`
  - seed-direct.mjs now defaults to `scripts/seed-clubjet-payload.json`, uses `.env.local` at root or process env, and supports either `{clients:[]}` or `{records:[]}` formats
  - run-migration-003.ps1 now reads SQL from `supabase/legacy_migrations/003_add_missing_columns_and_backfill.sql` and env from root `.env.local`
- chore(db): Preserve the 003 backfill SQL in `supabase/legacy_migrations/` for safe replay; no functional change to app runtime

Notes:

- No changes to active app under `src/`.
- Netlify builds from root remain unchanged; removing `clubjet-app` eliminates duplicate Next.js app and local node_modules.
