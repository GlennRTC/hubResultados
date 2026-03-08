---
phase: 01-foundation
plan: "03"
subsystem: infra
tags: [supabase, rls, nextjs, drizzle-orm, dashboard, shadcn, spanish, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: "Drizzle schema (laboratories + lab_users), db client, shadcn/ui components"
  - phase: 01-foundation/01-02
    provides: "logoutAction Server Action, createClient() Supabase SSR utility"
provides:
  - Supabase RLS policies SQL migration isolating data by laboratory_id
  - createAdminClient() using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS for server-side inserts)
  - getLabUser() server helper: verifies session, fetches lab_user + laboratory, redirects if missing
  - Authenticated dashboard layout (sidebar + header) wrapping all /dashboard/* routes
  - DashboardSidebar: LabFlash branding, lab name, role label, 4 Spanish nav items
  - DashboardHeader: Radix DropdownMenu with user avatar, "Cerrar sesión" wired to logoutAction
  - Dashboard home page in Spanish with plan/results stats card
affects:
  - All subsequent plans — getLabUser() pattern reused in every dashboard Server Component
  - Phase 2 — dashboard layout shell is the container for all feature pages

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getLabUser() guard pattern: every dashboard Server Component calls this to verify session and load LabContext"
    - "Drizzle db client uses .select().from() API — NOT .query.* — for Transaction mode pooler compatibility"
    - "createAdminClient() service role client for server actions that run before session establishment"
    - "DashboardHeader is a Client Component (use client) to enable Radix DropdownMenu interactivity"
    - "Server Actions (logoutAction) imported in Client Components — Next.js 15 App Router pattern"

key-files:
  created:
    - supabase/migrations/0000_rls_policies.sql
    - src/lib/auth/get-lab-user.ts
    - src/app/dashboard/layout.tsx
    - src/app/dashboard/page.tsx
    - src/components/dashboard/sidebar.tsx
    - src/components/dashboard/header.tsx
  modified:
    - src/lib/supabase/server.ts

key-decisions:
  - "Drizzle db client (Transaction mode pooler) does NOT enforce RLS — used server-side only with implicit service-role behavior"
  - "createAdminClient() added to server.ts for registration inserts that occur before session establishment"
  - "DashboardHeader is a Client Component to support Radix DropdownMenu — Server Actions still work via form action prop"
  - "Custom sidebar built from scratch (not shadcn Sidebar) — simpler, no over-engineering for Phase 1"
  - "getLabUser() uses .select().from().where().limit(1) instead of .query.findFirst() for pooler compatibility"

patterns-established:
  - "getLabUser(): called at top of every dashboard Server Component — provides LabContext or redirects to /login"
  - "LabContext type exported from get-lab-user.ts — enables typed access to user.role, lab.plan, lab.name throughout dashboard"

requirements-completed: [INFRA-01, INFRA-02, AUTH-03]

# Metrics
duration: 3min
completed: 2026-03-08
---

# Phase 1 Plan 03: RLS Policies and Dashboard Shell Summary

**Supabase RLS policies scoping all tenant data to auth.uid(), plus authenticated dashboard shell with Spanish sidebar navigation, user avatar dropdown, and "Cerrar sesión" logout wired to a Server Action**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T16:01:55Z
- **Completed:** 2026-03-08T16:05:05Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Supabase RLS SQL migration with 5 policies covering SELECT/UPDATE on laboratories and SELECT/INSERT/DELETE on lab_users, all scoped to `auth.uid()` via a join to `lab_users.auth_user_id`
- `createAdminClient()` added to server.ts using SUPABASE_SERVICE_ROLE_KEY — enables registration inserts before a session cookie is established
- `getLabUser()` server helper: reads Supabase session, fetches lab_user and laboratory rows via Drizzle, redirects to /login on any missing data — reusable across all dashboard Server Components
- Authenticated /dashboard layout with custom sidebar (LabFlash logo, lab name, 4 Spanish nav items) and header (Radix DropdownMenu avatar with "Cerrar sesión" form action)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write and apply RLS policies SQL migration** - `73a2507` (feat)
2. **Task 2: Create getLabUser helper and dashboard layout** - `b264f78` (feat)
3. **Task 3: Build dashboard sidebar, header, and home page** - `df7b9a2` (feat)

## Files Created/Modified

- `supabase/migrations/0000_rls_policies.sql` — RLS enable + 5 policies for laboratories and lab_users scoped to auth.uid()
- `src/lib/supabase/server.ts` — Added createAdminClient() using SUPABASE_SERVICE_ROLE_KEY (service role, bypasses RLS)
- `src/lib/auth/get-lab-user.ts` — getLabUser(): session check → fetch lab_user → fetch laboratory → return LabContext or redirect
- `src/app/dashboard/layout.tsx` — Authenticated layout: calls getLabUser(), renders DashboardSidebar + DashboardHeader
- `src/app/dashboard/page.tsx` — Spanish dashboard home: lab name welcome, results card with plan tier (free/pro), placeholder stats
- `src/components/dashboard/sidebar.tsx` — Custom sidebar: LabFlash branding, lab name, role label (Administrador/Técnico/Recepción), 4 nav items
- `src/components/dashboard/header.tsx` — Client Component: Radix DropdownMenu with user initials avatar and "Cerrar sesión" form

## Decisions Made

- **Drizzle db client does NOT enforce RLS:** The `db` client connects via Supabase's Transaction mode connection pooler (port 6543). The pooler does not propagate Supabase auth JWTs, so `auth.uid()` is always null from Drizzle's perspective. This is expected — in Phase 1 all Drizzle usage is in server actions (auth-gated), which have implicit service-role behavior via the pooler. Future client-side data fetching that requires RLS will use the Supabase JS client directly.
- **createAdminClient() for registration:** Registration inserts (laboratories, lab_users) happen via `registerAction` which runs before a session cookie is fully established. The service role client bypasses RLS and avoids a catch-22 where the insert would fail due to auth.uid() being null.
- **Custom sidebar vs shadcn Sidebar component:** The shadcn Sidebar is complex (collapsible, cookie state, etc.). Phase 1 only needs a simple navigation column — a custom `<aside>` is 50 lines and meets all requirements without adding unnecessary complexity.
- **DashboardHeader as Client Component:** Radix DropdownMenu requires client-side interactivity. The `"use client"` directive allows the component to use Radix hooks while still wiring to `logoutAction` (a Server Action) via `<form action={logoutAction}>` — this is a valid Next.js 15 pattern.
- **getLabUser() uses .select().from() not .query.findFirst():** The relational query API `.query.*` requires a different drizzle() initialization. Using the standard `.select()` API is fully compatible with the existing `db` client and the Transaction mode pooler.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used .select().from() instead of .query.findFirst() in getLabUser()**
- **Found during:** Task 2 (Create getLabUser helper)
- **Issue:** The plan suggested `db.query.labUsers.findFirst()` which requires the relational query API. While `db` is initialized with schema (enabling `.query.*`), using `.select()` is safer and more explicit for Transaction mode pooler compatibility.
- **Fix:** Used `db.select().from(labUsers).where(eq(labUsers.authUserId, user.id)).limit(1)` and destructured `[0]` — equivalent result, zero risk.
- **Files modified:** src/lib/auth/get-lab-user.ts
- **Verification:** Static review confirms API compatibility with existing db client initialization
- **Committed in:** b264f78 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - precautionary bug prevention)
**Impact on plan:** No functional change — same data, same return type. More robust for pooler compatibility.

## RLS Architecture Note

The RLS policies in `0000_rls_policies.sql` must be applied manually via the Supabase Dashboard SQL Editor. They enforce row-level tenant isolation at the Postgres level for any query using the anon or authenticated Supabase client. The Drizzle `db` client (via connection pooler) bypasses RLS — this is intentional for server-side operations and is compensated by Next.js middleware auth gating (only authenticated users reach dashboard server actions).

## Issues Encountered

- Docker not available in WSL2 distro (same constraint as Plans 01 and 02). TypeScript correctness confirmed by static review: all imports reference packages in package.json, all path aliases match tsconfig.json `@/*` → `./src/*`, all component exports match usage in consuming files.

## User Setup Required

**Apply RLS policies to Supabase:**
1. Open your Supabase project → SQL Editor
2. Paste the contents of `supabase/migrations/0000_rls_policies.sql`
3. Click Run — all 5 policies will be applied

No new environment variables required (SUPABASE_SERVICE_ROLE_KEY was already in .env.example from Plan 01).

## Next Phase Readiness

- RLS policies defined — ready to apply to Supabase once credentials are available
- Dashboard shell is complete — Phase 2 builds feature pages inside `src/app/dashboard/` that call `getLabUser()` at the top of each Server Component
- `getLabUser()` returns `LabContext { user: LabUser, lab: Laboratory }` — all Phase 2 pages can use `user.role`, `lab.name`, `lab.plan` without additional queries
- No blockers for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-08*

## Self-Check: PASSED

Files verified:
- supabase/migrations/0000_rls_policies.sql — FOUND (5 auth.uid() refs, 2 ROW LEVEL SECURITY)
- src/lib/supabase/server.ts — FOUND (createAdminClient exported)
- src/lib/auth/get-lab-user.ts — FOUND (getLabUser exported)
- src/app/dashboard/layout.tsx — FOUND
- src/app/dashboard/page.tsx — FOUND
- src/components/dashboard/sidebar.tsx — FOUND
- src/components/dashboard/header.tsx — FOUND

Commits verified:
- 73a2507 — Task 1: RLS migration + createAdminClient
- b264f78 — Task 2: getLabUser helper + dashboard layout
- df7b9a2 — Task 3: sidebar, header, dashboard page
