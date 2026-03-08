# LabFlash

## What This Is

LabFlash is a lightweight SaaS middleware that automates the delivery of clinical laboratory results to patients via WhatsApp notification and a secure web portal. It sits between the lab's existing system and the patient's phone — it is not a LIS and does not manage samples, orders, or billing. Target market: small/medium clinical labs in Colombia and Venezuela (50–500 samples/day).

## Core Value

When a lab technician marks results as "validated," the patient instantly receives a WhatsApp message with a secure link to download their PDF results — authenticated by their ID number + date of birth.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Lab self-service registration (create laboratory + first admin account)
- [ ] Lab staff login/logout (Supabase Auth, email/password)
- [ ] Multi-tenant data isolation (Supabase RLS, every query scoped to laboratory_id)
- [ ] Patient CRUD (create, search, list, per-lab directory)
- [ ] Order CRUD (create, list by status, detail view)
- [ ] Manual result entry (test name, value, unit, reference range, flag)
- [ ] PDF upload as alternative result input (drag & drop)
- [ ] PDF generation from structured result items (branded, with QR code)
- [ ] Supabase Storage integration (signed URLs, 1-hour expiry)
- [ ] "Validate & Send" action (validates order, generates PDF, triggers WhatsApp)
- [ ] WhatsApp delivery via Meta Cloud API (template: `resultado_listo`)
- [ ] Webhook handler for WhatsApp delivery + read receipts
- [ ] Patient portal: auth via document_number + date_of_birth (no passwords)
- [ ] Patient portal: PDF viewer + download button, mobile-first
- [ ] QR verification page (confirms result authenticity)
- [ ] Real-time delivery status in dashboard (sent → delivered → read)
- [ ] Dashboard analytics (results sent today, delivery rate, open rate)
- [ ] Lab settings page (logo upload, name, WhatsApp config)
- [ ] Staff user management (invite, assign roles: admin/technician/reception)
- [ ] Resend failed notifications
- [ ] Audit log viewer
- [ ] Plan limits enforcement (free = 30 results/month)
- [ ] Superadmin panel (lab management, subscription overview, support ops)
- [ ] Landing page with value prop + registration CTA
- [ ] Rate limiting on patient portal (5 attempts/hour per verification_code)

### Out of Scope

- Sample/order management (LIS functionality) — not what LabFlash is
- Billing and invoicing — manual billing for MVP
- Appointment scheduling — out of domain
- Patient accounts with passwords — ID+DOB auth is sufficient
- Native mobile app — web-only, mobile-responsive
- HL7/FHIR integration — future Phase 2+
- Multi-language support — Spanish only for MVP
- Payment processing — manual billing, no Stripe integration in v1
- RIPS module — out of scope
- AI/ML features — not needed
- Dark mode — not needed
- Real-time chat support — out of scope

## Context

- Target labs are small/medium (50–500 samples/day) in Colombia and Venezuela
- Labs currently deliver results via printed paper, phone calls, or personal WhatsApp photos
- Staff spends 2–4 hours/day answering "are my results ready?" calls
- Primary compliance concern: Ley 1581 (Colombia) — basic hygiene is sufficient for v1 (no PHI in WA message body, encrypted links, audit log)
- Venezuela: lower compliance burden, lower price point, Month 4+ expansion
- WhatsApp cost: ~$0.0002/msg utility in Colombia via Meta Cloud API (direct, not via Twilio)
- Monthly cost at launch: ~$2–3 USD (WA messages + domain)

## Constraints

- **Tech Stack**: Next.js 15 (App Router), Supabase (PostgreSQL + Auth + Storage), Drizzle ORM, shadcn/ui + Tailwind CSS, TypeScript, @react-pdf/renderer, Meta Cloud API, Vercel — locked
- **Budget**: All free tiers. Supabase: 500MB DB, 1GB Storage, 50K MAUs. Vercel: 100GB bandwidth
- **Language**: All UI text in Spanish (ES) only
- **Performance**: Dashboard < 2s, patient portal < 1s, WA delivery < 5s from validation click
- **PDF size**: < 500KB (optimized for mobile data in LATAM)
- **Security**: Signed URLs (1-hour expiry), no public storage access, rate limiting on patient portal
- **Mobile**: 100% responsive; patient portal must work on cheap Android phones (Chrome/Firefox)
- **Timeline**: 10 days to production MVP

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No patient accounts/passwords | ID + DOB auth is frictionless, matches what patients already have | — Pending |
| Meta Cloud API direct (not Twilio) | Cost: $0.0002/msg vs Twilio markup; Colombia volume makes this meaningful | — Pending |
| Supabase RLS for multi-tenancy | Built-in, enforced at DB level, not application level — harder to bypass | — Pending |
| @react-pdf/renderer for PDF gen | Server-side generation in API routes; consistent output | — Pending |
| Self-service signup + superadmin panel | Self-service required for 24/7 acquisition; superadmin required for operational support | — Pending |
| Spanish-only for MVP | Colombia + Venezuela primary markets; no i18n complexity in v1 | — Pending |
| verification_code as patient portal entry | Stateless auth, no sessions, no accounts — zero friction for patients | — Pending |

---
*Last updated: 2026-03-08 after initialization*
