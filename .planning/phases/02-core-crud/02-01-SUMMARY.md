---
phase: 02-core-crud
plan: 01
subsystem: database
tags: [drizzle, postgres, supabase, rls, multi-tenancy, next-server-actions]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Drizzle db client, getLabUser() auth guard, laboratories/labUsers schema, dashboard layout"
provides:
  - "patients, orders, orderItems Drizzle table definitions with inferred TypeScript types"
  - "documentTypeEnum, orderStatusEnum, resultFlagEnum Postgres enums"
  - "SQL migration with RLS policies and indexes for Supabase Dashboard"
  - "Patient list page (/dashboard/pacientes) with GET search by name/document"
  - "Patient create form (/dashboard/pacientes/nuevo) and createPatientAction server action"
  - "Patient detail page (/dashboard/pacientes/[id]) with order history, 404 on cross-lab access"
affects:
  - 02-02 (orders CRUD — uses orders/orderItems schema and patients list)
  - 02-03 (result entry — uses orderItems table)
  - 03-validation (order status transitions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "laboratoryId WHERE-clause tenant isolation on every Drizzle query (Transaction mode pooler, no RLS enforcement)"
    - "GET form with ?q= search param for no-JS patient search"
    - "Server Action with redirect-based error reporting via URL params"

key-files:
  created:
    - src/lib/db/schema.ts (patients/orders/orderItems tables + enums)
    - drizzle/migrations/0001_patients_orders.sql
    - src/app/dashboard/pacientes/page.tsx
    - src/app/dashboard/pacientes/nuevo/page.tsx
    - src/app/dashboard/pacientes/nuevo/actions.ts
    - src/app/dashboard/pacientes/[id]/page.tsx
  modified:
    - src/lib/db/schema.ts (appended new tables to existing schema)

key-decisions:
  - "drizzle/ directory is gitignored — migration file force-added with git add -f to preserve the SQL artifact alongside the codebase"
  - "Tenant isolation enforced via explicit laboratoryId WHERE clause in every query (not RLS), consistent with Transaction mode pooler pattern from Phase 1"
  - "Date of birth stored as ISO text (YYYY-MM-DD) not date type, formatted at render time with toLocaleDateString('es-CO')"

patterns-established:
  - "Every patient query: eq(patients.laboratoryId, lab.id) — applied to both list and detail pages"
  - "Every order query: eq(orders.laboratoryId, lab.id) — even when already filtering by patientId"
  - "notFound() on patient fetch miss prevents cross-lab data access via ID guessing"
  - "GET search form (not POST) for bookmarkable, shareable search URLs"

requirements-completed: [PAT-01, PAT-02, PAT-03, PAT-04]

# Metrics
duration: 4min
completed: 2026-03-09
---

# Phase 2 Plan 01: Patients Schema and CRUD Summary

**Drizzle schema extended with patients/orders/orderItems tables, SQL migration with RLS, and full patient CRUD surface (searchable list, create form, detail with order history) scoped by laboratoryId**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-09T16:26:19Z
- **Completed:** 2026-03-09T16:30:31Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Three new Drizzle tables (patients, orders, orderItems) with FK relationships, enum types, and exported TypeScript types
- SQL migration file ready for Supabase Dashboard SQL Editor with RLS policies and five indexes
- Complete patient CRUD surface: searchable list, create form with server action, and detail page with order history — all text in Spanish

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Drizzle schema with patients, orders, and order_items** - `7321988` (feat)
2. **Task 2: Patient list page with search and create patient Server Action** - `d3fcfcb` (feat)
3. **Task 3: Patient detail page with order history** - `cf1be10` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` — Appended three table definitions, three enums, and six exported types to existing schema
- `drizzle/migrations/0001_patients_orders.sql` — Raw SQL for Supabase Dashboard: CREATE TYPE, CREATE TABLE, ALTER TABLE...ENABLE ROW LEVEL SECURITY, CREATE POLICY, CREATE INDEX
- `src/app/dashboard/pacientes/page.tsx` — Patient list with GET search form; ilike search on firstName/lastName/documentNumber; scoped to lab.id; limit 50 with desc ordering
- `src/app/dashboard/pacientes/nuevo/page.tsx` — Create form with select for document type (CC/CE/PA/RC/TI with Spanish labels), required fields, optional phone, error display from URL params
- `src/app/dashboard/pacientes/nuevo/actions.ts` — createPatientAction: validates all fields, inserts with laboratoryId, redirects to list on success or back with error param
- `src/app/dashboard/pacientes/[id]/page.tsx` — Patient detail with biographical card and order history table; both patient and orders queries double-scoped to lab.id; notFound() on miss

## Decisions Made

- **Migration in gitignored drizzle/ directory:** The `.gitignore` has `drizzle/` — used `git add -f` to force-add the migration SQL since it's a required artifact that should live in the repo alongside the schema.
- **Double-scope on orders query:** Even when fetching orders by patientId (which already implies a lab), the query also includes `eq(orders.laboratoryId, lab.id)` — belt-and-suspenders isolation consistent with the security model.
- **ISO text for dateOfBirth:** Stored as TEXT not DATE to avoid timezone ambiguity when displaying; formatted at render time with `toLocaleDateString("es-CO")`.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in `src/lib/supabase/middleware.ts` and `src/lib/supabase/server.ts` (implicit `any` on cookie handler parameters) existed before this plan and are out-of-scope. No new TypeScript errors introduced. Logged in deferred-items.

## User Setup Required

The SQL migration at `drizzle/migrations/0001_patients_orders.sql` must be executed in the **Supabase Dashboard > SQL Editor** before these routes can serve real data.

Steps:
1. Open Supabase Dashboard for this project
2. Navigate to SQL Editor
3. Paste and run the contents of `drizzle/migrations/0001_patients_orders.sql`

## Next Phase Readiness

- Full patient data model is in place; orders CRUD (02-02) can reference `patients` and `orders` tables immediately
- Result entry (02-03) can reference `orderItems` table
- The `/dashboard/ordenes/[id]` links in the patient detail page are placeholder routes until 02-02 creates them

---
*Phase: 02-core-crud*
*Completed: 2026-03-09*
