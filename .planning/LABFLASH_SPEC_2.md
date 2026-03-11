# LABFLASH — Product Specification for MVP Build

> **Purpose:** This document defines exactly what to build. Hand it to Claude Code and execute.
> **Timeline:** 10 days to production MVP.
> **Builder:** Solo full-stack developer (Glenn).

---

## 1. WHAT IS LABFLASH

LabFlash is a **lightweight SaaS middleware** that automates the delivery of clinical laboratory results to patients via WhatsApp notification + secure web portal.

**It is NOT a LIS.** It does not manage samples, orders, or billing. It sits between the lab's existing system (whatever it is) and the patient's phone. One job: get validated results from point A (lab) to point B (patient's phone) — fast, secure, and with zero friction.

### The Problem It Solves

Clinical labs in Colombia and Venezuela (small/medium, 50-500 samples/day) deliver results manually: printed paper, phone calls, or photos via personal WhatsApp. Staff spends 2-4 hours/day answering "are my results ready?" calls. Patients must physically return to pick up a piece of paper. No traceability, no security, no compliance with data protection laws (Ley 1581 in Colombia).

### The Solution in One Sentence

When a lab technician marks results as "validated," the patient instantly receives a WhatsApp message with a secure link to download their PDF results — authenticated by their ID number + date of birth.

---

## 2. TECH STACK (ALL FREE TIER)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR + API routes in one codebase |
| **Database** | Supabase (PostgreSQL) | Free tier: 500MB, 50K MAUs, RLS built-in |
| **Auth** | Supabase Auth (email/password) | For lab staff login. Free 50K MAUs |
| **Storage** | Supabase Storage | PDFs. Free 1GB |
| **WhatsApp** | Meta Cloud API (direct) | $0.0002/msg utility in Colombia. NO Twilio |
| **Hosting** | Vercel | Free tier: 100GB bandwidth |
| **PDF Gen** | @react-pdf/renderer or jspdf | Client-side or server-side PDF generation |
| **ORM** | Drizzle ORM | Type-safe, lightweight |
| **UI** | shadcn/ui + Tailwind CSS | Professional UI fast |
| **Language** | TypeScript | End to end |
| **QR Codes** | qrcode (npm) | Verification QR on each PDF |

**Monthly cost at launch: ~$2-3 USD** (WhatsApp messages + domain amortized).

---

## 3. DATABASE SCHEMA

```sql
-- Multi-tenant: every query filters by laboratory_id via Supabase RLS

CREATE TABLE laboratories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for portal URL: labflash.co/portal/{slug}
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT NOT NULL DEFAULT 'Bogotá',
  country TEXT NOT NULL DEFAULT 'CO', -- 'CO' | 'VE'
  whatsapp_phone_id TEXT, -- Meta Cloud API phone number ID
  whatsapp_token TEXT, -- encrypted
  plan TEXT NOT NULL DEFAULT 'free', -- 'free' | 'essential' | 'professional' | 'enterprise'
  results_this_month INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'technician', -- 'admin' | 'technician' | 'reception'
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'CC', -- 'CC' | 'TI' | 'CE' | 'PA' | 'CI' (Venezuela)
  document_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL, -- used for portal auth
  phone TEXT NOT NULL, -- with country code: +57... or +58...
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(laboratory_id, document_type, document_number)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL, -- lab's internal order/accession number
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'validated' | 'delivered'
  notes TEXT,
  created_by UUID REFERENCES lab_users(id),
  validated_by UUID REFERENCES lab_users(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(laboratory_id, order_number)
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  pdf_storage_path TEXT, -- Supabase Storage path
  pdf_generated_at TIMESTAMPTZ,
  verification_code TEXT UNIQUE NOT NULL, -- short code for QR verification
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'upload' | 'api'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tracks each individual test within an order (optional for manual entry)
CREATE TABLE result_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL, -- e.g., "Hemoglobina", "Glucosa"
  value TEXT NOT NULL, -- e.g., "14.5", "Positivo"
  unit TEXT, -- e.g., "g/dL", "mg/dL"
  reference_range TEXT, -- e.g., "12.0 - 16.0"
  flag TEXT, -- 'normal' | 'high' | 'low' | 'critical'
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp' | 'email' | 'sms'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  whatsapp_message_id TEXT, -- Meta API message ID for tracking
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id UUID REFERENCES laboratories(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'result_viewed' | 'result_downloaded' | 'result_validated' | 'notification_sent'
  entity_type TEXT NOT NULL, -- 'order' | 'result' | 'notification'
  entity_id UUID NOT NULL,
  actor_type TEXT NOT NULL, -- 'lab_user' | 'patient' | 'system'
  actor_id TEXT, -- user ID or patient document number
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_patients_lab_doc ON patients(laboratory_id, document_number);
CREATE INDEX idx_orders_lab_status ON orders(laboratory_id, status);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_audit_lab_date ON audit_log(laboratory_id, created_at DESC);
CREATE INDEX idx_results_verification ON results(verification_code);
```

### Row Level Security (RLS) Policy Pattern

Every table with `laboratory_id` gets:

```sql
ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab users see only their lab data" ON [table]
  FOR ALL USING (
    laboratory_id IN (
      SELECT laboratory_id FROM lab_users
      WHERE auth_user_id = auth.uid()
    )
  );
```

The `patients` portal access is handled by API routes (no Supabase Auth for patients — they auth via document_number + date_of_birth).

---

## 4. CORE USER FLOWS

### Flow A: Lab Staff — Manual Result Entry & Delivery

```
1. Lab tech logs into dashboard (Supabase Auth)
2. Creates new order: selects/creates patient, enters order number
3. Enters result items (test name, value, unit, reference range)
   OR uploads a PDF directly
4. Clicks "Validate & Send"
5. System:
   a. Generates PDF with lab branding + QR code (if manual entry)
   b. Stores PDF in Supabase Storage
   c. Sends WhatsApp template message to patient:
      "Sus resultados del Laboratorio {lab_name} están listos.
       Acceda aquí: https://labflash.co/r/{verification_code}"
   d. Updates order status to 'delivered'
   e. Logs everything to audit_log
6. Dashboard shows: ✅ Sent | ✅ Delivered | ✅ Read (real-time)
```

### Flow B: Patient — Accessing Results

```
1. Patient receives WhatsApp: "Sus resultados están listos" + link
2. Opens link: https://labflash.co/r/{verification_code}
3. Auth screen: enters document number + date of birth
4. If match → shows result PDF in browser
5. Patient can download PDF
6. System logs: 'result_viewed' + 'result_downloaded' in audit_log
7. Lab dashboard updates in real-time: "Patient viewed results"
```

### Flow C: Lab Admin — Dashboard Overview

```
1. Admin sees today's stats:
   - Orders pending / validated / delivered
   - Notification delivery rate
   - Average time from validation to patient view
2. Patient lookup by name or document number
3. Resend notification for failed deliveries
4. User management (add/remove lab staff)
5. Lab settings (logo, name, WhatsApp config)
```

---

## 5. PAGE STRUCTURE & ROUTES

```
/                           → Marketing landing page (public)
/login                      → Lab staff login (Supabase Auth)
/register                   → Lab registration (create laboratory + first admin user)
/dashboard                  → Lab dashboard home (protected)
/dashboard/orders           → Orders list with filters (today, pending, delivered)
/dashboard/orders/new       → Create new order + patient
/dashboard/orders/[id]      → Order detail: enter results, validate, send
/dashboard/patients         → Patient directory for this lab
/dashboard/patients/[id]    → Patient history (all orders)
/dashboard/settings         → Lab settings, logo, WhatsApp config, users
/dashboard/analytics        → Simple metrics (results sent, delivery rate, open rate)
/portal/[lab_slug]          → Patient portal entry (public): lab-branded page
/r/[verification_code]      → Result access (public): auth + view/download PDF
/verify/[verification_code] → QR verification page (public): confirms result authenticity
/api/webhooks/whatsapp      → Meta Cloud API webhook for delivery/read receipts
/api/results/upload         → POST endpoint for file-based integration (future)
```

---

## 6. WHATSAPP INTEGRATION SPEC

### Meta Cloud API Setup (NOT Twilio)

1. Create Meta Business Account at business.facebook.com
2. Create WhatsApp Business App in Meta Developers
3. Get Phone Number ID + permanent access token
4. Register webhook URL: `https://labflash.co/api/webhooks/whatsapp`
5. Create message template (must be approved by Meta):

**Template name:** `resultado_listo`
**Category:** UTILITY
**Language:** es
**Body:**
```
Estimado/a {{1}}, sus resultados del laboratorio {{2}} ya están disponibles.

Acceda de forma segura aquí: {{3}}

Este enlace es personal e intransferible.
```
**Variables:** `{{1}}` = patient first name, `{{2}}` = lab name, `{{3}}` = secure URL

### Send Message (API route)

```typescript
// POST /api/notifications/send
async function sendWhatsAppNotification(
  phoneNumber: string,    // +573001234567
  patientName: string,
  labName: string,
  resultUrl: string,
  phoneNumberId: string,  // Meta's phone number ID
  accessToken: string     // Meta's access token
) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'template',
        template: {
          name: 'resultado_listo',
          language: { code: 'es' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: labName },
              { type: 'text', text: resultUrl },
            ]
          }]
        }
      })
    }
  );
  return response.json(); // { messages: [{ id: 'wamid.xxx' }] }
}
```

### Webhook Handler (delivery + read receipts)

```typescript
// POST /api/webhooks/whatsapp
// Updates notification status: sent → delivered → read
// Match via whatsapp_message_id stored in notifications table
```

---

## 7. PDF GENERATION SPEC

Each result PDF must include:

1. **Header:** Lab logo (if uploaded) + lab name + address + phone
2. **Patient info:** Full name, document type/number, date of birth
3. **Order info:** Order number, date of sample, date of validation
4. **Results table:** Test name | Result | Unit | Reference Range | Flag (H/L/C)
5. **Footer:** "Validated by: [tech name]" + validation date/time
6. **QR Code:** Bottom-right corner, links to `/verify/{verification_code}`
7. **Disclaimer:** "Este documento fue generado electrónicamente por LabFlash. Verifique su autenticidad escaneando el código QR."

**Style:** Clean, professional, black/white with lab accent color. Think: what a patient expects from a real lab report.

Use `@react-pdf/renderer` for server-side generation in API routes, or `jspdf` if simpler.

---

## 8. PATIENT PORTAL AUTH (NO passwords for patients)

Patients do NOT create accounts. Authentication is:

```
Step 1: Patient opens /r/{verification_code}
Step 2: Form asks for:
  - Tipo de documento (dropdown: CC, TI, CE, PA, CI)
  - Número de documento
  - Fecha de nacimiento (date picker)
Step 3: Backend validates:
  - verification_code exists in results table
  - document_number + date_of_birth match the patient linked to that order
Step 4: If match → render PDF viewer + download button
Step 5: If no match → generic error "Datos no coinciden" (no hints)
```

**Rate limiting:** Max 5 attempts per verification_code per hour. After that, lock for 1 hour. This prevents brute-force on patient data.

---

## 9. WHAT TO BUILD FIRST (PRIORITY ORDER)

Build in this exact order. Each step should be deployable independently.

### Phase 1: Foundation (Day 1-2)
- [ ] Next.js project with TypeScript + Tailwind + shadcn/ui
- [ ] Supabase project: database schema + RLS policies + auth
- [ ] Vercel deployment with custom domain placeholder
- [ ] Lab registration flow (create lab + admin user)
- [ ] Lab staff login/logout
- [ ] Basic dashboard layout (sidebar + header + content area)

### Phase 2: Core CRUD (Day 3-4)
- [ ] Patient CRUD (create, search, list)
- [ ] Order CRUD (create, list by status, detail view)
- [ ] Result entry form (test name, value, unit, range, flag)
- [ ] PDF upload alternative (drag & drop)
- [ ] Result validation button (changes status, records who/when)

### Phase 3: Delivery (Day 5-6)
- [ ] PDF generation from result items (branded, with QR)
- [ ] Supabase Storage integration (upload + signed URLs)
- [ ] Patient portal: auth screen + PDF viewer
- [ ] QR verification page
- [ ] WhatsApp send function (Meta Cloud API)
- [ ] Webhook handler for delivery/read receipts
- [ ] Auto-send on validation trigger

### Phase 4: Polish (Day 7-8)
- [ ] Dashboard analytics (results sent today, delivery rate, open rate)
- [ ] Lab settings page (logo upload, name, WhatsApp config)
- [ ] User management (invite lab staff, assign roles)
- [ ] Resend failed notifications
- [ ] Audit log viewer
- [ ] Plan limits enforcement (free = 30 results/month)

### Phase 5: Launch (Day 9-10)
- [ ] End-to-end testing (full flow: create order → validate → WhatsApp → patient downloads)
- [ ] Mobile responsiveness testing
- [ ] Security review: RLS, CORS, rate limiting, input validation (Zod)
- [ ] Landing page with value prop + registration CTA
- [ ] SEO basics (meta tags, OG images)
- [ ] Deploy to production domain
- [ ] Onboard first pilot lab

---

## 10. DESIGN SYSTEM (quick reference for UI)

**Colors:**
- Primary: `#0066FF` (trust blue — healthcare standard)
- Secondary: `#10B981` (green — "results ready" / success)
- Critical: `#EF4444` (red — critical results flag)
- Background: `#F8FAFC`
- Text: `#1E293B`

**Typography:** Inter (Google Fonts) — clean, modern, medical-friendly.

**Dashboard components (shadcn/ui):**
- `Card` for stat blocks
- `Table` for orders/patients lists
- `Badge` for status indicators (pending=yellow, validated=blue, delivered=green)
- `Dialog` for confirmations
- `Form` with Zod validation for all inputs
- `Toast` for success/error notifications

**Patient portal:** Minimal. White background, lab logo centered, form below. Mobile-first. No distractions.

---

## 11. ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# WhatsApp Meta Cloud API
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_VERIFY_TOKEN=labflash_webhook_verify_2024
WHATSAPP_APP_SECRET=abc123...

# App
NEXT_PUBLIC_APP_URL=https://labflash.co
NEXT_PUBLIC_APP_NAME=LabFlash

# PDF
PDF_ENCRYPTION_KEY=random_32_char_string
```

---

## 12. NON-FUNCTIONAL REQUIREMENTS

- **Response time:** Dashboard pages < 2s. Patient portal < 1s.
- **WhatsApp delivery:** < 5 seconds from "validate" click to patient receiving message.
- **PDF size:** < 500KB per result (optimized for mobile data in LATAM).
- **Mobile:** 100% responsive. Patient portal MUST work perfectly on cheap Android phones (Chrome, Firefox).
- **Security:** All PDFs served via Supabase signed URLs (expire in 1 hour). No direct public access to storage.
- **i18n:** Spanish only for MVP. All UI text in Spanish.
- **Accessibility:** Basic WCAG 2.1 AA compliance (contrast, labels, keyboard nav).

---

## 13. WHAT THIS IS NOT (scope boundaries)

Do NOT build any of these in the MVP:

- ❌ Sample/order management (that's a LIS)
- ❌ Billing or invoicing
- ❌ Appointment scheduling
- ❌ Patient accounts with passwords
- ❌ Native mobile app (web-only)
- ❌ HL7/FHIR integration (future Phase 2)
- ❌ Multi-language support
- ❌ Payment processing (manual billing for MVP)
- ❌ RIPS module
- ❌ AI/ML features
- ❌ Dark mode
- ❌ Chat support

---

## 14. SUCCESS CRITERIA

The MVP is "done" when:

1. A lab admin can register, create patients, enter results, and validate them.
2. Validating a result auto-generates a PDF and sends a WhatsApp to the patient.
3. The patient can open the link, authenticate with their ID + DOB, and download the PDF.
4. The lab dashboard shows real-time delivery status (sent/delivered/read).
5. The whole flow works end-to-end on a mobile phone in < 10 seconds.
6. It's deployed on Vercel + Supabase free tier and costs < $5/month.

---

## 15. MARKETS

### Colombia (Primary — Launch market)
- Pricing in COP: Free / $59,000 / $149,000 / $349,000 per month
- Document types: CC (Cédula), TI (Tarjeta de Identidad), CE (Cédula de Extranjería), PA (Pasaporte)
- Data protection: Ley 1581 de 2012 — requires consent, privacy notice, ARCO rights
- WhatsApp utility messages: ~$0.0002 USD each

### Venezuela (Secondary — Month 4+ expansion)
- Pricing in USD: Free / $8 / $20 / $45 per month
- Document types: CI (Cédula de Identidad), PA (Pasaporte)
- Data protection: No specific law, Constitutional Habeas Data (Art. 28) — lower compliance burden
- Payment methods: Zelle, Binance Pay, bank transfer USD
- Key difference: No regulatory urgency (no FEV-RIPS). Sell on competitive differentiation, not compliance.

---

*Built with urgency. Ship fast, iterate faster.*
