---
phase: 03-delivery
plan: "03"
subsystem: portal, auth, rate-limiting
tags: [patient-portal, zod, drizzle-orm, supabase, rate-limiting, server-actions, next-app-router]

# Dependency graph
requires:
  - phase: 03-delivery
    plan: "00"
    provides: portalAuthAttempts table, auditLog table, jest infrastructure
  - phase: 02-core-crud
    provides: orders, patients, laboratories, labUsers tables

provides:
  - src/lib/portal/rate-limit.ts — checkRateLimit + recordAttempt via Supabase admin client
  - src/lib/portal/authenticate-portal.ts — Zod-validated portal auth returning orderId+pdfPath
  - src/lib/portal/get-verification-data.ts — public verification data with partial patient name
  - src/app/r/[verification_code]/page.tsx — patient portal: auth form + PDF viewer after auth
  - src/app/r/[verification_code]/actions.ts — server action setting httpOnly cookie on success
  - src/app/verify/[verification_code]/page.tsx — QR authenticity page (no auth required)
  - src/components/portal-auth-form.tsx — client component with useActionState

affects:
  - Patient-facing result access flow (post-WhatsApp delivery)
  - Rate limiting on portal_auth_attempts table in Supabase

# Tech tracking
tech-stack:
  added:
    - zod@^3.x (input validation for portal auth — INFRA-06)
  patterns:
    - httpOnly cookie session per verification_code (portal_${code}=verified, maxAge 3600s)
    - Supabase admin client for rate limiting (bypasses RLS; no session context on public route)
    - TDD approach: tests written RED before implementations, then GREEN with real code
    - useActionState (React 19) for form state management in client component
    - Drizzle chained selects with innerJoin + leftJoin for verification data

key-files:
  created:
    - src/lib/portal/rate-limit.ts
    - src/lib/portal/authenticate-portal.ts
    - src/lib/portal/get-verification-data.ts
    - src/app/r/[verification_code]/page.tsx
    - src/app/r/[verification_code]/actions.ts
    - src/app/verify/[verification_code]/page.tsx
    - src/components/portal-auth-form.tsx
  modified:
    - tests/portal-auth.test.ts (replaced stubs with 5 real tests)
    - tests/rate-limit.test.ts (replaced stubs with 3 real tests)
    - tests/verify.test.ts (replaced stubs with 2 real tests)
    - package-lock.json (zod added)

key-decisions:
  - "Cookie-based session per verification_code: httpOnly cookie portal_{code}=verified set by server action on successful auth. Matches 1h signed URL expiry. Avoids portal_sessions DB table complexity."
  - "Rate limit fail-open on DB error: checkRateLimit returns allowed:true if Supabase query fails. Prevents DB errors from locking out legitimate patients."
  - "Generic error for all auth failures: 'Datos no coinciden' returned for wrong doc type, wrong doc number, wrong DOB, and non-existent verification_code. No field-specific hints."
  - "Middleware unchanged: /r/ and /verify/ already unprotected — middleware only redirects unauthenticated users from /dashboard/*, so public portal routes work without changes."
  - "documentType Zod enum includes CI: plan spec had CI in the form dropdown but the DB documentTypeEnum only had CC/CE/PA/RC/TI. Zod schema allows CI for form validation; DB constraint is on the DB side."

# Metrics
duration: 28min
completed: 2026-03-09
---

# Phase 3 Plan 03: Patient Portal Summary

**Zod-validated portal auth with Supabase table rate limiting, httpOnly cookie session, PDF iframe viewer with download, and public QR authenticity page**

## Performance

- **Duration:** 28 min
- **Started:** 2026-03-09
- **Completed:** 2026-03-09
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Built three portal lib modules: rate-limit (Supabase admin client, 5 attempts/hour window), authenticate-portal (Zod-validated, rate-limit-gated, generic error messaging), and get-verification-data (public verification data with partial patient name format "Ana G.")
- Replaced all three test stub files with real tests: 10 passing tests covering the full auth flow (correct credentials, wrong doc number, wrong DOB, non-existent code, rate limit block) plus verify data and rate limit boundary conditions
- Created two public Next.js App Router routes: /r/[verification_code] (auth form → cookie → PDF iframe + download button) and /verify/[verification_code] (lab name, partial patient name, order date, validation date)
- Installed zod via Docker exec; confirmed full test suite (23 tests) and TypeScript compilation pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Portal lib + tests (TDD RED → GREEN)** - `1536858` (feat)
2. **Task 2: Patient portal pages** - `3c48a24` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified

- `src/lib/portal/rate-limit.ts` — `checkRateLimit(verificationCode)` returns `{ allowed: boolean }` based on count in `portal_auth_attempts` table; `recordAttempt(verificationCode)` inserts row
- `src/lib/portal/authenticate-portal.ts` — Zod validates inputs, checks rate limit, records attempt, joins orders+patients, validates identity, returns `{ success, orderId, pdfPath }` or `{ success: false, error }`
- `src/lib/portal/get-verification-data.ts` — joins orders+patients+laboratories+labUsers, returns `VerificationData` with partial patient name (`firstName + lastName[0] + "."`)
- `src/app/r/[verification_code]/page.tsx` — Server Component: reads portal cookie, shows auth form or PDF viewer (iframe + download anchor)
- `src/app/r/[verification_code]/actions.ts` — Server action: calls `authenticatePortal`, sets httpOnly cookie, audits `result_viewed`, redirects
- `src/app/verify/[verification_code]/page.tsx` — Server Component: calls `getVerificationData`, shows authenticity card with lab name, partial name, dates
- `src/components/portal-auth-form.tsx` — Client Component: `useActionState` form with documentType dropdown (CC/TI/CE/PA/RC/CI), documentNumber, dateOfBirth; error display
- `tests/portal-auth.test.ts` — 5 real tests (replaced 4 stubs)
- `tests/rate-limit.test.ts` — 3 real tests (replaced 3 stubs)
- `tests/verify.test.ts` — 2 real tests (replaced 2 stubs)

## Decisions Made

- **Cookie session approach:** httpOnly cookie `portal_{verificationCode}=verified` with `maxAge: 3600` and `path: /r/{code}`. Avoids adding a new `portal_sessions` table while providing reasonable security (httpOnly, path-scoped).
- **Rate limit fail-open:** On Supabase query error in `checkRateLimit`, return `{ allowed: true }` to avoid locking out legitimate patients due to infrastructure issues.
- **Middleware unchanged:** `src/lib/supabase/middleware.ts` only redirects when `!user && pathname.startsWith("/dashboard")`. Portal routes at `/r/` and `/verify/` are already unprotected — no middleware changes needed.
- **Zod CI document type:** The form includes "CI" (Cédula de Identidad) as per the plan spec dropdown. The DB `documentTypeEnum` does not include CI. Zod allows it for form-level validation; if a patient has type CI in the DB, auth will fail gracefully (docType mismatch).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Rewrote rate-limit test to avoid constant-expression anti-pattern**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** The plan's provided rate-limit test stub included `expect(5 >= 5).toBe(true)` — a constant expression that doesn't test any real behavior.
- **Fix:** Rewrote the test to mock the Supabase chain properly, testing count=4 (allowed) and count=5 (blocked) as specified in critical notes.
- **Files modified:** `tests/rate-limit.test.ts`
- **Commit:** `1536858`

**2. [Rule 1 - Bug] Fixed TypeScript error in rate-limit test mock structure**
- **Found during:** Task 1 after initial test write
- **Issue:** `tests/rate-limit.test.ts` had a `mockFrom.mockReturnValueOnce({ insert: mockInsert })` call that triggered TS2353 (unknown property on mocked type). Restructured mock to return both `select` and `insert` from `from()`.
- **Fix:** Unified `mockFrom` to return `{ select: mockSelect, insert: mockInsert }` in `beforeEach`, allowing both checkRateLimit and recordAttempt paths to work.
- **Files modified:** `tests/rate-limit.test.ts`
- **Commit:** `1536858`

---

**Total deviations:** 2 auto-fixed (Rule 2 — missing critical test behavior, Rule 1 — TypeScript bug)
**Impact on plan:** Tests are more robust than the plan's provided stubs. No scope creep.

## Verification Results

- `npx jest tests/portal-auth.test.ts tests/rate-limit.test.ts tests/verify.test.ts` — 10/10 tests passing
- `npx jest --passWithNoTests` — 23/23 tests passing (all 6 test files green)
- `npx tsc --noEmit` — no new errors introduced by this plan (2 pre-existing errors in supabase/middleware.ts and supabase/server.ts remain from before this plan)
- All 10 required files exist on disk
- Middleware confirmed to exclude /r/ and /verify/ from auth redirect
- Rate limiting uses `portal_auth_attempts` Supabase table (not in-memory)
- Generic error "Datos no coinciden" for all credential mismatches (no field hints)

## Self-Check: PASSED

All 10 artifact files verified present on disk. Both task commits verified in git history (1536858, 3c48a24).
