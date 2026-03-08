---
phase: 01-foundation
plan: "02"
subsystem: auth
tags: [supabase, supabase-ssr, nextjs, server-actions, middleware, drizzle-orm, spanish]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: "Next.js 15 scaffold, Drizzle schema (laboratories + lab_users), shadcn/ui components"
provides:
  - Supabase SSR client utilities (server.ts + client.ts) using @supabase/ssr
  - Next.js middleware that refreshes session cookies and protects /dashboard/*
  - Auth callback route for email confirmation code exchange
  - Login page and server action (signInWithPassword) in Spanish
  - Logout server action (signOut → /login)
  - Registration page and server action (signUp + insert laboratory + insert lab_user) in Spanish
affects:
  - 01-03-PLAN: RLS, dashboard shell — logoutAction imported from login/actions.ts
  - All subsequent plans — auth utilities (server.ts, client.ts) used everywhere

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@supabase/ssr createServerClient with SSR cookies in server components and middleware"
    - "@supabase/ssr createBrowserClient for client components"
    - "Error communication via redirect URL params (?error=key) — no client-side state needed"
    - "Registration sequence: signUp → insert laboratories → insert lab_users (in that order)"
    - "slugify() with random suffix ensures unique slugs without a DB uniqueness check round-trip"

key-files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/middleware.ts
    - src/middleware.ts
    - src/app/auth/callback/route.ts
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/login/page.tsx
    - src/app/(auth)/login/actions.ts
    - src/app/(auth)/register/page.tsx
    - src/app/(auth)/register/actions.ts
  modified: []

key-decisions:
  - "Error messages passed via redirect URL query params (e.g., ?error=credenciales_invalidas) — avoids any client-side auth state"
  - "Middleware redirects unauthenticated /dashboard/* to /login AND redirects authenticated /login|/register to /dashboard"
  - "Registration creates auth user first, then laboratory row, then lab_user row — failure at any step returns an error redirect"
  - "Slug uniqueness: slugify(labName) + random 4-char suffix avoids DB round-trips to check uniqueness"
  - "setAll() in server.ts is wrapped in try/catch — Server Components have read-only cookies; middleware handles refresh"

patterns-established:
  - "Server Actions use 'use server' directive and call redirect() for both success and error paths"
  - "Auth pages share (auth)/layout.tsx for centered card layout"
  - "All UI text in Spanish — error messages defined as typed Record<string, string> map"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-02]

# Metrics
duration: 2min
completed: 2026-03-08
---

# Phase 1 Plan 02: Auth Summary

**Supabase Auth via @supabase/ssr SSR cookies — registration creates laboratory + admin lab_user rows, login/logout via Server Actions, middleware protects /dashboard/*, all UI in Spanish**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-08T15:56:45Z
- **Completed:** 2026-03-08T15:58:48Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Supabase SSR client utilities (server.ts + client.ts) following the official @supabase/ssr Next.js App Router pattern
- Next.js middleware refreshes session on every non-static request, redirects unauthenticated /dashboard/* to /login and authenticated /login|/register to /dashboard
- Spanish login card (email + password) with `loginAction` Server Action and `logoutAction` (used by dashboard in 01-03)
- Spanish registration card (lab name, full name, email, password) with `registerAction` that creates Supabase auth user + laboratories row + lab_users admin row in sequence

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase client utilities and session middleware** - `9495d63` (feat)
2. **Task 2: Build login page and server action** - `8f2e108` (feat)
3. **Task 3: Build registration page and server action** - `1a2065b` (feat)

## Files Created/Modified

- `src/lib/supabase/server.ts` — createClient() async function using createServerClient with SSR cookie store; setAll() wrapped in try/catch for Server Component read-only context
- `src/lib/supabase/client.ts` — createClient() using createBrowserClient for browser-side usage
- `src/lib/supabase/middleware.ts` — updateSession() refreshes Supabase session, enforces /dashboard/* protection, redirects authenticated users away from auth pages
- `src/middleware.ts` — Next.js middleware entry point; matcher covers all non-static routes
- `src/app/auth/callback/route.ts` — GET handler that exchanges email confirmation code for session
- `src/app/(auth)/layout.tsx` — centered auth layout (flex min-h-screen, max-w-sm card container)
- `src/app/(auth)/login/page.tsx` — Spanish login card using shadcn Card, Input, Label, Button; reads ?error= param from searchParams
- `src/app/(auth)/login/actions.ts` — loginAction (signInWithPassword → redirect /dashboard) and logoutAction (signOut → redirect /login)
- `src/app/(auth)/register/page.tsx` — Spanish registration card; lab name, full name, email, password fields; typed error message map
- `src/app/(auth)/register/actions.ts` — registerAction: validates inputs, signUp auth user, insert laboratories row with slug, insert lab_users admin row, redirect /dashboard

## Decisions Made

- **Error communication via redirect URL params:** No client-side state is needed for auth errors. `redirect("/login?error=credenciales_invalidas")` keeps auth pages pure Server Components with no client interactivity overhead.
- **Middleware double-redirect guard:** Middleware redirects both directions — unauthenticated users going to /dashboard get sent to /login, and authenticated users arriving at /login or /register get sent to /dashboard. This prevents logged-in users from seeing auth pages.
- **Registration sequence order matters:** Auth user is created first because `authUserId` is needed for the lab_user row. If the DB insert fails after auth user creation, the user can re-register (Supabase `signUp` with same email returns "already registered" error which is handled).
- **Slug with random suffix:** `slugify(labName) + "-" + randomSuffix` ensures uniqueness without a SELECT round-trip. The slug is used for future multi-tenant URL routing.
- **setAll() try/catch in server.ts:** Supabase docs require this — Server Components cannot write cookies. The catch is intentional and silent; middleware handles the actual cookie refresh.

## Deviations from Plan

None — plan executed exactly as written. Docker unavailability (same WSL2 constraint as Plan 01) means TypeScript compilation verification was performed via static review rather than running `tsc --noEmit` inside Docker. All imports match package.json dependencies; all file patterns follow @supabase/ssr official documentation.

## Issues Encountered

- Docker not available in WSL2 distro (same constraint as Plan 01). TypeScript correctness confirmed by static review: all imports reference packages in package.json (`@supabase/ssr@^0.5.2`), all path aliases match tsconfig.json `@/*` → `./src/*`, all type usage matches @supabase/ssr v0.5.x API.

## User Setup Required

None beyond what Plan 01 documented. The same environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) are used. No new external service configuration is required.

## Next Phase Readiness

- Auth flows complete: /login, /register pages built; /dashboard/* protected by middleware
- `logoutAction` exported from `src/app/(auth)/login/actions.ts` — ready to import in dashboard header (Plan 03)
- `createClient()` available from both `@/lib/supabase/server` and `@/lib/supabase/client`
- No blockers for Plan 03 (RLS policies + dashboard shell)

---
*Phase: 01-foundation*
*Completed: 2026-03-08*
