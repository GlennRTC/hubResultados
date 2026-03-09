# Requirements: LabFlash

**Defined:** 2026-03-08
**Core Value:** When a lab technician validates results, the patient instantly receives a WhatsApp message with a secure link to download their PDF — authenticated by ID number + date of birth.

## v1 Requirements

### Authentication

- [x] **AUTH-01**: Lab staff can register a new laboratory account (self-service: name, email, password → creates laboratory + admin user)
- [x] **AUTH-02**: Lab staff can log in with email and password (Supabase Auth)
- [x] **AUTH-03**: Lab staff can log out from any page
- [x] **AUTH-04**: Lab staff session persists across browser refresh

### Patients

- [x] **PAT-01**: Lab staff can create a patient (document type, document number, first/last name, DOB, phone with country code)
- [x] **PAT-02**: Lab staff can search patients by name or document number
- [x] **PAT-03**: Lab staff can view patient history (all orders for a patient)
- [x] **PAT-04**: Patient records are isolated per lab (no cross-lab data leakage)

### Orders

- [x] **ORD-01**: Lab staff can create a new order (select or create patient, enter order number)
- [x] **ORD-02**: Lab staff can view orders list with filters (today / pending / validated / delivered)
- [x] **ORD-03**: Lab staff can view order detail page
- [ ] **ORD-04**: Lab staff can enter result items per order (test name, value, unit, reference range, flag: normal/high/low/critical)
- [ ] **ORD-05**: Lab staff can upload a PDF as alternative to manual result entry (drag & drop)
- [ ] **ORD-06**: Lab staff can validate an order ("Validate & Send" action records who validated, when, and triggers delivery)

### Delivery

- [ ] **DEL-01**: System generates a branded PDF from result items (lab logo, patient info, results table, validated-by footer, QR code)
- [ ] **DEL-02**: PDFs are stored in Supabase Storage with signed URLs (1-hour expiry, no public access)
- [ ] **DEL-03**: Patient receives a WhatsApp template message on validation (Meta Cloud API direct, template: `resultado_listo`, < 5s from click)
- [ ] **DEL-04**: Webhook handler processes WhatsApp delivery + read receipts (sent → delivered → read)
- [ ] **DEL-05**: Lab dashboard shows real-time delivery status per order
- [ ] **DEL-06**: Lab staff can resend a notification for failed or undelivered results

### Patient Portal

- [ ] **PORTAL-01**: Patient can open a result via unique secure link (`/r/{verification_code}`)
- [ ] **PORTAL-02**: Patient authenticates by entering document type + document number + date of birth (no account or password)
- [ ] **PORTAL-03**: Patient can view their result PDF in the browser (embedded viewer)
- [ ] **PORTAL-04**: Patient can download their result PDF
- [ ] **PORTAL-05**: Portal enforces rate limiting (max 5 auth attempts per verification_code per hour; 1-hour lockout after that)
- [ ] **PORTAL-06**: QR verification page (`/verify/{verification_code}`) confirms result authenticity for anyone scanning the QR

### Lab Management

- [ ] **LAB-01**: Lab admin can configure lab settings (name, logo upload, WhatsApp phone number ID + access token)
- [ ] **LAB-02**: Lab admin can manage staff users (invite by email, assign role: admin / technician / reception, remove user)
- [ ] **LAB-03**: Lab admin can view analytics (results sent today, delivery rate, average time from validation to patient view)
- [ ] **LAB-04**: Lab admin can view audit log (who accessed what, when, from which IP)
- [ ] **LAB-05**: Free plan is capped at 30 results/month (system enforces limit, shows upgrade prompt)

### Superadmin

- [ ] **SADM-01**: Superadmin can view all registered labs (name, plan, results count, created date)
- [ ] **SADM-02**: Superadmin can view notification logs for any lab (for support without needing lab credentials)
- [ ] **SADM-03**: Superadmin can view platform metrics (registrations today, active labs, monthly result volume)
- [ ] **SADM-04**: Superadmin can delete a lab account (GDPR/Ley 1581 right-to-deletion)

### Infrastructure & Launch

- [x] **INFRA-01**: All patient and lab data is isolated per tenant via Supabase Row Level Security
- [x] **INFRA-02**: All UI copy is in Spanish (es) — no i18n framework needed
- [ ] **INFRA-03**: Patient portal is mobile-first and works on cheap Android phones (Chrome, Firefox)
- [ ] **INFRA-04**: Landing page with product value proposition and registration CTA
- [ ] **INFRA-05**: Application is deployed to Vercel + Supabase free tier (target < $5/month total)
- [ ] **INFRA-06**: Input validation via Zod on all forms and API routes
- [ ] **INFRA-07**: PDF size < 500KB (optimized for LATAM mobile data)

## v2 Requirements

### LIS Integration

- **LIS-01**: Lab can push results to LabFlash via REST API (structured JSON payload)
- **LIS-02**: API key management per lab (generate, revoke)
- **LIS-03**: HL7/FHIR import for labs with standards-compliant LIS

### Advanced Notifications

- **NOTIF-01**: Email delivery as fallback when WhatsApp fails
- **NOTIF-02**: SMS delivery via SMS gateway

### Venezuela Expansion

- **VE-01**: USD pricing tiers ($8 / $20 / $45/month)
- **VE-02**: CI (Cédula de Identidad) document type support (already in schema, needs UI validation)
- **VE-03**: Zelle / Binance Pay / USD bank transfer payment methods

### Patient History

- **PH-01**: Patient can view all historical results (requires returning patient identification flow)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sample/order management (LIS) | Not what LabFlash is — sits on top of existing LIS |
| Billing and invoicing | Manual billing for MVP |
| Appointment scheduling | Out of domain |
| Patient accounts with passwords | ID + DOB auth is sufficient and frictionless |
| Native mobile app | Web-only, fully responsive |
| Payment processing (Stripe etc.) | Manual billing; payment infra deferred |
| RIPS module | Colombian regulatory module, out of scope |
| AI/ML features | No business need identified |
| Dark mode | Not needed for medical/professional tool |
| Multi-language support | Spanish-only for MVP; LATAM is the entire market |
| Real-time chat / support widget | Out of scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Pending |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| PAT-01 | Phase 2 | Complete |
| PAT-02 | Phase 2 | Complete |
| PAT-03 | Phase 2 | Complete |
| PAT-04 | Phase 2 | Complete |
| ORD-01 | Phase 2 | Complete |
| ORD-02 | Phase 2 | Complete |
| ORD-03 | Phase 2 | Complete |
| ORD-04 | Phase 2 | Pending |
| ORD-05 | Phase 2 | Pending |
| ORD-06 | Phase 2 | Pending |
| DEL-01 | Phase 3 | Pending |
| DEL-02 | Phase 3 | Pending |
| DEL-03 | Phase 3 | Pending |
| DEL-04 | Phase 3 | Pending |
| DEL-05 | Phase 3 | Pending |
| DEL-06 | Phase 4 | Pending |
| PORTAL-01 | Phase 3 | Pending |
| PORTAL-02 | Phase 3 | Pending |
| PORTAL-03 | Phase 3 | Pending |
| PORTAL-04 | Phase 3 | Pending |
| PORTAL-05 | Phase 3 | Pending |
| PORTAL-06 | Phase 3 | Pending |
| LAB-01 | Phase 4 | Pending |
| LAB-02 | Phase 4 | Pending |
| LAB-03 | Phase 4 | Pending |
| LAB-04 | Phase 4 | Pending |
| LAB-05 | Phase 4 | Pending |
| SADM-01 | Phase 4 | Pending |
| SADM-02 | Phase 4 | Pending |
| SADM-03 | Phase 4 | Pending |
| SADM-04 | Phase 4 | Pending |
| INFRA-03 | Phase 5 | Pending |
| INFRA-04 | Phase 5 | Pending |
| INFRA-05 | Phase 5 | Pending |
| INFRA-06 | Phase 3 | Pending |
| INFRA-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-08*
*Last updated: 2026-03-08 after roadmap validation*
