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
