# Phase 4: Polish - Research

**Researched:** 2026-03-11
**Domain:** Lab admin settings, staff management, analytics, audit log, plan enforcement, superadmin panel, resend notifications — all within Next.js 15 App Router + Supabase + Drizzle ORM
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEL-06 | Lab staff can resend a WhatsApp notification for an order that failed or was never delivered | Resend action reuses existing `sendResultadoListo` + creates new notifications row; order must be `validated` status |
| LAB-01 | Lab admin can configure lab settings (name, logo upload, WhatsApp phone number ID + access token) | Supabase Storage for logo; `laboratories` table already has all columns; Server Action updates with Drizzle |
| LAB-02 | Lab admin can manage staff users (invite by email, assign role: admin/technician/reception, remove user) | `supabase.auth.admin.inviteUserByEmail()` via service role; `lab_users` insert on accept; remove = auth user delete + cascade |
| LAB-03 | Lab admin can view analytics (results sent today, delivery rate, avg time from validation to patient view) | Drizzle aggregate queries on `orders` + `notifications` + `audit_log`; all data already exists in DB |
| LAB-04 | Lab admin can view audit log (who accessed what, when, from which IP) | `audit_log` table exists; paginated query with Drizzle `limit`/`offset`; Server Component with URL search params |
| LAB-05 | Free plan capped at 30 results/month; system enforces limit, shows upgrade prompt | `laboratories.results_this_month` counter exists; check before `validateAndSendAction`; increment on validate; reset monthly |
| SADM-01 | Superadmin can view all registered labs (name, plan, results count, created date) | New `/superadmin` route group with separate auth guard; `createAdminClient()` bypasses RLS for cross-lab queries |
| SADM-02 | Superadmin can view notification logs for any lab | Cross-lab `notifications` + `orders` join using admin client |
| SADM-03 | Superadmin can view platform metrics (registrations today, active labs, monthly result volume) | Aggregate queries via admin client on `laboratories` + `orders` tables |
| SADM-04 | Superadmin can delete a lab account (GDPR/Ley 1581 right-to-deletion) | `laboratories` DELETE cascades to all child tables via FK; `supabase.auth.admin.deleteUser()` for each lab's auth users |
</phase_requirements>

---

## Summary

Phase 4 is a feature-dense administrative layer built entirely on top of the existing data model. Every requirement maps to tables and columns already defined in Phase 1-3 schema — no new DB tables are strictly required, though a `superadmin_users` mechanism must be introduced (simplest: an env-var-protected email list or a `is_superadmin` boolean on `lab_users`).

The primary technical challenges are: (1) **staff invitation flow** — Supabase Auth's `inviteUserByEmail` triggers an email with a magic link; the accepting user must then be linked to the correct `lab_users` row, which requires storing pending-invite state; (2) **superadmin isolation** — superadmin routes must bypass RLS entirely using `createAdminClient()` (service role key) and be guarded by a separate auth check so regular lab admins cannot reach them; (3) **plan limit enforcement** — `results_this_month` must be checked atomically in `validateAndSendAction` before incrementing, and a monthly reset job is needed (Supabase Edge Function cron or a lightweight SQL cron via `pg_cron`).

All UI follows established patterns: Server Components + `getLabUser()` guard, Server Actions for mutations, Drizzle for queries, shadcn/ui components throughout, Spanish-only copy.

**Primary recommendation:** Build in plan order (04-01 settings/staff, 04-02 analytics/audit/resend, 04-03 limits/superadmin) — each plan is independently deployable and the dependency graph flows that way.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | ^0.40.0 | All DB queries and mutations | Established pattern throughout codebase |
| `@supabase/supabase-js` | ^2.48.1 | Auth admin operations (invite, delete user) | Service role client already in `createAdminClient()` |
| `@supabase/ssr` | ^0.5.2 | Session-aware server client | All existing pages use this |
| `zod` | ^4.3.6 | Form/action input validation | Required per INFRA-06 |
| `react-hook-form` | ^7.54.2 | Settings/invite forms | Already installed |
| `sonner` | ^1.7.2 | Success/error toasts | Already installed |
| `lucide-react` | ^0.469.0 | Icons | Already installed |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next` | 15.1.6 | `revalidatePath`, Server Actions | Every mutation |
| shadcn/ui `Table` | via @radix-ui | Audit log, staff list, lab list | Tabular data display |
| shadcn/ui `Dialog` | via @radix-ui | Invite staff modal, confirm delete | Confirmation flows |
| shadcn/ui `Select` | via @radix-ui | Role picker in invite form | Dropdown selection |
| shadcn/ui `Badge` | already used | Plan indicator, role labels | Status display |

### New shadcn/ui components to add

These components are not yet in `src/components/ui/` and must be added via `npx shadcn@latest add`:

| Component | Why Needed |
|-----------|-----------|
| `table` | Audit log, staff list, superadmin lab list |
| `dialog` | Invite staff modal, delete confirmation |
| `select` | Role assignment dropdown in invite form |
| `alert` | Plan limit upgrade prompt / warning banners |
| `tabs` | Settings page (general / WhatsApp / staff subtabs) |
| `progress` | Results-this-month usage bar on dashboard |

**Installation:**
```bash
npx shadcn@latest add table dialog select alert tabs progress
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase `inviteUserByEmail` | Custom invite token table | `inviteUserByEmail` is simpler but requires service role key on every invite; custom tokens give more control but require more code |
| `pg_cron` for monthly reset | Vercel cron job (next.config route) | `pg_cron` runs in DB but needs Supabase paid plan; Vercel cron is free but adds a route handler |
| URL-param pagination for audit log | Cursor-based pagination | URL params (`?page=1`) are simpler for Server Components; cursor is better for huge tables (audit log may not reach that scale in MVP) |

---

## Architecture Patterns

### Recommended Route Structure for Phase 4

```
src/app/dashboard/
├── configuracion/
│   └── page.tsx              # LAB-01, LAB-02 — settings + staff management
├── analiticas/
│   └── page.tsx              # LAB-03 — analytics panel
├── auditoria/
│   └── page.tsx              # LAB-04 — audit log viewer (paginated)
└── ordenes/
    └── [id]/
        └── actions.ts        # DEL-06 resendNotificationAction added here

src/app/(superadmin)/
├── layout.tsx                # Superadmin auth guard (separate from getLabUser)
└── superadmin/
    ├── page.tsx              # SADM-01 — lab list
    ├── [labId]/
    │   └── notifications/
    │       └── page.tsx      # SADM-02 — lab notification log
    └── metricas/
        └── page.tsx          # SADM-03 — platform metrics

src/lib/auth/
└── get-superadmin.ts         # Guard: checks SUPERADMIN_EMAILS env var

src/lib/storage/
└── upload-logo.ts            # LAB-01 logo upload helper (mirrors upload-pdf.ts)
```

### Pattern 1: Settings Page with Server Action Update

**What:** Settings form reads current values from `getLabUser()`, submits via Server Action, updates `laboratories` table.
**When to use:** LAB-01 (lab name, WhatsApp config, logo).

```typescript
// src/app/dashboard/configuracion/actions.ts
"use server";
import { getLabUser } from "@/lib/auth/get-lab-user";
import { db } from "@/lib/db";
import { laboratories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SettingsSchema = z.object({
  name: z.string().min(2).max(100),
  whatsappPhoneId: z.string().optional(),
  whatsappToken: z.string().optional(),
});

export async function updateLabSettingsAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  if (user.role !== "admin") return; // Admin-only guard

  const parsed = SettingsSchema.safeParse({
    name: formData.get("name"),
    whatsappPhoneId: formData.get("whatsappPhoneId") || undefined,
    whatsappToken: formData.get("whatsappToken") || undefined,
  });
  if (!parsed.success) return;

  await db.update(laboratories)
    .set(parsed.data)
    .where(eq(laboratories.id, lab.id));

  revalidatePath("/dashboard/configuracion");
}
```

### Pattern 2: Logo Upload to Supabase Storage

**What:** Upload image file to Supabase Storage `logos` bucket, store public URL in `laboratories.logo_url`.
**When to use:** LAB-01 logo upload.

```typescript
// src/lib/storage/upload-logo.ts
import { getAdminClient } from "@/lib/supabase/server";

export async function uploadLogo(
  buffer: Buffer,
  labId: string,
  contentType: string
): Promise<string> {
  const adminClient = createAdminClient();
  const path = `logos/${labId}.${contentType.split("/")[1]}`;

  const { error } = await adminClient.storage
    .from("logos")
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw error;

  const { data } = adminClient.storage.from("logos").getPublicUrl(path);
  return data.publicUrl; // Logo is public — not sensitive
}
```

Key insight: Logo is NOT a signed URL. It is public (lab branding, used in PDF). The `logos` bucket must be created with public access policy in Supabase.

### Pattern 3: Staff Invitation via Supabase Auth Admin

**What:** Lab admin invites a new staff member by email. Supabase sends a magic-link email. On click, user lands at `/auth/callback`, which creates their `lab_users` row.
**When to use:** LAB-02 invite staff.

```typescript
// src/app/dashboard/configuracion/actions.ts
export async function inviteStaffAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  if (user.role !== "admin") return;

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = formData.get("role") as "admin" | "technician" | "reception";

  if (!email || !["admin", "technician", "reception"].includes(role)) return;

  const adminClient = createAdminClient();

  // Invite via Supabase Auth — sends email with magic link
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      laboratory_id: lab.id,
      role,
      full_name: email, // placeholder; user can update later
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
  });

  if (error) {
    // Handle "already registered" case
    return;
  }

  // Pre-create lab_users row with the auth user ID
  // (invite returns user.id even before they accept)
  await db.insert(labUsers).values({
    laboratoryId: lab.id,
    email,
    fullName: email, // updated when user sets their name
    role,
    authUserId: data.user.id,
  });

  revalidatePath("/dashboard/configuracion");
}
```

**Critical decision:** `inviteUserByEmail` returns the auth user ID immediately — insert `lab_users` row at invite time, not at callback time. This avoids a complex callback flow.

### Pattern 4: Remove Staff User

**What:** Delete `lab_users` row (cascade not enough — must also delete auth user or they can re-login).
**When to use:** LAB-02 remove staff.

```typescript
export async function removeStaffAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  if (user.role !== "admin") return;

  const staffId = formData.get("staffId") as string;

  // Fetch the auth_user_id before deleting
  const [staffRow] = await db.select()
    .from(labUsers)
    .where(and(eq(labUsers.id, staffId), eq(labUsers.laboratoryId, lab.id)))
    .limit(1);

  if (!staffRow) return;
  // Prevent admin from removing themselves
  if (staffRow.id === user.id) return;

  const adminClient = createAdminClient();

  // Delete auth user first (cascades nothing in Supabase Auth)
  await adminClient.auth.admin.deleteUser(staffRow.authUserId);

  // Delete lab_users row
  await db.delete(labUsers)
    .where(and(eq(labUsers.id, staffId), eq(labUsers.laboratoryId, lab.id)));

  revalidatePath("/dashboard/configuracion");
}
```

### Pattern 5: Analytics Queries with Drizzle Aggregates

**What:** Count results today, compute delivery rate, compute avg time from validated_at to first audit_log result_viewed event.
**When to use:** LAB-03 analytics panel.

```typescript
// Server Component query pattern
import { db } from "@/lib/db";
import { orders, notifications, auditLog } from "@/lib/db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";

// Results validated today
const today = new Date();
today.setHours(0, 0, 0, 0);

const [{ total }] = await db.select({ total: count() })
  .from(orders)
  .where(and(
    eq(orders.laboratoryId, lab.id),
    gte(orders.validatedAt, today),
    // status in ('validated', 'delivered')
  ));

// Delivery rate: delivered / validated this month
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const [stats] = await db.select({
  validated: count(),
  delivered: sql<number>`COUNT(*) FILTER (WHERE status = 'delivered')`,
}).from(orders)
  .where(and(eq(orders.laboratoryId, lab.id), gte(orders.validatedAt, monthStart)));
```

Note: Drizzle supports `sql` template tag for `FILTER (WHERE ...)` aggregate syntax, which is standard PostgreSQL. Confidence: HIGH (Drizzle docs confirm raw SQL fragments).

### Pattern 6: Paginated Audit Log

**What:** Server Component reads `?page=N` from URL search params, queries `audit_log` with `limit`/`offset`.
**When to use:** LAB-04 audit log viewer.

```typescript
// src/app/dashboard/auditoria/page.tsx
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { lab } = await getLabUser();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const PAGE_SIZE = 25;

  const logs = await db.select({ /* fields */ })
    .from(auditLog)
    .where(eq(auditLog.laboratoryId, lab.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  // ...
}
```

Note: In Next.js 15, `searchParams` is a `Promise` — must be awaited.

### Pattern 7: Plan Limit Enforcement

**What:** Before `validateAndSendAction` proceeds, check `laboratories.results_this_month >= 30` for free plan. Increment counter after successful validation.
**When to use:** LAB-05.

```typescript
// In validateAndSendAction, before marking validated:
if (lab.plan === "free" && lab.resultsThisMonth >= 30) {
  // Return an error signal — redirect or return { error: "plan_limit" }
  redirect(`/dashboard/ordenes/${orderId}?error=limite_plan`);
}

// After successful validation, increment counter:
await db.update(laboratories)
  .set({ resultsThisMonth: sql`results_this_month + 1` })
  .where(eq(laboratories.id, lab.id));
```

Monthly reset: simplest approach is a Vercel cron route (`/api/cron/reset-monthly`) with `Authorization: Bearer ${CRON_SECRET}` header check, running on the 1st of each month.

```typescript
// src/app/api/cron/reset-monthly/route.ts
export async function GET(request: Request) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const adminClient = createAdminClient();
  // Use admin client to bypass RLS and reset all labs
  await db.update(laboratories).set({ resultsThisMonth: 0 });
  return new Response("OK");
}
```

Vercel cron configured in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/reset-monthly", "schedule": "0 0 1 * *" }]
}
```

### Pattern 8: Superadmin Guard

**What:** Check that authenticated user's email is in `SUPERADMIN_EMAILS` env var (comma-separated list).
**When to use:** All `(superadmin)` route group pages.

```typescript
// src/lib/auth/get-superadmin.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const allowed = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase());

  if (!allowed.includes(user.email?.toLowerCase() ?? "")) {
    redirect("/dashboard");
  }

  return user;
}
```

Superadmin queries use `createAdminClient()` (service role) to bypass RLS and query across all labs.

### Pattern 9: Resend Notification (DEL-06)

**What:** For a `validated` order whose notification has `status = 'failed'` or has no notification row, create a new notification attempt.

```typescript
export async function resendNotificationAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  const orderId = formData.get("orderId") as string;

  // Fetch order (must be validated, not pending)
  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.laboratoryId, lab.id)))
    .limit(1);

  if (!order || order.status === "pending") return;

  const [patient] = await db.select().from(patients)
    .where(and(eq(patients.id, order.patientId), eq(patients.laboratoryId, lab.id)))
    .limit(1);

  if (!patient?.phone) return;

  let wamid: string | null = null;
  try {
    wamid = await sendResultadoListo(
      patient.phone, patient.firstName, lab.name, order.verificationCode
    );
  } catch { /* log */ }

  // Always insert a new notifications row (preserves history)
  await db.insert(notifications).values({
    orderId,
    laboratoryId: lab.id,
    channel: "whatsapp",
    status: wamid ? "sent" : "failed",
    whatsappMessageId: wamid,
  });

  // Advance order to delivered if send succeeded
  if (wamid) {
    await db.update(orders).set({ status: "delivered" })
      .where(eq(orders.id, orderId));
  }

  await db.insert(auditLog).values({
    laboratoryId: lab.id,
    userId: user.id,
    action: "notification_resent",
    targetId: orderId,
  });

  revalidatePath(`/dashboard/ordenes/${orderId}`);
}
```

### Anti-Patterns to Avoid

- **Using RLS-restricted `db` client for superadmin queries:** Always use `createAdminClient()` for cross-lab queries. The regular `db` client uses the pooler with Transaction mode — it does NOT enforce RLS, but it also cannot see other labs' data unless the service role key is used via `supabase-js`.
- **Deleting auth user without deleting lab_users first:** `lab_users` has `auth_user_id` NOT NULL — delete auth user then let DB cascade, or delete `lab_users` row first. FK cascade is on `laboratories.id`, not on `auth.users.id`. Must handle orphan prevention.
- **Not checking `user.role === "admin"` in settings actions:** Any authenticated lab user can call Server Actions — always guard admin-only actions by role check at the top.
- **Fetching logo as signed URL for PDF:** Logo should be stored as a public URL in the `logos` bucket. The `validateAndSendAction` already fetches `lab.logoUrl` via `fetch()` — keep this pattern consistent.
- **Incrementing `results_this_month` without reading current lab plan first:** Always re-fetch the lab row inside the transaction/action (not relying on the `getLabUser()` cached value) to avoid TOCTOU race.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email invitation flow | Custom token + email sender | `supabase.auth.admin.inviteUserByEmail()` | Handles magic link, email sending, and token expiry |
| File upload to storage | Direct browser → Supabase | Server Action receives File, calls admin storage client | Consistent with Phase 3 `uploadPDF` pattern; service role bypasses storage RLS |
| Password-based staff auth | Custom auth system | Supabase Auth | Already the project standard |
| Cross-tenant metrics queries | Supabase RLS workaround | `createAdminClient()` with service role | Admin client bypasses RLS by design |
| Monthly reset cron | In-app scheduler | Vercel cron + route handler | Zero infra overhead; free tier supports it |
| Pagination state | Client-side state | URL search params + Server Component | Next.js 15 canonical pattern; SEO-friendly, no hydration |

**Key insight:** Every piece of required infrastructure already exists in the Supabase + Vercel stack. Phase 4 is pure application code, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Supabase Invite Returns User Even If Already Registered

**What goes wrong:** `inviteUserByEmail` silently returns an existing auth user if the email is already registered. You insert a duplicate `lab_users` row, violating the `auth_user_id` UNIQUE constraint.
**Why it happens:** Supabase merges duplicate invites for the same email.
**How to avoid:** Check for existing `lab_users` row with that email before calling `inviteUserByEmail`. If found, return early with an appropriate error message.
**Warning signs:** `23505 duplicate key` error on `lab_users.auth_user_id`.

### Pitfall 2: Logo Bucket Must Be Public — Not Private

**What goes wrong:** Logo uploaded to a private bucket — `lab.logoUrl` is a storage path, not a public URL. `validateAndSendAction` calls `fetch(lab.logoUrl)` expecting an HTTP URL and gets 400/403.
**Why it happens:** Using same pattern as PDF bucket (private + signed URLs), which is wrong for logos.
**How to avoid:** Create a separate `logos` bucket with public access. Store the full `publicUrl` (not storage path) in `laboratories.logo_url`.
**Warning signs:** PDF generation fails with logo fetch error; logs show `fetch` error on `lab.logoUrl`.

### Pitfall 3: Next.js 15 searchParams is a Promise

**What goes wrong:** `searchParams.page` throws a runtime error — `searchParams` is not synchronously accessible in Next.js 15 App Router page components.
**Why it happens:** Next.js 15 made `searchParams` (and `params`) async Promises.
**How to avoid:** Always `await searchParams` before accessing properties: `const sp = await searchParams; const page = sp.page`.
**Warning signs:** TypeScript error "Property 'page' does not exist on type 'Promise<...>'".

### Pitfall 4: Plan Limit TOCTOU Race

**What goes wrong:** Two technicians click "Validate & Send" simultaneously on different orders — both read `resultsThisMonth = 29`, both pass the limit check, both increment to 30, resulting in 31 validated results on a free plan.
**Why it happens:** Read-then-write without locking.
**How to avoid:** Use PostgreSQL conditional update: `UPDATE laboratories SET results_this_month = results_this_month + 1 WHERE id = $1 AND (plan != 'free' OR results_this_month < 30) RETURNING results_this_month`. If no row returned (i.e., limit already hit), abort. With Drizzle, use `sql` template: `where(and(eq(laboratories.id, lab.id), or(ne(laboratories.plan, "free"), lt(laboratories.resultsThisMonth, 30))))`.
**Warning signs:** Free labs exceeding 30 validated results per month.

### Pitfall 5: Deleting Lab User in Wrong Order

**What goes wrong:** Deleting `lab_users` row before deleting Supabase auth user — auth user still exists and can log back in, landing on `cuenta_no_encontrada` redirect loop. Or: deleting auth user causes orphaned `lab_users` row because FK is on `laboratories.id`, not `auth.users.id`.
**Why it happens:** `lab_users.auth_user_id` references `auth.users(id)` but there is no ON DELETE CASCADE from auth.users into lab_users (Supabase Auth table is in a different schema). The Drizzle schema does not define this foreign key with cascade.
**How to avoid:** Sequence: (1) delete auth user via `adminClient.auth.admin.deleteUser(authUserId)`, (2) delete `lab_users` row. Wrap in try/catch; if auth delete fails, abort before deleting the DB row.
**Warning signs:** Ghost users who appear deleted in UI but can still authenticate.

### Pitfall 6: Superadmin Route Accessible to Lab Admins

**What goes wrong:** A crafty lab admin navigates directly to `/superadmin` and sees all labs' data.
**Why it happens:** Only checking `user.role === "admin"` not `is superadmin`.
**How to avoid:** `getSuperadmin()` must check email against `SUPERADMIN_EMAILS` env var, completely independent of `getLabUser()` / `user.role`. Place this guard at the layout level for the `(superadmin)` route group.
**Warning signs:** Any lab admin with `role = "admin"` can access cross-lab data.

### Pitfall 7: WhatsApp Credentials Stored Unencrypted

**What goes wrong:** `whatsapp_token` stored as plaintext in `laboratories.whatsapp_token`. If DB is compromised, all lab WhatsApp tokens are exposed.
**Why it happens:** Phase 1 schema stores it as plain `text`.
**How to avoid:** For MVP scope: acceptable risk (document it). If time permits, encrypt with `crypto.createCipheriv` using `WHATSAPP_TOKEN_ENCRYPTION_KEY` env var before storing. Decrypt in `validateAndSendAction` before use.
**Warning signs:** Post-MVP security audit will flag this.

---

## Code Examples

Verified patterns from existing codebase:

### Admin Role Guard in Server Action
```typescript
// Pattern established in existing actions — always guard admin operations
export async function adminOnlyAction(formData: FormData) {
  const { lab, user } = await getLabUser();
  if (user.role !== "admin") return; // Silently reject non-admins
  // ...
}
```

### Supabase Admin Client Usage (from server.ts)
```typescript
// createAdminClient() bypasses RLS — existing function in src/lib/supabase/server.ts
export function createAdminClient() {
  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### Drizzle SQL Fragment for Aggregates
```typescript
import { sql, count } from "drizzle-orm";

// Count with filter (PostgreSQL aggregate filter syntax)
const result = await db.select({
  total: count(),
  delivered: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'delivered')`,
}).from(orders).where(eq(orders.laboratoryId, lab.id));
```

### Double-Scoped Query Pattern (established in Phase 2)
```typescript
// Always scope by both laboratoryId AND the entity's own ID
const [row] = await db.select().from(labUsers)
  .where(and(
    eq(labUsers.id, staffId),
    eq(labUsers.laboratoryId, lab.id)  // belt-and-suspenders
  ))
  .limit(1);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase.auth.admin.inviteUserByEmail` requires magic link email flow | Same — still the standard | N/A | Staff must have a real email address |
| Vercel cron jobs required `vercel.json` | Still `vercel.json` with `"crons"` key | N/A | Add `vercel.json` if not already present |
| `searchParams` was sync | Next.js 15: `searchParams` is `Promise<{...}>` | Next.js 15 | Must `await searchParams` in page components |

**Deprecated/outdated:**
- `pages/api/` pattern: Not applicable — project uses App Router throughout. Do not create any `pages/` routes.
- `getServerSideProps`: Not applicable — App Router Server Components replace this.

---

## Open Questions

1. **WhatsApp credentials per-lab vs global**
   - What we know: Schema has `whatsapp_phone_id` and `whatsapp_token` per `laboratories` row. `sendResultadoListo` currently reads from env vars (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`).
   - What's unclear: Should Phase 4 switch `sendResultadoListo` to accept credentials as parameters (from `lab.whatsappPhoneId` / `lab.whatsappToken`) rather than reading env vars? This enables per-lab WhatsApp numbers.
   - Recommendation: Yes — modify `sendResultadoListo` signature to accept `phoneNumberId` and `accessToken` as optional params; fall back to env vars if not set. This unblocks LAB-01 while keeping Phase 3 behavior intact.

2. **Superadmin GDPR delete scope**
   - What we know: `laboratories` DELETE cascades to all child tables. SADM-04 says "delete a lab account."
   - What's unclear: Does deletion also remove the Supabase Storage files (PDFs, logos) for that lab?
   - Recommendation: Yes — before deleting the lab row, call `adminClient.storage.from("results").list(labId)` and delete all objects. This is the correct Ley 1581 right-to-erasure interpretation.

3. **`results_this_month` reset timing**
   - What we know: Column exists, currently initialized to 0 on lab creation.
   - What's unclear: Is the reset based on calendar month (1st of month) or rolling 30-day window?
   - Recommendation: Calendar month (1st of month) — simpler, more predictable for lab admins to understand their quota.

4. **Staff invitation email template**
   - What we know: Supabase sends a default "You've been invited" email.
   - What's unclear: Is the default Supabase invite email in Spanish or English?
   - Recommendation: Supabase Auth email templates are configurable in the Supabase dashboard (Authentication > Email Templates). Customize the "Invite" template to Spanish before Phase 4 goes live. This is a manual Supabase dashboard step, not a code step.

---

## Validation Architecture

nyquist_validation is enabled per config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest 29 |
| Config file | `jest.config.ts` (exists, `testMatch: ["**/tests/**/*.test.ts"]`) |
| Quick run command | `npm test -- --testPathPattern=tests/phase4` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEL-06 | `resendNotificationAction` inserts new notifications row, updates order status | unit | `npm test -- --testPathPattern=tests/resend` | Wave 0 |
| LAB-01 | `updateLabSettingsAction` rejects non-admins, validates with Zod, updates DB | unit | `npm test -- --testPathPattern=tests/lab-settings` | Wave 0 |
| LAB-02 | `inviteStaffAction` and `removeStaffAction` guard by role, prevent self-removal | unit | `npm test -- --testPathPattern=tests/staff-management` | Wave 0 |
| LAB-03 | Analytics query returns correct counts for today/this-month window | unit | `npm test -- --testPathPattern=tests/analytics` | Wave 0 |
| LAB-04 | Audit log query is scoped to lab, respects page/offset | unit | `npm test -- --testPathPattern=tests/audit-log` | Wave 0 |
| LAB-05 | Plan limit blocks validation at 30, allows at 29, increments atomically | unit | `npm test -- --testPathPattern=tests/plan-limits` | Wave 0 |
| SADM-01 | `getSuperadmin` redirects non-superadmin emails | unit | `npm test -- --testPathPattern=tests/superadmin` | Wave 0 |
| SADM-04 | Lab delete cascades to storage cleanup | integration | manual only — requires live Supabase | manual |

### Sampling Rate

- **Per task commit:** `npm test -- --testPathPattern=tests/phase4` (or relevant test file)
- **Per wave merge:** `npm test` (full suite — all 6 existing + new phase 4 tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/resend.test.ts` — covers DEL-06 resend logic
- [ ] `tests/lab-settings.test.ts` — covers LAB-01 settings update + role guard
- [ ] `tests/staff-management.test.ts` — covers LAB-02 invite guard + self-removal prevention
- [ ] `tests/analytics.test.ts` — covers LAB-03 query math
- [ ] `tests/audit-log.test.ts` — covers LAB-04 pagination scoping
- [ ] `tests/plan-limits.test.ts` — covers LAB-05 limit check at 29 and 30
- [ ] `tests/superadmin.test.ts` — covers SADM-01 auth guard email check

---

## Sources

### Primary (HIGH confidence)

- Codebase inspection (`src/lib/db/schema.ts`, `src/lib/supabase/server.ts`, `src/lib/auth/get-lab-user.ts`, `src/app/dashboard/ordenes/[id]/actions.ts`) — direct read of existing patterns
- `package.json` — all installed library versions confirmed
- Next.js 15 App Router: `searchParams` as Promise — confirmed by reading `src/app/r/[verification_code]/page.tsx` which uses the async `params` pattern already established in Phase 3

### Secondary (MEDIUM confidence)

- Supabase Auth `inviteUserByEmail` API — documented in official Supabase docs; returns auth user with ID before acceptance; this pattern is standard for Supabase Auth admin flows
- Vercel cron jobs via `vercel.json` — documented Vercel feature; free on all plans including Hobby

### Tertiary (LOW confidence — flag for validation)

- `supabase.auth.admin.deleteUser` cascade behavior with `lab_users.auth_user_id` FK: the exact behavior when auth user is deleted while `lab_users` row references them depends on whether Supabase enforces FK constraints from `auth.users` to `public.lab_users`. In practice, Supabase does NOT automatically cascade deletes from `auth.users` to custom tables — the application must handle the `lab_users` delete explicitly (documented as the approach above).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries already installed and in use
- Architecture: HIGH — patterns directly derived from existing Phase 1-3 code
- Staff invitation flow: MEDIUM — Supabase `inviteUserByEmail` is documented but edge cases (duplicate email, token expiry) require integration testing
- Plan limit atomicity: MEDIUM — PostgreSQL conditional update is correct but exact Drizzle syntax for `RETURNING` + abort flow needs verification during implementation
- Pitfalls: HIGH — all identified pitfalls are grounded in existing codebase decisions

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable stack — Supabase/Next.js/Drizzle APIs unlikely to break in 30 days)
