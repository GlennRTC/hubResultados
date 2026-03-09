---
phase: 02-core-crud
plan: 03
subsystem: api
tags: [server-actions, drizzle, react, next.js, file-upload, form]

# Dependency graph
requires:
  - phase: 02-core-crud/02-01
    provides: patients schema, getLabUser guard, patient CRUD Server Actions
  - phase: 02-core-crud/02-02
    provides: orders schema (status, pdfPath, validatedById, validatedAt), orderItems schema, order detail page with placeholder sections
provides:
  - addResultItemAction — inserts a result item after requirePendingOrder status guard
  - uploadPdfAction — validates file.type server-side, stores filename placeholder
  - validateOrderAction — sets status=validated, records validatedById/validatedAt
  - ResultItemsForm Client Component with useRef form reset
  - PdfUpload Client Component with HTML5 drag-and-drop and click-to-select fallback
  - Order detail page fully wired: result items table, inline form, PDF upload zone, Validar y Enviar button
affects: [03-pdf-generation, 04-whatsapp, 05-patient-portal]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - requirePendingOrder shared helper — all three mutations call this before any DB write
    - Server-side content-type validation on file upload regardless of client accept= attribute
    - Phase 2 PDF upload stores placeholder path only — Supabase Storage deferred to Phase 3
    - useRef form reset pattern — ResultItemsForm resets fields after addResultItemAction resolves
    - Status-conditional rendering — form/button rendered only when order.status === 'pending'

key-files:
  created:
    - src/app/dashboard/ordenes/[id]/actions.ts
    - src/components/result-items-form.tsx
    - src/components/pdf-upload.tsx
  modified:
    - src/app/dashboard/ordenes/[id]/page.tsx

key-decisions:
  - "requirePendingOrder helper shared across all three Server Actions — single status guard, no duplication"
  - "Phase 2 PDF upload stores pending-upload/{filename} placeholder only — Supabase Storage configured in Phase 3"
  - "Server-side file.type check in uploadPdfAction is independent of client-side accept= filter (defense in depth)"
  - "revalidatePath used (not redirect) so user stays on order detail after each mutation"

patterns-established:
  - "Status guard before mutation: every Server Action that modifies an order calls requirePendingOrder first"
  - "Client Component + Server Action binding: components import actions directly via @/ alias, pass orderId via hidden input or FormData"
  - "Conditional section rendering: pending vs validated state determines which UI sections are visible"

requirements-completed: [ORD-04, ORD-05, ORD-06]

# Metrics
duration: 20min
completed: 2026-03-09
---

# Phase 2 Plan 03: Result Entry and Order Validation Summary

**Three Server Actions with shared pending-order guard, drag-and-drop PDF upload component, and fully wired order detail page completing the Phase 2 daily lab workflow.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-09T16:36:04Z
- **Completed:** 2026-03-09
- **Tasks:** 3 auto tasks + 1 human-verify checkpoint (all passed)
- **Files modified:** 4

## Accomplishments

- Implemented addResultItemAction, uploadPdfAction, validateOrderAction all guarded by requirePendingOrder helper
- Built ResultItemsForm (Client Component, useRef reset) and PdfUpload (HTML5 drag-and-drop + click-to-select)
- Wired order detail page: result items table, inline form, PDF upload zone, Validar y Enviar button — all hidden or disabled after validation
- All 15 human verification steps passed ("aprobado")

## Task Commits

Each task was committed atomically:

1. **Task 1: Server Actions for result entry, PDF upload stub, and order validation** - `a4de839` (feat)
2. **Task 2: ResultItemsForm and PdfUpload Client Components** - `14742bf` (feat)
3. **Task 3: Wire result items, PDF upload, and validate button into order detail** - `ba254cf` (feat)

## Files Created/Modified

- `src/app/dashboard/ordenes/[id]/actions.ts` - Three Server Actions with requirePendingOrder guard and revalidatePath
- `src/components/result-items-form.tsx` - Client Component with useRef form reset after submission
- `src/components/pdf-upload.tsx` - Client Component with HTML5 DragEvent drag-and-drop, status feedback states
- `src/app/dashboard/ordenes/[id]/page.tsx` - Extended with result items table, ResultItemsForm, PdfUpload, Validar y Enviar button; locked state for validated orders

## Decisions Made

- **requirePendingOrder shared helper:** All three mutations share a single async helper that fetches the order and returns null if not found or not pending. Eliminates duplication and ensures consistent guard logic.
- **Phase 2 PDF placeholder:** uploadPdfAction stores `pending-upload/{file.name}` as pdfPath — no Supabase Storage calls. Phase 3 will configure bodySizeLimit and implement real storage.
- **Server-side content-type check:** file.type is validated in uploadPdfAction regardless of the client accept= attribute. Defense in depth against crafted requests bypassing client UI.
- **revalidatePath not redirect:** Users stay on the order detail page after adding items, uploading PDF, and validating — revalidatePath refreshes data without navigation.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 complete: patients CRUD, orders CRUD, result entry, PDF upload placeholder, and validation all working end-to-end
- Phase 3 (PDF generation) can now read orderItems and generate a real PDF using the existing pdfPath column
- Phase 4 (WhatsApp) can trigger on validateOrderAction completion once the WhatsApp integration is wired
- No blockers

---
*Phase: 02-core-crud*
*Completed: 2026-03-09*
