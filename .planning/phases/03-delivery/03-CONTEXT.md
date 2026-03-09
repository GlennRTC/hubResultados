# Phase 3: Delivery - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/LABFLASH_SPEC_2.md)

<domain>
## Phase Boundary

Phase 3 delivers the end-to-end result delivery pipeline: when a lab technician clicks "Validate & Send," the system must automatically generate a branded PDF, upload it to Supabase Storage, send a WhatsApp message to the patient, and expose a secure patient portal where the patient can authenticate without a password and view/download their results. Real-time delivery status (sent/delivered/read) updates in the lab dashboard via Meta webhook.

This phase depends on Phase 2 (order + result entry is already wired). Phase 3 does NOT touch: billing, native apps, HL7/FHIR, dark mode, patient account creation, or multi-language.

</domain>

<decisions>
## Implementation Decisions

### PDF Generation
- Use `@react-pdf/renderer` for server-side generation in API routes (preferred over jspdf)
- PDF must include: lab logo + name + address + phone, patient full name + document type/number + DOB, order number + sample date + validation date, results table (test name | result | unit | reference range | flag H/L/C), validated-by footer with name and timestamp, QR code in bottom-right corner linking to `/verify/{verification_code}`, disclaimer text in Spanish
- PDF size constraint: < 500KB (optimized for mobile data in LATAM)
- Style: clean, professional, black/white with lab accent color
- `verification_code` is already stored in the `results` table (unique)

### Supabase Storage
- PDFs stored in Supabase Storage, path stored in `results.pdf_storage_path`
- Serve PDFs via signed URLs only (expire in 1 hour). No direct public access to storage bucket
- Upload happens as part of the validate-and-send flow

### WhatsApp Integration
- Use Meta Cloud API directly (NO Twilio)
- API version: `v21.0` — endpoint `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
- Template name: `resultado_listo`, category: UTILITY, language: `es`
- Template variables: `{{1}}` = patient first name, `{{2}}` = lab name, `{{3}}` = secure URL (`https://labflash.co/r/{verification_code}`)
- Env vars: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- The meta API returns `{ messages: [{ id: 'wamid.xxx' }] }` — store this ID in `notifications.whatsapp_message_id` for tracking
- Delivery < 5 seconds from validate click to patient receiving message

### Webhook Handler
- Route: `POST /api/webhooks/whatsapp`
- Also handles `GET` for Meta webhook verification (verify token: `WHATSAPP_VERIFY_TOKEN`)
- Matches incoming status updates to `notifications` table via `whatsapp_message_id`
- Updates: `pending` → `sent` → `delivered` → `read`
- Real-time dashboard updates: when notification status changes, lab dashboard reflects it in real-time

### Patient Portal Auth (no passwords)
- Route: `/r/[verification_code]` — public
- Auth form fields: Tipo de documento (dropdown: CC, TI, CE, PA, CI), Número de documento, Fecha de nacimiento (date picker)
- Backend validates: verification_code exists in results table AND document_number + date_of_birth match the patient linked to that order
- On match: render PDF viewer in browser + download button
- On failure: generic error "Datos no coinciden" — no hints about which field is wrong
- Rate limiting: max 5 attempts per verification_code per hour; lock for 1 hour after 5 failures
- Implement rate limiting in the API route using a simple in-memory or Supabase-based counter

### QR Verification Page
- Route: `/verify/[verification_code]` — public
- Shows confirmation that the result is authentic (verification_code found in DB)
- Displays: lab name, patient name (partial), order date, validation date, validated-by name
- No auth required — this is just authenticity confirmation, not result viewing

### Audit Logging
- Log `result_viewed` and `result_downloaded` events to `audit_log` when patient accesses portal
- Include IP address and user agent
- Log `notification_sent` when WhatsApp message is sent

### Validate & Send Flow (server action or API route)
- Triggered by the existing "Validate" button in the order detail page (phase 2 wired this)
- Steps: 1) mark order as `validated` (set validated_by, validated_at), 2) generate PDF from result_items, 3) upload PDF to Supabase Storage, 4) update results.pdf_storage_path, 5) send WhatsApp message, 6) create notifications record with whatsapp_message_id, 7) update order status to `delivered`, 8) log to audit_log
- All steps should be in a try/catch — if WhatsApp fails, the PDF is still stored and order is validated

### Zod Validation
- All form submissions must use Zod schemas for input validation
- All API routes (including webhooks) must validate request bodies with Zod before processing

### Real-Time Dashboard Updates
- Use Supabase Realtime subscriptions to watch `notifications` table changes
- Dashboard order list and order detail page update notification status without refresh

### UI Language
- All UI text in Spanish only (MVP)
- Patient portal: minimal, mobile-first, white background, lab logo centered, form below

### Routes to implement
- `/r/[verification_code]` — patient result access (auth + PDF viewer)
- `/verify/[verification_code]` — QR authenticity confirmation page
- `POST /api/webhooks/whatsapp` — Meta webhook for delivery/read receipts
- `GET /api/webhooks/whatsapp` — Meta webhook verification handshake

### Claude's Discretion
- Whether to use a simple upstash/redis rate limiting package or implement with Supabase (given free tier, prefer Supabase-based or in-memory with a simple table)
- PDF template design details beyond the spec requirements
- Error handling granularity in the validate-and-send pipeline
- Whether to use Supabase Realtime or polling for dashboard status updates

</decisions>

<specifics>
## Specific Ideas

- Result URL format: `https://labflash.co/r/{verification_code}` — verification_code is already unique in DB
- WhatsApp template must be pre-approved by Meta; build the send function to match exactly the `resultado_listo` template spec
- QR codes generated with the `qrcode` npm package, embedded in the PDF via @react-pdf/renderer's `<Image>` component
- `results.verification_code` is already stored in the DB from phase 2; PDF generation reads from this
- `notifications.whatsapp_message_id` is the key for matching webhook updates to the correct notification record
- Rate limiting by `verification_code` + IP combination (per code to prevent distributed attacks)
- PDF signed URLs expire in 1 hour; patient portal should generate a fresh signed URL on each authenticated access
- Supabase Storage bucket name: use a sensible default like `results` or `pdfs`
- Dashboard delivery status badges: pending=yellow, sent=blue, delivered=green, read=purple, failed=red

</specifics>

<deferred>
## Deferred Ideas

- Email channel for notifications (notifications.channel supports it but WhatsApp only for MVP)
- SMS channel
- Resend failed notifications UI (Phase 4)
- Audit log viewer in dashboard (Phase 4)
- Plan limits enforcement (Phase 4)
- Dashboard analytics page (Phase 4)
- Lab settings page for WhatsApp config (Phase 4)
- i18n / multi-language support (out of scope MVP)
- Native mobile app (web-only MVP)
- HL7/FHIR integration (explicitly deferred)
- Patient accounts with passwords (explicitly out of scope)

</deferred>

---

*Phase: 03-delivery*
*Context gathered: 2026-03-09 via PRD Express Path (.planning/LABFLASH_SPEC_2.md)*
