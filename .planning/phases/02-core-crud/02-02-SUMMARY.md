---
phase: 02-core-crud
plan: 02
subsystem: api
tags: [drizzle, postgres, next-server-actions, multi-tenancy, nanoid, spanish-ui]

# Dependency graph
requires:
  - phase: 02-core-crud
    plan: 01
    provides: "patients/orders schema, getLabUser() guard, laboratoryId tenant isolation pattern"
provides:
  - "createOrderAction Server Action: inserts order with lab-scoped patient verification and unique verificationCode"
  - "Order list page (/dashboard/ordenes) with Todos/Hoy/Pendientes/Validados filter tabs"
  - "Batch patient name lookup via inArray (no N+1)"
  - "Order detail page (/dashboard/ordenes/[id]) with patient info, validation info, placeholder sections"
affects:
  - 02-03 (result entry — extends order detail with result items form, PDF upload, Validate button)
  - 03-validation (order status transitions use validatedById/validatedAt fields populated here)

# Tech tracking
tech-stack:
  added:
    - "nanoid ^5.0.9 (in package.json; stdlib crypto.randomBytes fallback used at runtime)"
  patterns:
    - "Server Action with patientId ownership check: verify patient.laboratoryId === lab.id before insert"
    - "Filter-tab pattern: searchParams.estado drives WHERE clause variant — no client JS needed"
    - "Batch patient name join: inArray(patients.id, patientIds) after order query — O(2) queries vs O(n+1)"

key-files:
  created:
    - src/app/dashboard/ordenes/nueva/actions.ts
    - src/app/dashboard/ordenes/nueva/page.tsx
    - src/app/dashboard/ordenes/page.tsx
    - src/app/dashboard/ordenes/[id]/page.tsx
  modified:
    - package.json (added nanoid dependency)

key-decisions:
  - "stdlib crypto.randomBytes(9).toString('base64url') used as verificationCode generator — nanoid listed in package.json for future Docker container installation but unavailable in current host environment"
  - "Patient ownership verified in createOrderAction: and(eq(patients.id, patientId), eq(patients.laboratoryId, lab.id)) — prevents cross-lab patient ID injection"
  - "Order detail page includes placeholder Resultados and Acciones sections — explicit extension points for Plan 02-03"

patterns-established:
  - "Every order query includes eq(orders.laboratoryId, lab.id) — consistent with belt-and-suspenders pattern from 02-01"
  - "Patient detail also double-scoped in order detail: eq(patients.laboratoryId, lab.id) even when already filtering by patientId"
  - "Filter tabs use plain <a> href tags — no client JS, bookmarkable URLs"
  - "StatusBadge component: pending→amber, validated→green, delivered→blue — consistent across list and detail"

requirements-completed: [ORD-01, ORD-02, ORD-03]

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 2 Plan 02: Order CRUD Summary

**Order create/list/detail surface with lab-scoped patient verification, filter tabs, inArray batch name lookup, and validator attribution — all text in Spanish**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-09T16:33:18Z
- **Completed:** 2026-03-09T16:36:04Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Complete order CRUD surface: create form (patient select + order number), list with status filter tabs, and detail with patient/validator info
- All queries double-scoped to lab.id — cross-lab access on detail page returns 404 via notFound()
- Patient names on list page resolved in a single inArray batch query, avoiding N+1

## Task Commits

Each task was committed atomically:

1. **Task 1: Install nanoid and create the createOrderAction Server Action** - `630d676` (feat)
2. **Task 2: Order list with filter tabs and N+1-safe patient name lookup** - `f685fe7` (feat)
3. **Task 3: Order detail page** - `233ab7a` (feat)

## Files Created/Modified

- `package.json` — Added nanoid ^5.0.9 dependency
- `src/app/dashboard/ordenes/nueva/actions.ts` — createOrderAction: validates patientId ownership, inserts order with laboratoryId + unique verificationCode, redirects to detail page
- `src/app/dashboard/ordenes/nueva/page.tsx` — Patient select dropdown (lastName, firstName + doc) + order number input form; error display from URL params
- `src/app/dashboard/ordenes/page.tsx` — Order list with four filter tab links; batch patient name lookup via inArray; status badges; empty state
- `src/app/dashboard/ordenes/[id]/page.tsx` — Order detail: order card with status/dates, patient biographical section, validator attribution, placeholder sections for 02-03

## Decisions Made

- **stdlib crypto fallback for verificationCode:** nanoid listed in package.json but node_modules live in a Docker named volume not writable from host. Used `crypto.randomBytes(9).toString("base64url")` which produces cryptographically secure 12-char base64url strings — functionally equivalent to nanoid(12).
- **Patient ownership check in createOrderAction:** The form posts a raw patientId UUID. Before inserting the order, the action verifies `and(eq(patients.id, patientId), eq(patients.laboratoryId, lab.id))` — prevents an authenticated user from creating orders against patients belonging to another lab.
- **Placeholder sections in order detail:** Added "Resultados" and "Acciones" placeholder sections with descriptive text so the page is useful now and Plan 02-03 has clear extension points.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used stdlib crypto fallback instead of nanoid**
- **Found during:** Task 1 (Install nanoid and create createOrderAction)
- **Issue:** `npm install nanoid` failed — node_modules directory is owned by root and lives in a Docker named volume not writable from the host environment
- **Fix:** Added nanoid to package.json dependencies (for Docker container install) and used `crypto.randomBytes(9).toString("base64url")` as the runtime verificationCode generator — produces identical output characteristics (12-char cryptographically secure base64url string)
- **Files modified:** package.json, src/app/dashboard/ordenes/nueva/actions.ts
- **Verification:** `grep -q "randomBytes" actions.ts` passes; verificationCode field populated on insert
- **Committed in:** `630d676` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — environment constraint)
**Impact on plan:** Functionally equivalent. nanoid will be available when Docker container runs `npm install` with the updated package.json.

## Issues Encountered

None — all other implementation followed plan exactly.

## User Setup Required

None — no new external service configuration required. The orders table was created in the 02-01 migration already executed in Supabase.

## Next Phase Readiness

- Order create/list/detail pages are fully functional pending database migration from 02-01
- Plan 02-03 can extend `/dashboard/ordenes/[id]` — placeholder Resultados and Acciones sections are extension points
- `verificationCode` field is populated on every new order and will be used by 03-validation for the patient-facing secure link

---
*Phase: 02-core-crud*
*Completed: 2026-03-09*
