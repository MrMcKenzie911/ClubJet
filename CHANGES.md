# Changelog

## 2025-09-26

- Admin Set Earnings Rate now mirrors monthly distribution by crediting proportional Slush for each affected account (no change to member interest credit).
- Admin KPI Monthly Profits now equals Commissions + Signup Fees for the current month, per CEO definition.
- Withdrawal protections enforced: lock-up window and LENDER pilot mode (< $5k) toasts and blocks.
- Initial deposit auto-sets lockup_end_date (NETWORK +6m, LENDER +12m).
- Admin Account Balances shows Admin, Slush, Jared, Ross, BNE (requires env IDs for those system owners).
- UI terminology: Variable/Fixed Memberships; Account Type; Earnings Management; landing “Why Choose Club Aureus”.
- Build verified: Next.js production build passes; lint warnings only.

All notable changes for Club Aureus app in this session.

## 2025-09-23

- MAJOR CHECKPOINT: Admin → User approvals, deposits, and withdrawals now update user KPIs/AUM immediately; downlines, charts, and verified users list are accurate and live-updating. Netlify build is green.
- Admin User Management:
  - Shows ALL users (admins, verified, pending, rejected)
  - Role filter (All/Admin/User/Rejected/Pending), approval badges, per-account Verified/Pending badges
  - Drawer actions (verify, set PIN, account update, referrer reassign) trigger instant list refresh and KPI revalidations
- Build: fixed lint/types in actions.ts, debug-env, and users/list; added strong types and removed any usage
- Prep for username feature (next): plan to add profiles.username (unique) with referral_code = username across flows, webhook payload, and admin UI

## 2025-09-21

- fix(build): Remove explicit `any` usages in PIN login route to satisfy ESLint and unblock Netlify build
- feat(referrals): Add Detailed Referral Tree launcher to admin dashboard; ensures downline modal works for the logged-in admin/user
- feat(charts): User chart now shows “Your Referrals Deposits” as second line (monthly); admin chart already shows referrals deposits
- fix(copy): Rename UI labels LENDER/NETWORK to Fixed/Variable Memberships across admin and user (no schema/route changes)
- feat(slush): Enforce 50% of signup fee to Slush Fund across tiers; credit slush on first approved deposit < $5k
- ux/kpi: AUM card shows “Increase this month”; KPIs revalidate after admin actions (deposits/withdrawals/rate set)

- fix(login): Enforce admin-approved login via server route; abort client login on non-OK to prevent bypass
- fix(login): Auto-sync Supabase Auth password to stored PIN on approved login to avoid mismatches and guarantee sign-in
- fix(ssr-session): Ensure server cookies are set during login so admin/user dashboards load correct KPIs/AUM on first render

## 2025-09-20

- fix(kpi): Monthly Profits and KPIs now compute from live transactions; user KPIs revalidate after admin actions
- feat(admin-chart): Rewrite Total AUM chart to follow transaction history (deposits/interest/withdrawals), add second line for your referrals’ monthly deposit amount
- feat(user-chart): Show Portfolio Balance vs Referral Payout (monthly) instead of New Signups
- copy: Change 'Trending this month' to 'Increase this month' on AUM card
- branding: Rename Network/Lender in UI to Variable Memberships / Fixed Memberships (no route or schema changes)
- feat(slush): On first approved deposit < $5k, record signup fee breakdown and credit slush fund (signup_fees + slush_fund_transactions)

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
