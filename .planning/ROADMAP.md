# Roadmap: LabFlash

## Overview

LabFlash goes from zero to a production SaaS in five phases. Phase 1 establishes the multi-tenant foundation — auth, schema, and RLS. Phase 2 builds the core CRUD surface lab staff use daily: patients, orders, and result entry. Phase 3 delivers the product's core value proposition end-to-end: PDF generation, WhatsApp delivery, and the patient portal. Phase 4 adds operational depth: lab settings, staff management, analytics, audit, plan enforcement, and superadmin. Phase 5 ships to production: mobile polish, landing page, and Vercel deployment.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Multi-tenant Next.js + Supabase scaffold with auth and RLS
- [ ] **Phase 2: Core CRUD** - Patient directory, orders, result entry, and PDF upload
- [ ] **Phase 3: Delivery** - PDF generation, WhatsApp sending, patient portal, and webhooks
- [ ] **Phase 4: Polish** - Lab settings, staff management, analytics, audit log, plan limits, superadmin
- [ ] **Phase 5: Launch** - Mobile hardening, landing page, and production deployment

## Phase Details

### Phase 1: Foundation
**Goal**: Lab staff can register a lab and log in securely; all data is isolated per tenant from day one
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. A new laboratory and admin user are created when a person fills out the registration form and submits it
  2. Lab staff can log in with email and password and remain logged in after a browser refresh
  3. Lab staff can log out from any page and are redirected to the login screen
  4. All database queries are scoped to the authenticated lab's ID — a staff member from Lab A cannot see Lab B's data
  5. All UI text visible to users is in Spanish
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Next.js 15 scaffold, Drizzle schema, dependencies, Spanish landing page
- [x] 01-02-PLAN.md — Supabase Auth: registration flow, login, logout, session middleware
- [ ] 01-03-PLAN.md — RLS policies for all tables, authenticated dashboard shell with sidebar + logout

### Phase 2: Core CRUD
**Goal**: Lab staff can manage the full patient and order workflow up to the point of validation
**Depends on**: Phase 1
**Requirements**: PAT-01, PAT-02, PAT-03, PAT-04, ORD-01, ORD-02, ORD-03, ORD-04, ORD-05, ORD-06
**Success Criteria** (what must be TRUE):
  1. Lab staff can create a patient with all required fields and the patient appears in the lab's directory (no other lab can see them)
  2. Lab staff can search for a patient by name or document number and open their full history of orders
  3. Lab staff can create an order linked to a patient, then view and filter all orders by status
  4. Lab staff can enter individual result items (test name, value, unit, reference range, flag) on an order detail page
  5. Lab staff can upload a PDF directly to an order as an alternative to manual result entry (drag and drop)
  6. Lab staff can trigger "Validate and Send" on an order, which locks the order and records who validated it and when
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Patient CRUD (create, search, list, detail, history) with RLS enforcement
- [ ] 02-02-PLAN.md — Order CRUD (create, list with filters, detail view)
- [ ] 02-03-PLAN.md — Result item entry form, PDF upload (drag and drop), and "Validar y Enviar" action

### Phase 3: Delivery
**Goal**: Validated orders automatically generate a PDF, send a WhatsApp message, and expose a patient portal so the patient can view their result
**Depends on**: Phase 2
**Requirements**: DEL-01, DEL-02, DEL-03, DEL-04, DEL-05, PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, PORTAL-05, PORTAL-06, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. Clicking "Validate and Send" generates a branded PDF (under 500KB) with lab logo, patient info, results table, validated-by footer, and a QR code, stored in Supabase Storage with a signed URL
  2. Within 5 seconds of validation, the patient receives a WhatsApp message containing a secure link to their results
  3. The lab dashboard updates in real time to show whether the message was sent, delivered, or read
  4. A patient can open their unique link, authenticate using document type + document number + date of birth (no password), and view and download their PDF in the browser
  5. After 5 failed authentication attempts on a result link, further attempts are blocked for one hour
  6. Anyone scanning the QR on a printed PDF can open `/verify/{verification_code}` and see confirmation that the result is authentic
  7. All form submissions and API routes validate input with Zod before processing
**Plans**: TBD

Plans:
- [ ] 03-01: PDF generation with @react-pdf/renderer (branded template, QR code, < 500KB), Supabase Storage upload, signed URL
- [ ] 03-02: Meta Cloud API integration — send WhatsApp template on validation, webhook handler for delivery + read receipts
- [ ] 03-03: Patient portal — `/r/{code}` auth flow, PDF viewer, download button, rate limiting, `/verify/{code}` authenticity page
- [ ] 03-04: Zod validation on all forms and API routes; delivery status real-time update in dashboard

### Phase 4: Polish
**Goal**: Lab admins can configure their account, manage staff, monitor performance, and superadmins can operate the platform
**Depends on**: Phase 3
**Requirements**: DEL-06, LAB-01, LAB-02, LAB-03, LAB-04, LAB-05, SADM-01, SADM-02, SADM-03, SADM-04
**Success Criteria** (what must be TRUE):
  1. Lab admin can update lab name, upload a logo, and configure WhatsApp credentials from a settings page
  2. Lab admin can invite staff by email, assign them a role (admin / technician / reception), and remove them
  3. Lab admin can view a dashboard analytics panel showing results sent today, delivery rate, and average time from validation to patient view
  4. Lab admin can view a paginated audit log showing who accessed what resource, when, and from which IP
  5. When a free-plan lab reaches 30 validated results in the current month, further validation attempts are blocked and an upgrade prompt is shown
  6. Lab staff can retry sending a WhatsApp notification for an order that failed or was never delivered
  7. A superadmin can list all labs, view their notification logs, see platform-wide metrics, and delete a lab account
**Plans**: TBD

Plans:
- [ ] 04-01: Lab settings page (name, logo, WhatsApp config) and staff management (invite, roles, remove)
- [ ] 04-02: Analytics panel, audit log viewer, resend failed notification
- [ ] 04-03: Plan limits enforcement (free tier cap at 30/month) and superadmin panel

### Phase 5: Launch
**Goal**: The application is production-ready — mobile-polished, publicly discoverable, and running on Vercel + Supabase free tier
**Depends on**: Phase 4
**Requirements**: INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. The patient portal renders correctly and is fully usable on a cheap Android phone in Chrome or Firefox
  2. A landing page exists at the root URL with a clear value proposition and a "Registrar laboratorio" call to action that leads to signup
  3. The application is live on Vercel connected to a production Supabase project, with total infrastructure cost under $5/month
**Plans**: TBD

Plans:
- [ ] 05-01: Mobile QA pass on patient portal, responsive fixes across all pages
- [ ] 05-02: Landing page (value prop, screenshots, registration CTA)
- [ ] 05-03: Production deployment (Vercel project, Supabase prod, environment variables, custom domain)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In Progress|  |
| 2. Core CRUD | 1/3 | In Progress|  |
| 3. Delivery | 0/4 | Not started | - |
| 4. Polish | 0/3 | Not started | - |
| 5. Launch | 0/3 | Not started | - |
