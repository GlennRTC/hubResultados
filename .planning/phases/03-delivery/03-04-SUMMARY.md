---
phase: 03-delivery
plan: "04"
subsystem: validate-and-send-orchestration
tags: [server-action, pdf, whatsapp, notifications, audit-log, drizzle-orm, zod, real-time]
dependency_graph:
  requires:
    - plan: 03-01
      provides: generateResultPDF, generateQRDataUrl, uploadPDF
    - plan: 03-02
      provides: sendResultadoListo, DeliveryStatusBadge
    - plan: 03-03
      provides: portal auth flow (downstream consumer of validateAndSendAction output)
  provides:
    - validateAndSendAction — full 9-step PDF→Storage→WhatsApp→notifications→audit pipeline
    - DeliveryStatusBadge wired in order detail and order list pages
  affects:
    - src/app/dashboard/ordenes/[id]/page.tsx (form action, badge display)
    - src/app/dashboard/ordenes/page.tsx (notification status in list)
tech_stack:
  added: []
  patterns:
    - "Zod safeParse on orderId before any DB/API calls (INFRA-06)"
    - "Mark order validated BEFORE PDF/WhatsApp — idempotency guarantee"
    - "Isolated try/catch for WhatsApp — failure never blocks order validation or PDF storage"
    - "Isolated try/catch for audit log — infrastructure failure never blocks business logic"
    - "Logo base64 fetch with fail-open (PDF generated without logo on network error)"
    - "Batch notification fetch (no N+1) with Map for order list status rendering"
key_files:
  created: []
  modified:
    - src/app/dashboard/ordenes/[id]/actions.ts
    - src/app/dashboard/ordenes/[id]/page.tsx
    - src/app/dashboard/ordenes/page.tsx
decisions:
  - "validateAndSendAction marks order validated before PDF/WhatsApp so a crash mid-pipeline never leaves the order stuck in pending"
  - "WhatsApp failure creates a notifications row with status=failed — order stays validated, not delivered; no silent data loss"
  - "notifMap built with last-write-wins from createdAt-ordered rows — simple and correct for single notification per order (current model)"
  - "DeliveryStatusBadge shown only when notificationStatus is non-null — pending orders show no badge"
metrics:
  duration: "9 minutes"
  completed_date: "2026-03-09"
  tasks_completed: 2
  tasks_pending_human_approval: 1
  files_created: 0
  files_modified: 3
requirements_satisfied: [DEL-01, DEL-02, DEL-03, DEL-04, DEL-05, INFRA-06, INFRA-07]
---

# Phase 3 Plan 04: Validate-and-Send Orchestration Summary

**One-liner:** 9-step server action orchestrating PDF generation, Supabase Storage upload, WhatsApp dispatch, notifications insert, and audit log — with isolated failure handling so WhatsApp errors never block order validation.

## Status

**Tasks 1 and 2: COMPLETE** — Committed and verified (TypeScript clean, 23/23 tests passing).

**Task 3: PENDING HUMAN APPROVAL** — checkpoint:human-verify gate. The user must manually test the complete Phase 3 delivery pipeline and confirm with "aprobado" or describe issues found.

## What Was Built

### Task 1: validateAndSendAction (replaces validateOrderAction)

**File:** `src/app/dashboard/ordenes/[id]/actions.ts`

The 9-step pipeline in order:

| Step | Action | Failure handling |
|------|--------|-----------------|
| Zod validation | `ValidateActionSchema.safeParse({ orderId })` | Silent return on invalid input |
| 1 | `requirePendingOrder` — verify order is pending + belongs to lab | Silent return if not found |
| 2 | Mark order `status=validated`, set `validatedById` and `validatedAt` | Upfront — guarantees idempotency |
| 3 | Fetch patient row (scoped to lab) | Log + return if not found (order stays validated) |
| 4 | Fetch order items ordered by `createdAt` | — |
| 5 | Generate QR, fetch logo base64 (fail-open), build `ResultPDFData`, call `generateResultPDF` + `uploadPDF`, update `orders.pdfPath` | try/catch — logs error, continues |
| 6 | Call `sendResultadoListo` if patient has phone | try/catch — wamid stays null on error |
| 7 | Insert `notifications` row (`status=sent` if wamid, `status=failed` otherwise) | Always executed |
| 8 | Advance order to `status=delivered` if wamid returned | Only on WhatsApp success |
| 9 | Insert `auditLog` row with `action=notification_sent` | try/catch — never blocks |

`addResultItemAction` and `uploadPdfAction` are preserved unchanged from Phase 2.

### Task 2: DeliveryStatusBadge wired into both order pages

**Order detail page** (`src/app/dashboard/ordenes/[id]/page.tsx`):
- Imports `validateAndSendAction` (replaces `validateOrderAction`)
- Imports `DeliveryStatusBadge` from `@/components/delivery-status-badge`
- Fetches `notificationStatus` from `notifications` table (1 row, ordered by `createdAt`)
- Shows `DeliveryStatusBadge` with `initialStatus={notificationStatus}` next to "Orden validada" badge for validated/delivered orders
- Pending order form action now points to `validateAndSendAction`

**Order list page** (`src/app/dashboard/ordenes/page.tsx`):
- Imports `DeliveryStatusBadge`
- Batch-fetches all `notifications` rows for this lab (single query, no N+1)
- Builds `notifMap: Map<orderId, status>` with last-write-wins
- Each table row renders `DeliveryStatusBadge` if notification exists, falls back to `StatusBadge` otherwise

## Task 3: Human Verification Required

**What to verify:**

**Test 1: Full validate-and-send flow**
1. Log in to dashboard, open any pending order with result items
2. Click "Validar y Enviar"
3. Confirm: order status changes to validated/delivered
4. Confirm: a notifications row exists in Supabase with status="sent" (or "failed" if WhatsApp not configured)
5. Confirm: a PDF exists in Supabase Storage under `results/{orderId}.pdf`
6. Confirm: signed URL for the PDF is valid HTTPS

**Test 2: Patient portal**
1. Open `/r/{verification_code}`
2. Enter correct document type, document number, date of birth
3. Confirm: PDF viewer appears with the generated PDF
4. Confirm: download button downloads the PDF
5. Enter wrong credentials — confirm "Datos no coinciden" message
6. Make 5 wrong attempts — confirm lockout message appears

**Test 3: QR verification page**
1. Open `/verify/{verification_code}`
2. Confirm: lab name, partial patient name, order date, validation date shown
3. No auth required

**Test 4: Real-time delivery badge**
1. After validation, observe DeliveryStatusBadge in order list and detail
2. If webhook is configured, badge updates on Meta delivery receipts

**Test 5:** `docker exec labflash-app-1 npx jest --passWithNoTests` exits 0

**Resume signal:** Type "aprobado" or describe issues found.

## TypeScript Compilation Status

`npx tsc --noEmit` — no errors in any files modified by this plan. 10 pre-existing errors in `src/lib/supabase/middleware.ts` and `src/lib/supabase/server.ts` are from Phase 1 (out of scope).

## Test Results

```
PASS tests/webhook.test.ts
PASS tests/portal-auth.test.ts
PASS tests/pdf.test.ts
PASS tests/verify.test.ts
PASS tests/whatsapp.test.ts
PASS tests/rate-limit.test.ts

Test Suites: 6 passed, 6 total
Tests:       23 passed, 23 total
```

## Deviations from Plan

None — plan executed exactly as written for Tasks 1 and 2.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| dbb2675 | feat | validateAndSendAction — full 9-step PDF→Storage→WhatsApp pipeline |
| 8ea6ca8 | feat | Wire DeliveryStatusBadge into order detail and list pages |

## Self-Check: PASSED
