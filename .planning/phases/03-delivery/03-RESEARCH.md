# Phase 3: Delivery - Research

**Researched:** 2026-03-09
**Domain:** PDF generation, WhatsApp Cloud API, Supabase Storage, patient portal auth, Supabase Realtime
**Confidence:** HIGH (stack is locked; primary findings verified via official docs and GitHub issues)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Use `@react-pdf/renderer` for server-side PDF generation in API routes (not jspdf)
- PDF contents: lab logo + name + address + phone, patient full name + doc type/number + DOB, order number + sample date + validation date, results table (test name | result | unit | reference range | flag H/L/C), validated-by footer, QR code bottom-right linking to `/verify/{verification_code}`, Spanish disclaimer text
- PDF size constraint: < 500KB
- PDFs stored in Supabase Storage, path in `orders.pdf_path` (schema uses `pdfPath`); serve via signed URLs expiring 1 hour; no public bucket access
- WhatsApp: Meta Cloud API direct (no Twilio), API version `v21.0`, endpoint `https://graph.facebook.com/v21.0/{phoneNumberId}/messages`
- Template: `resultado_listo`, UTILITY category, language `es`; `{{1}}` = patient first name, `{{2}}` = lab name, `{{3}}` = `https://labflash.co/r/{verification_code}`
- Env vars: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- Store `wamid` in `notifications.whatsapp_message_id`
- Webhook route: `POST /api/webhooks/whatsapp` + `GET /api/webhooks/whatsapp`
- Notification status transitions: `pending` → `sent` → `delivered` → `read`
- Patient portal route `/r/[verification_code]`: auth by document type + document number + DOB; no password
- Rate limit: max 5 attempts per verification_code per hour; 1-hour lockout after 5 failures
- QR verification route `/verify/[verification_code]`: public, no auth, shows authenticity only
- Audit log: `result_viewed`, `result_downloaded`, `notification_sent` events with IP + user agent
- Validate & Send is triggered from existing "Validate" button (Phase 2 wired this as `validateOrderAction`)
- Flow order: 1) validate order, 2) generate PDF, 3) upload to Storage, 4) update `orders.pdf_path`, 5) send WhatsApp, 6) create notifications record, 7) update order status to `delivered`, 8) audit log — WhatsApp failure must NOT block PDF storage or validation
- All forms + API routes (including webhooks): Zod validation before processing
- Supabase Realtime for dashboard delivery status updates
- All UI text in Spanish only
- Patient portal: minimal, mobile-first, white background, lab logo centered

### Claude's Discretion

- Whether to use upstash/redis or Supabase-based or in-memory rate limiting (given free tier, prefer Supabase-based or in-memory with a simple table)
- PDF template design details beyond spec requirements
- Error handling granularity in the validate-and-send pipeline
- Whether to use Supabase Realtime or polling for dashboard status updates

### Deferred Ideas (OUT OF SCOPE)

- Email channel notifications
- SMS channel
- Resend failed notifications UI (Phase 4)
- Audit log viewer in dashboard (Phase 4)
- Plan limits enforcement (Phase 4)
- Dashboard analytics (Phase 4)
- Lab settings for WhatsApp config (Phase 4)
- i18n / multi-language
- Native mobile app
- HL7/FHIR integration
- Patient accounts with passwords
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEL-01 | System generates a branded PDF from result items (lab logo, patient info, results table, validated-by footer, QR code) | @react-pdf/renderer 4.x + qrcode package; serverExternalPackages config; renderToBuffer in Route Handler |
| DEL-02 | PDFs stored in Supabase Storage with signed URLs (1-hour expiry, no public access) | supabase.storage.from().upload() + createSignedUrl(path, 3600) pattern |
| DEL-03 | Patient receives WhatsApp template message on validation (Meta Cloud API, template: resultado_listo, < 5s) | Graph API v21.0 fetch pattern; template body components structure |
| DEL-04 | Webhook handler processes WhatsApp delivery + read receipts (sent → delivered → read) | GET verification + POST status handler patterns; HMAC signature validation |
| DEL-05 | Lab dashboard shows real-time delivery status per order | Supabase Realtime postgres_changes on notifications table; useEffect subscribe/unsubscribe pattern |
| PORTAL-01 | Patient can open a result via unique secure link (/r/{verification_code}) | Next.js App Router dynamic route; public route outside (auth) group |
| PORTAL-02 | Patient authenticates by document type + document number + DOB | Server action with Drizzle query matching verification_code + patient fields |
| PORTAL-03 | Patient can view result PDF in browser | Signed URL passed to <iframe src> or <embed>; fresh URL per authenticated access |
| PORTAL-04 | Patient can download result PDF | Download link pointing to signed URL with Content-Disposition header |
| PORTAL-05 | Rate limiting (max 5 auth attempts per verification_code per hour; 1-hour lockout) | Supabase table-based counter approach (recommended over in-memory on Vercel serverless) |
| PORTAL-06 | QR verification page (/verify/{verification_code}) confirms authenticity | Public route; DB lookup only; partial patient name display |
| INFRA-06 | Zod validation on all forms and API routes | z.object() + safeParse() in all server actions and route handlers |
| INFRA-07 | PDF size < 500KB | Avoid embedded fonts (use standard PDF fonts); embed images as base64 only if small; QR as PNG data URL |
</phase_requirements>

---

## Summary

Phase 3 delivers four interconnected systems: PDF generation, Supabase Storage upload, WhatsApp dispatch, and a patient portal. The stack is fully locked by user decisions; the key research value here is confirming exact APIs, documented pitfalls, and the one critical compatibility issue discovered.

**Critical finding:** `@react-pdf/renderer`'s `renderToBuffer`/`renderToStream` fails in Next.js 15 App Router Route Handlers when React 19 is not the resolved version. The fix is straightforward: Next.js 15 already auto-adds `@react-pdf/renderer` to its `serverExternalPackages` list (confirmed in Next.js source as of v15), AND the package declares React 19 support since v4.1.0. The confirmed working fix is ensuring `react` and `react-dom` are pinned to `^19.0.0` — which this project already does (package.json shows `"react": "^19.0.0"`). No additional `next.config.ts` change is needed for bundling.

**WhatsApp webhook security:** Meta signs each webhook POST with `x-hub-signature-256`. The handler MUST read the body as raw text first, validate HMAC, then parse JSON — reading `req.json()` before HMAC validation will cause byte-order mismatches.

**Rate limiting decision:** In-memory rate limiting does NOT work reliably on Vercel serverless (each invocation may be a fresh process). Recommend a `portal_auth_attempts` table in Supabase — simple, free, already has DB access, no extra dependency.

**Primary recommendation:** Use a Next.js App Router Route Handler (`app/api/generate-pdf/route.ts`) with `renderToBuffer`, keeping the PDF component pure (no React context, no client APIs). Add `qrcode` package for QR data URL generation. Use the Supabase service-role client for Storage uploads in server-side code.

---

## Standard Stack

### Core Additions (not yet in package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-pdf/renderer` | `^4.3.2` | Server-side PDF generation | User decision; React 19 compatible since v4.1.0 |
| `qrcode` | `^1.5.4` | Generate QR PNG data URLs for PDF embedding | Simplest API: `QRCode.toDataURL(url)` returns base64 |
| `zod` | `^3.24.x` | Schema validation for server actions + API routes | Industry standard; required by INFRA-06 |
| `@types/qrcode` | `^1.5.5` | TypeScript types for qrcode | Dev dependency |

### Already in package.json

| Library | Version | Notes |
|---------|---------|-------|
| `@supabase/supabase-js` | `^2.48.1` | Storage client available via `supabase.storage` |
| `next` | `15.1.6` | Auto-externalizes @react-pdf/renderer |
| `react` / `react-dom` | `^19.0.0` | React 19 required for @react-pdf/renderer to work in API routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `qrcode` | `qrcode-svg` | SVG output doesn't embed cleanly in @react-pdf `<Image>` without conversion |
| Supabase table rate limiting | Upstash Redis | Upstash adds a paid dependency; Supabase table is free and already wired |
| Supabase Realtime | Polling every 5s | Realtime is lower latency and already included in Supabase free tier |

**Installation:**
```bash
npm install @react-pdf/renderer qrcode zod
npm install --save-dev @types/qrcode
```

---

## Architecture Patterns

### Recommended Project Structure for Phase 3

```
src/
├── app/
│   ├── api/
│   │   ├── webhooks/
│   │   │   └── whatsapp/
│   │   │       └── route.ts          # GET (verify) + POST (status updates)
│   ├── r/
│   │   └── [verification_code]/
│   │       └── page.tsx              # Patient portal (public)
│   └── verify/
│       └── [verification_code]/
│           └── page.tsx              # QR authenticity page (public)
├── lib/
│   ├── pdf/
│   │   ├── ResultPDF.tsx             # @react-pdf/renderer document component
│   │   └── generate-pdf.ts           # renderToBuffer wrapper
│   ├── whatsapp/
│   │   └── send-template.ts          # Meta Cloud API fetch wrapper
│   └── storage/
│       └── upload-pdf.ts             # Supabase Storage upload + signed URL
```

### Pattern 1: PDF Generation in a Route Handler

**What:** Call `renderToBuffer(<ResultPDF {...props} />)` inside a Route Handler, upload the resulting `Buffer` to Supabase Storage.
**When to use:** Triggered server-side during the validate-and-send flow (not via GET — called programmatically from a server action).

```typescript
// Source: confirmed via @react-pdf/renderer issue #3074 + Next.js serverExternalPackages docs
// src/lib/pdf/generate-pdf.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { ResultPDF } from "./ResultPDF";

export async function generateResultPDF(data: ResultPDFData): Promise<Buffer> {
  // Next.js 15 auto-externalizes @react-pdf/renderer — no next.config.ts change needed
  // Requires react@^19.0.0 (already in package.json)
  const buffer = await renderToBuffer(<ResultPDF data={data} />);
  return buffer;
}
```

```typescript
// src/lib/pdf/ResultPDF.tsx
// CRITICAL: No React.createContext(), no useEffect, no client APIs
import {
  Document, Page, Text, View, Image, StyleSheet
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica" },
  // Use built-in PDF fonts (Helvetica, Times-Roman, Courier) to keep < 500KB
  // NEVER embed custom TTF fonts unless absolutely required
});

export function ResultPDF({ data }: { data: ResultPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Lab header: logo (Image src={data.logoBase64}), name, address */}
        {/* Patient info section */}
        {/* Results table using View/Text rows */}
        {/* Validated-by footer */}
        {/* QR code: <Image src={data.qrDataUrl} style={{ width: 80, height: 80 }} /> */}
        {/* Spanish disclaimer */}
      </Page>
    </Document>
  );
}
```

### Pattern 2: QR Code as Base64 Data URL

```typescript
// Source: qrcode npm docs
// src/lib/pdf/generate-qr.ts
import QRCode from "qrcode";

export async function generateQRDataUrl(url: string): Promise<string> {
  // Returns "data:image/png;base64,..." — directly usable as <Image src={}> in @react-pdf
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 200, // 200px → renders fine at 80pt in PDF, stays small
  });
}
```

### Pattern 3: Supabase Storage Upload (Server-Side)

```typescript
// Source: Supabase JS SDK docs
// src/lib/storage/upload-pdf.ts
import { createClient } from "@supabase/supabase-js";

// Use SERVICE ROLE key for server-side storage operations (bypasses RLS on storage)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadPDF(
  buffer: Buffer,
  path: string // e.g. "results/{orderId}.pdf"
): Promise<string> {
  const { error } = await supabaseAdmin.storage
    .from("results") // bucket name
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from("results")
    .createSignedUrl(path, 3600); // 1 hour = 3600 seconds

  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
```

### Pattern 4: WhatsApp Template Message

```typescript
// Source: Meta Cloud API docs + WhatsApp Node.js SDK docs
// src/lib/whatsapp/send-template.ts

export async function sendResultadoListo(
  toPhone: string,         // international format, e.g. "573001234567"
  patientFirstName: string,
  labName: string,
  verificationCode: string
): Promise<string> {        // returns wamid
  const url = `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: "resultado_listo",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: patientFirstName },              // {{1}}
            { type: "text", text: labName },                        // {{2}}
            { type: "text", text: `https://labflash.co/r/${verificationCode}` }, // {{3}}
          ],
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.messages[0].id; // wamid string
}
```

### Pattern 5: Webhook Route Handler (GET + POST)

```typescript
// Source: pons.chat blog + Meta webhook docs (verified)
// src/app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

// GET: Meta webhook verification handshake
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST: delivery status updates
export async function POST(req: NextRequest) {
  // CRITICAL: read as text FIRST, then validate HMAC, then parse JSON
  const rawBody = await req.text();

  const sig = req.headers.get("x-hub-signature-256");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 401 });

  const expected = "sha256=" +
    createHmac("sha256", process.env.WHATSAPP_APP_SECRET!).update(rawBody).digest("hex");

  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Status update path: entry[].changes[].value.statuses[]
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const statuses = change.value?.statuses ?? [];
      for (const status of statuses) {
        // status.id = wamid, status.status = "sent"|"delivered"|"read"
        await updateNotificationStatus(status.id, status.status);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
```

### Pattern 6: Supabase Realtime in Client Component

```typescript
// Source: Supabase Realtime docs
// PREREQUISITE: Enable realtime on `notifications` table in Supabase dashboard
// (or via: alter publication supabase_realtime add table notifications;)
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // browser client

export function DeliveryStatusBadge({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>("pending");
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  return <Badge status={status} />;
}
```

### Pattern 7: Rate Limiting with Supabase Table

```typescript
// Recommended: Supabase table-based rate limiting
// Avoids in-memory (unreliable on Vercel serverless) and Upstash (paid dependency)

// Schema needed (add to migrations):
// CREATE TABLE portal_auth_attempts (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   verification_code text NOT NULL,
//   attempted_at timestamptz NOT NULL DEFAULT now()
// );

export async function checkRateLimit(
  verificationCode: string
): Promise<{ allowed: boolean }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from("portal_auth_attempts")
    .select("id", { count: "exact", head: true })
    .eq("verification_code", verificationCode)
    .gte("attempted_at", oneHourAgo);

  return { allowed: (count ?? 0) < 5 };
}

export async function recordAttempt(verificationCode: string) {
  await supabaseAdmin
    .from("portal_auth_attempts")
    .insert({ verification_code: verificationCode });
}
```

### Pattern 8: Zod in Server Actions and Route Handlers

```typescript
// Server action pattern
import { z } from "zod";

const PortalAuthSchema = z.object({
  documentType: z.enum(["CC", "TI", "CE", "PA", "CI"]),
  documentNumber: z.string().min(1).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
});

export async function authenticatePortalAction(formData: FormData) {
  const parsed = PortalAuthSchema.safeParse(
    Object.fromEntries(formData)
  );
  if (!parsed.success) {
    return { error: "Datos inválidos" };
  }
  // ... proceed with parsed.data
}

// Webhook route handler — validate body after HMAC check
const WhatsAppWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    changes: z.array(z.object({
      value: z.object({
        statuses: z.array(z.object({
          id: z.string(),
          status: z.enum(["sent", "delivered", "read", "failed"]),
          recipient_id: z.string(),
        })).optional(),
      }),
    })),
  })),
});
```

### Anti-Patterns to Avoid

- **Using React.createContext() inside PDF components:** @react-pdf/renderer runs in its own reconciler. Context from the outer React tree is not available. Pass all data as props.
- **Using `req.json()` before HMAC validation in webhook handler:** This consumes the body stream; HMAC will fail. Always use `req.text()` first.
- **In-memory rate limiting on Vercel:** Each function invocation may be a new cold start; counters don't persist. Use Supabase table.
- **Public Supabase Storage bucket for PDFs:** Signed URLs only — the bucket must remain private.
- **Embedding custom TTF fonts in PDF:** A single embedded font can add 200-400KB, busting the 500KB limit. Use Helvetica (built-in PDF font).
- **Calling revalidatePath inside the validate-and-send pipeline:** The pipeline runs in a server action; revalidatePath causes a full page reload. Supabase Realtime handles the live update; only revalidate the path after everything is complete.
- **Hardcoding the WhatsApp template component index:** Future template changes may reorder components. Keep the `components` array explicitly typed with `type: "body"`.
- **Not handling WhatsApp API failures gracefully:** WhatsApp failure must NOT prevent validation or PDF storage. Use try/catch around the send step and create a `failed` notifications record.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF document generation | Custom HTML→PDF converter | `@react-pdf/renderer` | Correct pagination, PDF spec compliance, font embedding, image handling |
| QR code PNG generation | Drawing QR matrix manually | `qrcode` npm package | Error correction, spec compliance, < 200 LOC vs thousands |
| HMAC signature verification | Custom byte comparison | `node:crypto` `timingSafeEqual` | Timing-safe; `===` comparison is vulnerable to timing attacks |
| Signed storage URLs | Custom S3-style signing | `supabase.storage.createSignedUrl()` | Supabase handles expiry, policy checks, token signing |

**Key insight:** The PDF domain has many invisible edge cases (font metrics, page breaks, unicode rendering, image resolution). @react-pdf/renderer handles all of them; building even a basic PDF renderer from scratch would take months.

---

## Common Pitfalls

### Pitfall 1: @react-pdf/renderer Fails in Next.js 15 Route Handler
**What goes wrong:** `TypeError: PDFDocument is not a constructor` or `Minified React error #31` when calling `renderToBuffer` in an App Router Route Handler.
**Why it happens:** `@react-pdf/reconciler` bundles its own copy of React; if the outer React version mismatches, the reconciler fails.
**How to avoid:** Ensure `react` and `react-dom` in package.json are `^19.0.0` (already true in this project). Next.js 15 also automatically adds `@react-pdf/renderer` to `serverExternalPackages`, preventing bundling conflicts.
**Warning signs:** Error appears on Vercel deployment but not locally (local dev may use different module resolution).

### Pitfall 2: WhatsApp Webhook Signature Validation Fails
**What goes wrong:** Webhook returns 401 for every Meta request; no status updates are processed.
**Why it happens:** `req.json()` was called before `req.text()`, or the `x-hub-signature-256` header comparison uses `===` instead of `timingSafeEqual`.
**How to avoid:** Always `const rawBody = await req.text()` first. Validate HMAC. Then `JSON.parse(rawBody)`.
**Warning signs:** All webhook calls log "Invalid signature" even when testing with the Meta dashboard.

### Pitfall 3: Supabase Realtime Subscription Not Firing
**What goes wrong:** Dashboard doesn't update when notification status changes.
**Why it happens:** The `notifications` table was not added to the `supabase_realtime` publication.
**How to avoid:** In Supabase dashboard → Database → Replication → enable `notifications` table. Or run: `alter publication supabase_realtime add table notifications;`
**Warning signs:** `channel.subscribe()` resolves without error but `postgres_changes` events never fire.

### Pitfall 4: PDF Exceeds 500KB
**What goes wrong:** PDF file is 600-800KB, fails INFRA-07.
**Why it happens:** Custom TTF font embedded (adds 200-400KB), or QR image generated at too high resolution.
**How to avoid:** Use built-in PDF fonts (`Helvetica`, `Times-Roman`). Generate QR at `width: 200` max. Compress lab logo before embedding (aim for < 50KB as base64). Avoid embedding large images.
**Warning signs:** `buffer.byteLength > 500_000` — add a check and log a warning.

### Pitfall 5: Supabase Storage RLS Blocks Server-Side Upload
**What goes wrong:** Storage upload returns "new row violates row-level security policy".
**Why it happens:** The Drizzle client uses the anonymous Supabase key, which is subject to storage RLS. No authenticated session exists in the server action context at time of upload.
**How to avoid:** Use a separate `createClient(url, SERVICE_ROLE_KEY)` admin client exclusively for Storage operations. This client bypasses RLS.
**Warning signs:** Upload works in local Supabase (RLS may be disabled) but fails in production.

### Pitfall 6: Rate Limiting State Lost on Vercel Cold Start
**What goes wrong:** Attacker makes 5 failed attempts, Vercel spins down the function, attempts counter resets to 0.
**Why it happens:** JavaScript module-level `Map` objects don't persist across Vercel invocations.
**How to avoid:** Use Supabase `portal_auth_attempts` table. Each attempt is recorded; count is queried per-request.
**Warning signs:** Rate limiting works locally (single process) but attackers can bypass it in production.

### Pitfall 7: WhatsApp Status Events Arrive Out of Order
**What goes wrong:** `read` arrives before `delivered`; status update logic skips `delivered`.
**Why it happens:** Meta does not guarantee event ordering.
**How to avoid:** Use `MAX` semantics for status — if incoming status is `read`, set to `read` regardless of current status. Define a numeric order: `pending=0, sent=1, delivered=2, read=3, failed=-1`. Only update if new ordinal > current ordinal (except `failed` which overrides all).

---

## Code Examples

### Validate-and-Send Server Action (Orchestration)

```typescript
// Source: derived from Phase 2 validateOrderAction pattern + this research
// src/app/dashboard/ordenes/[id]/actions.ts (extend existing file)

export async function validateAndSendAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  const orderId = formData.get("orderId") as string;
  if (!orderId) return { error: "Missing orderId" };

  // 1. Fetch order + patient + result items
  const order = await requirePendingOrder(orderId, lab.id);
  if (!order) return { error: "Order not found or already validated" };

  // 2. Mark validated FIRST (before PDF/WhatsApp — critical for idempotency)
  await db.update(orders)
    .set({ status: "validated", validatedById: user.id, validatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // 3. Generate PDF
  const qrUrl = `https://labflash.co/verify/${order.verificationCode}`;
  const qrDataUrl = await generateQRDataUrl(qrUrl);
  const pdfData = await buildPDFData(order, lab, user, qrDataUrl); // fetch items, patient
  const pdfBuffer = await generateResultPDF(pdfData);

  // 4. Upload to Supabase Storage
  const storagePath = `results/${orderId}.pdf`;
  await uploadPDF(pdfBuffer, storagePath);
  await db.update(orders).set({ pdfPath: storagePath }).where(eq(orders.id, orderId));

  // 5. Send WhatsApp (try/catch — failure must not block validation)
  let wamid: string | null = null;
  try {
    wamid = await sendResultadoListo(
      order.patient.phone!,
      order.patient.firstName,
      lab.name,
      order.verificationCode
    );
  } catch (e) {
    console.error("WhatsApp send failed:", e);
  }

  // 6. Create notifications record
  await db.insert(notifications).values({
    orderId,
    laboratoryId: lab.id,
    channel: "whatsapp",
    status: wamid ? "sent" : "failed",
    whatsappMessageId: wamid,
  });

  // 7. Update order to delivered (only if WhatsApp succeeded)
  if (wamid) {
    await db.update(orders).set({ status: "delivered" }).where(eq(orders.id, orderId));
  }

  // 8. Audit log
  await db.insert(auditLog).values({
    laboratoryId: lab.id,
    userId: user.id,
    action: "notification_sent",
    targetId: orderId,
  });

  revalidatePath(`/dashboard/ordenes/${orderId}`);
}
```

### Patient Portal Auth Check

```typescript
// Source: derived from Phase 2 patient query patterns + Drizzle ORM
export async function authenticatePortal(
  verificationCode: string,
  documentType: string,
  documentNumber: string,
  dateOfBirth: string
) {
  // 1. Rate limit check
  const { allowed } = await checkRateLimit(verificationCode);
  if (!allowed) return { error: "Demasiados intentos. Intente en 1 hora." };

  // 2. Record attempt BEFORE validation (counts regardless of outcome)
  await recordAttempt(verificationCode);

  // 3. Find order by verification code
  const result = await db
    .select({ order: orders, patient: patients })
    .from(orders)
    .innerJoin(patients, eq(orders.patientId, patients.id))
    .where(eq(orders.verificationCode, verificationCode))
    .limit(1);

  const row = result[0];
  if (!row) return { error: "Datos no coinciden" }; // generic error — no hints

  // 4. Validate patient identity
  if (
    row.patient.documentType !== documentType ||
    row.patient.documentNumber !== documentNumber ||
    row.patient.dateOfBirth !== dateOfBirth
  ) {
    return { error: "Datos no coinciden" };
  }

  return { success: true, orderId: row.order.id };
}
```

---

## Schema Additions Required

Phase 3 requires new DB tables not yet in `schema.ts`. The planner must include a Wave 0 migration task.

```typescript
// Additions to src/lib/db/schema.ts

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending", "sent", "delivered", "read", "failed"
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["whatsapp"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  laboratoryId: uuid("laboratory_id").notNull().references(() => laboratories.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull().default("whatsapp"),
  status: notificationStatusEnum("status").notNull().default("pending"),
  whatsappMessageId: text("whatsapp_message_id"),  // wamid from Meta API
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalAuthAttempts = pgTable("portal_auth_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  verificationCode: text("verification_code").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id").notNull().references(() => laboratories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => labUsers.id),
  action: text("action").notNull(),  // "notification_sent" | "result_viewed" | "result_downloaded"
  targetId: text("target_id"),       // orderId or other resource ID
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Note:** `orders` table already has `pdfPath` (text) and `verificationCode` (text) columns from Phase 2. `orders.status` enum needs `"delivered"` added if not already present — check current enum: `pending | validated | delivered` — it is present in Phase 2 schema. `orders.validatedById` and `orders.validatedAt` are also already present.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` (stable) | Next.js v15.0.0 | Config key changed; old key still works but deprecated |
| `@react-pdf/renderer` not React 19 compatible | Compatible since v4.1.0 | Late 2024 | No special workarounds needed if React 19 is installed |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 release | Use `useActionState` for form state with server actions |

**Deprecated/outdated:**
- `experimental.serverComponentsExternalPackages`: replaced by top-level `serverExternalPackages` in Next.js 15
- `useFormState` from `react-dom`: replaced by `useActionState` from `react` in React 19

---

## Open Questions

1. **Supabase Storage bucket creation**
   - What we know: SDK can upload to a bucket, but the bucket must pre-exist
   - What's unclear: Whether the `results` bucket will be created manually or via migration
   - Recommendation: Planner should include a Wave 0 task: create bucket via Supabase dashboard OR `supabaseAdmin.storage.createBucket('results', { public: false })`

2. **Lab logo storage path**
   - What we know: `laboratories.logo_url` is in schema; CONTEXT says to embed in PDF
   - What's unclear: Whether logo is a public URL (embeddable directly) or a Supabase Storage path (requires signed URL for fetching into buffer)
   - Recommendation: Fetch logo as a Buffer via `fetch(lab.logoUrl)` and convert to base64 for PDF embedding. Works for both public URLs and CDN-hosted images.

3. **Supabase Realtime `filter` on postgres_changes**
   - What we know: Filter syntax is `column=eq.value`
   - What's unclear: Whether filtering by `order_id` on notifications table requires Realtime to be enabled + table in publication
   - Recommendation: Planner should include Supabase dashboard step: enable Realtime for `notifications` table.

4. **WhatsApp template pre-approval**
   - What we know: `resultado_listo` template must be approved by Meta before it can be sent; approval takes 24-48h
   - What's unclear: Whether the template is already submitted/approved
   - Recommendation: This is a deployment blocker, not a code blocker. Code can be written against the expected approved template structure. Add a note in Wave verification.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — must be established in Wave 0 |
| Config file | None — Wave 0 task |
| Quick run command | `npx jest --testPathPattern=<file> --passWithNoTests` (after setup) |
| Full suite command | `npx jest --passWithNoTests` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEL-01 | PDF buffer generated with correct structure | unit | `npx jest tests/pdf.test.ts -t "generates PDF buffer"` | ❌ Wave 0 |
| DEL-02 | Storage upload returns path; signed URL is valid HTTPS | integration | manual-only (requires live Supabase) | ❌ |
| DEL-03 | WhatsApp send function builds correct request body | unit | `npx jest tests/whatsapp.test.ts -t "sends template"` | ❌ Wave 0 |
| DEL-04 | Webhook GET returns hub.challenge; POST updates status | unit | `npx jest tests/webhook.test.ts` | ❌ Wave 0 |
| DEL-05 | Realtime subscription fires on UPDATE | manual-only | Open dashboard, validate order, observe badge change | — |
| PORTAL-01 | `/r/[code]` route renders for valid code | smoke | `curl /r/{code}` → 200 | — |
| PORTAL-02 | Auth validates correct credentials; rejects wrong | unit | `npx jest tests/portal-auth.test.ts` | ❌ Wave 0 |
| PORTAL-03 | PDF viewer embedded in portal page | manual-only | Open `/r/{code}`, auth, observe iframe | — |
| PORTAL-04 | Download button triggers PDF download | manual-only | Click download, verify file | — |
| PORTAL-05 | Rate limiter blocks 6th attempt | unit | `npx jest tests/rate-limit.test.ts` | ❌ Wave 0 |
| PORTAL-06 | `/verify/[code]` returns patient partial name + dates | unit | `npx jest tests/verify.test.ts` | ❌ Wave 0 |
| INFRA-06 | Zod rejects invalid webhook body | unit | included in webhook tests | ❌ Wave 0 |
| INFRA-07 | PDF buffer < 500KB | unit | `expect(buffer.byteLength).toBeLessThan(500_000)` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run unit tests only: `npx jest --testPathPattern=tests/ --passWithNoTests`
- **Per wave merge:** Full suite: `npx jest --passWithNoTests`
- **Phase gate:** Full suite green + manual smoke of portal flow before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `jest.config.ts` + `package.json` test script — framework not installed
- [ ] `npm install --save-dev jest @types/jest ts-jest` — or vitest equivalent
- [ ] `tests/pdf.test.ts` — covers DEL-01, INFRA-07
- [ ] `tests/whatsapp.test.ts` — covers DEL-03
- [ ] `tests/webhook.test.ts` — covers DEL-04, INFRA-06
- [ ] `tests/portal-auth.test.ts` — covers PORTAL-02
- [ ] `tests/rate-limit.test.ts` — covers PORTAL-05
- [ ] `tests/verify.test.ts` — covers PORTAL-06
- [ ] Supabase `results` bucket creation — deployment prerequisite

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs — `serverExternalPackages` page (fetched 2026-03-09, v16.1.6 docs, confirms `@react-pdf/renderer` is auto-externalized): https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
- GitHub diegomura/react-pdf issue #3074 (fetched 2026-03-09): confirmed working fix is React ^19.0.0, which this project already uses
- Supabase JS SDK docs — storage upload + createSignedUrl: https://supabase.com/docs/reference/javascript/storage-from-upload
- Supabase Realtime docs — subscribing to postgres_changes: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- pons.chat WhatsApp Next.js webhook blog (verified against Meta webhook docs): https://pons.chat/blog/whatsapp-cloud-api-webhook-nextjs

### Secondary (MEDIUM confidence)
- WhatsApp Cloud API template message structure — cross-verified across WhatsApp Node.js SDK docs and Ycloud reference: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/
- qrcode npm package docs — `QRCode.toDataURL()` returning base64 PNG: https://www.npmjs.com/package/qrcode

### Tertiary (LOW confidence — flagged for validation)
- Rate limiting via Supabase table approach: derived from community patterns; confirm query performance is acceptable at MVP scale (< 10K rows)
- WhatsApp status ordering behavior (read before delivered): documented in Meta guides but behavior may vary by device; state machine approach is defensive coding

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — locked by user decisions; versions confirmed against official docs
- Architecture: HIGH — patterns verified against official SDK docs and confirmed working GitHub examples
- PDF/Next.js compatibility: HIGH — critical issue confirmed resolved by React 19 (already installed); `@react-pdf/renderer` auto-externalized by Next.js 15
- WhatsApp webhook: HIGH — full code pattern from verified source
- Rate limiting: MEDIUM — Supabase table approach is correct pattern; performance at scale not validated
- Pitfalls: HIGH — all sourced from official issue trackers or documented behavior

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days; Next.js and Supabase are stable; Meta API v21.0 current)
