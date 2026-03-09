---
phase: 03-delivery
plan: "02"
subsystem: whatsapp-integration
tags: [whatsapp, webhook, hmac, zod, supabase-realtime, tdd, meta-cloud-api]

# Dependency graph
requires:
  - plan: 03-00
    provides: notifications table (status + whatsappMessageId fields), jest infrastructure
  - plan: 03-01
    provides: PDF generation pipeline (prerequisite context)

provides:
  - sendResultadoListo(phone, firstName, labName, verificationCode): Promise<string> (returns wamid)
  - GET /api/webhooks/whatsapp — Meta verify handshake (hub.challenge)
  - POST /api/webhooks/whatsapp — HMAC + Zod + DB status updates
  - DeliveryStatusBadge client component (Supabase Realtime postgres_changes)

affects:
  - 03-04 (validate-and-send calls sendResultadoListo; wamid stored in notifications)
  - Any order list/detail UI that imports DeliveryStatusBadge

# Tech tracking
tech-stack:
  added:
    - zod@3.x (installed via docker exec — Zod schema validation for webhook body)
  patterns:
    - rawBody = req.text() BEFORE HMAC validation (req.json() causes byte-order mismatch)
    - timingSafeEqual for HMAC comparison (timing-attack safe)
    - Status ordinal logic: pending=0, sent=1, delivered=2, read=3, failed=-1 (only advance forward)
    - TDD: RED commit (failing import) -> GREEN commit (implementation passing)
    - jest.mock drizzle-orm and @/lib/db to unit-test route handler without live DB

key-files:
  created:
    - src/lib/whatsapp/send-template.ts (sendResultadoListo — Meta Cloud API v21.0 fetch wrapper)
    - src/app/api/webhooks/whatsapp/route.ts (GET verify + POST HMAC/Zod/DB update)
    - src/components/delivery-status-badge.tsx (client component, Supabase Realtime)
  modified:
    - tests/whatsapp.test.ts (replaced 3 it.todo stubs with 4 real passing tests)
    - tests/webhook.test.ts (replaced 6 it.todo stubs with 6 real passing tests)

key-decisions:
  - "rawBody = req.text() first: consuming req.json() before HMAC breaks signature validation due to body stream exhaustion"
  - "Status ordinal gate: only update if new status ordinal > current; failed always overwrites — handles out-of-order Meta webhook delivery"
  - "DeliveryStatusBadge uses createClient() (browser client) from @/lib/supabase/client for Realtime subscriptions — server client would not work in a client component"

# Metrics
duration: 9min
completed: 2026-03-09
tasks_completed: 2
files_created: 3
files_modified: 2
requirements_satisfied: [DEL-03, DEL-04, DEL-05, INFRA-06]
---

# Phase 3 Plan 02: WhatsApp Integration Summary

**One-liner:** Meta Cloud API v21.0 send-template wrapper, HMAC-validated webhook route with Zod schema enforcement, and Supabase Realtime DeliveryStatusBadge — all TDD with 10 passing unit tests.

## What Was Built

### Files Created

**`src/lib/whatsapp/send-template.ts`**

Exports `sendResultadoListo(toPhone, patientFirstName, labName, verificationCode): Promise<string>`.

Builds the exact Meta Cloud API v21.0 request body:
- Endpoint: `https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_NUMBER_ID}/messages`
- Template: `resultado_listo`, language `es`
- Three body parameters: `{{1}}`=firstName, `{{2}}`=labName, `{{3}}`=`https://labflash.co/r/{verificationCode}`
- Returns `data.messages[0].id` (wamid string)
- Throws descriptive error on non-OK response

**`src/app/api/webhooks/whatsapp/route.ts`**

Two route handlers:

- `GET`: Meta webhook verification handshake. Returns `hub.challenge` as plain text when `hub.mode=subscribe` and `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`. Returns 403 otherwise.

- `POST`: Delivery status update handler.
  1. `rawBody = await req.text()` (CRITICAL: before any JSON parsing)
  2. Reads `x-hub-signature-256` header — returns 401 if missing
  3. HMAC validation via `createHmac("sha256", appSecret).update(rawBody).digest("hex")` compared with `timingSafeEqual` — returns 401 on mismatch
  4. Zod `WebhookBodySchema.safeParse()` — returns 400 with `details` on schema violation
  5. Iterates `entry[].changes[].value.statuses[]` — calls `updateNotificationStatus(wamid, status)` for each
  6. Returns `{ status: "ok" }` (200)

  Status update uses ordinal gate: only updates DB if new status ordinal > current (`pending`=0, `sent`=1, `delivered`=2, `read`=3). `failed` always overwrites. Prevents stale out-of-order events from regressing status.

**`src/components/delivery-status-badge.tsx`**

Client component (`"use client"`) that:
- Accepts `orderId: string` and `initialStatus?: NotificationStatus`
- Subscribes to Supabase Realtime `postgres_changes` event on `notifications` table, filtered by `order_id=eq.{orderId}`
- Updates badge color and Spanish label on UPDATE events without page refresh
- Cleans up channel subscription on unmount

Status labels (Spanish): Pendiente / Enviado / Entregado / Leido / Fallido

### Files Modified

**`tests/whatsapp.test.ts`** — Replaced 3 `it.todo` stubs with 4 real unit tests covering URL/auth header correctness, template body structure, wamid extraction, and error propagation.

**`tests/webhook.test.ts`** — Replaced 6 `it.todo` stubs with 6 real unit tests covering GET handshake success/failure, POST missing signature, POST invalid HMAC, POST valid event (200), and POST Zod rejection (400).

### Installed Packages

| Package | Version | How Installed |
|---------|---------|---------------|
| `zod` | 3.x | `docker exec labflash-app-1 npm install zod` |

## Test Results

```
PASS tests/whatsapp.test.ts
  sendResultadoListo
    ✓ calls Meta API with correct URL and Authorization header (3 ms)
    ✓ builds correct template body with three parameters (1 ms)
    ✓ returns wamid from API response
    ✓ throws error on non-200 Meta API response (5 ms)

PASS tests/webhook.test.ts
  GET /api/webhooks/whatsapp
    ✓ returns hub.challenge when mode=subscribe and token matches (8 ms)
    ✓ returns 403 when token does not match (1 ms)
  POST /api/webhooks/whatsapp
    ✓ returns 401 when x-hub-signature-256 header is missing (1 ms)
    ✓ returns 401 when HMAC signature is invalid (1 ms)
    ✓ returns 200 for valid status event with correct HMAC (2 ms)
    ✓ returns 400 for payload that fails Zod schema (INFRA-06) (1 ms)

Full suite: 6 test suites, 23 passed, 0 failed
```

## TypeScript Status

`npx tsc --noEmit` — no errors in any newly created files. Pre-existing errors in `src/lib/supabase/middleware.ts` and `src/lib/supabase/server.ts` are from Phase 1 and out of scope.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 1ad1cd1 | test | RED: failing tests for sendResultadoListo |
| b769bcd | feat | GREEN: implement sendResultadoListo — 4 tests passing |
| df455d4 | test | RED: failing tests for webhook GET/POST handler |
| 951ac4a | feat | GREEN: webhook route handler and DeliveryStatusBadge — 6 tests passing |

## Deviations from Plan

None — plan executed exactly as written.

## Deployment Notes

The following env vars must be added to `.env.local` and production environment before the WhatsApp integration can send real messages:

```
WHATSAPP_PHONE_NUMBER_ID=<from Meta dashboard>
WHATSAPP_ACCESS_TOKEN=<from Meta dashboard>
WHATSAPP_VERIFY_TOKEN=<chosen secret string>
WHATSAPP_APP_SECRET=<from Meta app settings>
```

The `resultado_listo` WhatsApp template must be pre-approved by Meta before it can be sent. This is a deployment blocker, not a code blocker — the implementation is complete and correct.

## Next Plan

Plan 03-03 (portal auth + rate limiting) or 03-04 (validate-and-send orchestration) — both can proceed. `sendResultadoListo` is ready to be called from the validate-and-send action.

## Self-Check: PASSED

Files verified on disk:
- src/lib/whatsapp/send-template.ts: FOUND
- src/app/api/webhooks/whatsapp/route.ts: FOUND
- src/components/delivery-status-badge.tsx: FOUND
- tests/whatsapp.test.ts: FOUND
- tests/webhook.test.ts: FOUND

Commits verified in git history:
- 1ad1cd1: FOUND
- b769bcd: FOUND
- df455d4: FOUND
- 951ac4a: FOUND
