## Club Aureus Master Plan

Goal: Deliver a rock‑solid, zero‑friction login/approval flow and accurate KPIs/AUM for both Admin and User dashboards with 100% reliability.

### 2025-09-23 — Major Checkpoint

- Status: Core flows stable and production-ready. Admin approvals and financial actions (deposits/withdrawals/commissions finalize) reflect instantly in user KPIs/AUM. Admin User Management lists all users with live-refresh and status badges.
- Next Major Enhancement: Add username platform-wide (profiles.username UNIQUE), enforce referral_code = username, expose in signup modal and admin edit drawer, include in n8n webhook, and allow reassign/update with uniqueness checks. Verify that username drives consistent referral lookups and does not regress login/approval.

Scope (phase now):

- Authenticate: New and existing users (including admins) can always log in once approved; pending users are reliably blocked.
- Data integrity: AUM and KPI cards/charts always reflect the correct balances and transactions per user role.
- UX: Clear errors and seamless redirect after login; no blank states for approved accounts.

Today’s Fixes (summary):

- Hardened server login: PIN login enforces approval and self‑heals Supabase password to the stored PIN before signing in.
- Client gating: Abort client fallback login on any server error; prevents pending users from bypassing approval.
- SSR session reliability: Ensure server cookies are set at login so dashboards render with correct data immediately.

Verification Plan:

1. Admin login smoke test

   - Given: admin account exists in Supabase; profile role=admin
   - When: login with email + PIN
   - Then: server resets auth password to PIN (if mismatched), sets session, redirects to /admin; KPIs and AUM load with verified balances.

2. New user approval + login

   - Given: user signs up (role=pending, approval_status=pending)
   - When: user tries to login
   - Then: blocked with clear message “Account pending approval”.
   - When: admin approves (role→user and/or approval_status→approved)
   - Then: user logs in successfully; redirected to /dashboard; AUM shows sum(accounts.balance), chart/targets render.

3. KPI/AUM correctness
   - Verify user: totalAUM = sum of user accounts.balance; monthly profits/commission computed from posted transactions.
   - Verify admin: totalAUM = sum of verified accounts balances across all users; monthly metrics reflect current month tx.

Next Steps (if needed):

- Add end‑to‑end test stubs (Playwright) for login/redirect and KPI visibility (requires env and CI secrets).
- Add admin tool to reset a user’s PIN/password safely via server route.
- Add telemetry for login errors to spot regressions quickly.
