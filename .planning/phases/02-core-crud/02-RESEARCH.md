# Phase 2: Core CRUD - Research

**Researched:** 2026-03-09
**Domain:** Next.js 15 App Router CRUD with Drizzle ORM, Supabase, Server Actions, file upload
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAT-01 | Lab staff can create a patient (document type, document number, first/last name, DOB, phone with country code) | Drizzle insert pattern + Server Action form handling |
| PAT-02 | Lab staff can search patients by name or document number | Drizzle `ilike` + GET form searchParam pattern |
| PAT-03 | Lab staff can view patient history (all orders for a patient) | Drizzle join/select scoped to lab.id — two-query approach |
| PAT-04 | Patient records are isolated per lab (no cross-lab data leakage) | RLS + explicit `laboratoryId` WHERE clause on every query |
| ORD-01 | Lab staff can create a new order (select or create patient, enter order number) | Server Action + nanoid for verificationCode generation |
| ORD-02 | Lab staff can view orders list with filters (today / pending / validated / delivered) | Drizzle conditional WHERE + GET searchParam tabs |
| ORD-03 | Lab staff can view order detail page | Multi-entity Server Component — fetch order + patient + validatedBy |
| ORD-04 | Lab staff can enter result items per order (test name, value, unit, reference range, flag) | Drizzle insert to order_items + revalidatePath pattern |
| ORD-05 | Lab staff can upload a PDF as alternative to manual result entry (drag & drop) | HTML5 DragEvent Client Component + Server Action FormData file |
| ORD-06 | Lab staff can validate an order ("Validate & Send" locks order, records who, when) | Drizzle update status/validatedById/validatedAt on pending orders only |
</phase_requirements>

---

## Summary

Phase 2 builds the complete patient and order workflow on top of the auth + dashboard shell established in Phase 1. The domain spans: relational schema extension (patients, orders, order_items), multi-tenant data isolation carried through every query, Server Actions for all mutations, and two Client Components (result item form, PDF drag-and-drop upload). All UI text is in Spanish. No new third-party libraries are required except `nanoid` for generating short unique verification codes.

The stack is locked and well-understood from Phase 1 patterns. The primary technical concerns for planning are: (1) the Drizzle `db` client uses the Transaction mode pooler which does NOT enforce RLS — every query MUST include an explicit `laboratoryId = lab.id` WHERE clause as the application-level isolation guarantee; (2) the relational query API `.query.*` must NOT be used — only `.select().from().where()`; (3) `revalidatePath()` is the correct mechanism for optimistic-free page refresh after Server Action mutations on the same URL; (4) PDF upload in Phase 2 is a stub (stores filename placeholder) — the actual Supabase Storage upload is deferred to Phase 3.

**Primary recommendation:** Follow the three plan files already written for Phase 2 exactly. The schema design, Server Action patterns, and component boundaries are already specified at implementation depth. The planner's job is to confirm the wave ordering (02-01 → 02-02 → 02-03) and verify each plan's `must_haves` section covers the requirement it maps to.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.40.0 | Type-safe Postgres queries | Already installed; all Phase 1 data access uses this |
| postgres | ^3.4.5 | Postgres driver for Drizzle | Already installed; `prepare: false` set for Supabase pooler |
| next | 15.1.6 | App Router, Server Actions, Server Components | Locked stack |
| @supabase/ssr | ^0.5.2 | Auth session management | Already installed |
| nanoid | ^5.0.0 | Short unique ID generation for verificationCode | Standard in Node.js ecosystem; ESM-compatible |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.469.0 | Icon set | Already installed — use for UI affordances (search icon, upload icon) |
| sonner | ^1.7.2 | Toast notifications | Already installed — optional for upload success/error feedback |
| react-hook-form | ^7.54.2 | Complex form state | Already installed — available if inline form handling becomes unwieldy, but Server Action + formRef.reset() is sufficient for the simple forms in this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid | crypto.randomUUID() | UUID is longer (36 chars vs 12); nanoid 12 is URL-friendlier for verification codes |
| GET form for search | Client-side filter with useState | GET form is simpler, bookmarkable, zero JS needed, works with Server Components |
| revalidatePath() | redirect() | revalidatePath stays on the same page; redirect after mutation loses the URL context for order detail |
| Two separate selects for patient lookup | SQL JOIN | Drizzle `.select()` API supports `leftJoin()` but two selects with `inArray()` is more readable and avoids N+1 for batch patient name resolution |

**Installation:**
```bash
npm install nanoid
```
(All other dependencies are already installed.)

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/dashboard/
│   ├── pacientes/
│   │   ├── page.tsx              # Patient list + search (Server Component)
│   │   ├── nuevo/
│   │   │   ├── page.tsx          # Create patient form (Server Component)
│   │   │   └── actions.ts        # createPatientAction
│   │   └── [id]/
│   │       └── page.tsx          # Patient detail + order history (Server Component)
│   └── ordenes/
│       ├── page.tsx              # Order list + filter tabs (Server Component)
│       ├── nueva/
│       │   ├── page.tsx          # Create order form (Server Component)
│       │   └── actions.ts        # createOrderAction
│       └── [id]/
│           ├── page.tsx          # Order detail (Server Component, updated in 02-03)
│           ├── actions.ts        # addResultItemAction, uploadPdfAction, validateOrderAction
│           ├── result-items-form.tsx  # Client Component — inline row form
│           └── pdf-upload.tsx        # Client Component — drag-and-drop zone
└── lib/db/
    └── schema.ts                 # Extended with patients, orders, order_items tables
```

### Pattern 1: Multi-tenant Query Guard (CRITICAL)
**What:** Every Drizzle query for tenant-scoped data MUST include `laboratoryId = lab.id` in the WHERE clause, even when RLS is enabled on Supabase.
**When to use:** Every read/write to patients, orders, order_items.
**Why:** The Drizzle `db` client connects via the Transaction mode connection pooler (port 6543). This pooler does NOT forward Supabase auth JWTs, so `auth.uid()` is always `null` from PostgreSQL's perspective. RLS policies evaluate to false and would block all queries if `db` bypassed RLS — but the pooler actually runs as the postgres superuser, bypassing RLS entirely. Application-level `laboratoryId` scoping in WHERE clauses is the security boundary.

```typescript
// CORRECT — always scope to lab.id
const patient = await db
  .select()
  .from(patients)
  .where(and(eq(patients.id, params.id), eq(patients.laboratoryId, lab.id)))
  .limit(1);
if (!patient[0]) notFound();

// WRONG — no lab scoping (cross-lab data leakage)
const patient = await db.select().from(patients).where(eq(patients.id, params.id));
```

### Pattern 2: Server Action with getLabUser Guard
**What:** Every Server Action calls `getLabUser()` first to verify session and get `lab.id` / `user.id`.
**When to use:** All form submissions, mutations.

```typescript
"use server"
import { getLabUser } from "@/lib/auth/get-lab-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createPatientAction(formData: FormData) {
  const { lab } = await getLabUser(); // redirects to /login if no session

  // validate inputs
  const firstName = (formData.get("firstName") as string)?.trim();
  if (!firstName) redirect("/dashboard/pacientes/nuevo?error=campos_requeridos");

  await db.insert(patients).values({ laboratoryId: lab.id, firstName, /* ... */ });
  redirect("/dashboard/pacientes");
}
```

### Pattern 3: revalidatePath for In-Page Mutations
**What:** Use `revalidatePath()` instead of `redirect()` when the mutation should refresh the current page (order detail adding result items).
**When to use:** Mutations where the user stays on the same URL.

```typescript
export async function addResultItemAction(formData: FormData) {
  // ... insert ...
  revalidatePath(`/dashboard/ordenes/${orderId}`);
  // NO redirect — user stays on the order detail page
}
```

### Pattern 4: GET Form for Filtering and Search
**What:** Use `<form method="GET">` with a named text input for search/filter — no Server Action needed.
**When to use:** Search bars, status filter tabs.

```tsx
// Search — pure GET form, no JS required
<form method="GET">
  <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Buscar paciente..." />
  <button type="submit">Buscar</button>
</form>

// Filter tabs — plain anchor links
<a href="?estado=pendiente" className={estado === "pendiente" ? "active" : ""}>Pendientes</a>
```

### Pattern 5: Client Component Boundaries
**What:** Keep Server Components as the data-fetching layer; push interactivity into narrow Client Components.
**When to use:** Forms that need `useRef` for reset after submit, drag-and-drop zones.

```typescript
// result-items-form.tsx
"use client"
import { useRef } from "react";

export function ResultItemsForm({ orderId, isPending }: { orderId: string; isPending: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  async function handleSubmit(formData: FormData) {
    await addResultItemAction(formData);
    formRef.current?.reset(); // clear inputs after successful add
  }
  return <form ref={formRef} action={handleSubmit}>...</form>;
}
```

### Pattern 6: Drizzle inArray for Batch Lookups (N+1 Prevention)
**What:** When rendering a list that needs a related entity's name (e.g. patient name on order row), fetch all related records in one query using `inArray`.
**When to use:** Orders list page — patient names for all orders on the page.

```typescript
import { inArray } from "drizzle-orm";

// Collect unique patient IDs from order rows
const patientIds = [...new Set(orderRows.map(o => o.patientId))];
const patientRows = patientIds.length > 0
  ? await db.select({ id: patients.id, firstName: patients.firstName, lastName: patients.lastName })
      .from(patients)
      .where(inArray(patients.id, patientIds))
  : [];
const patientMap = Object.fromEntries(patientRows.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
```

### Anti-Patterns to Avoid
- **Using `.query.*` API:** The Drizzle relational query API may have compatibility issues with the Transaction mode pooler. Use `.select().from().where()` exclusively (established in Phase 1 Summary).
- **Fetching patients/orders without lab.id scope:** Every query must be scoped. Missing this is a security bug, not a UX bug.
- **N+1 queries in list views:** Always batch-fetch related names with `inArray` — never query inside a `.map()`.
- **Using Supabase client for data reads in Server Components:** The Supabase JS client with the user's JWT is for auth operations and future client-side RLS-enforced reads. Server Components use the Drizzle `db` client with explicit lab scoping.
- **File upload without content-type validation:** Always check `file.type === "application/pdf"` server-side — the client filter (`accept="application/pdf"`) is UI-only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Short unique codes for verification_code | Custom base62 random string | `nanoid(12)` | Correct entropy, URL-safe, widely used, 5 lines to install |
| Search with partial match | Custom string splitting | Drizzle `ilike(col, \`%${q}%\`)` | Proper SQL ILIKE with parameterization; safe from injection |
| Page refresh after mutation | manual router.refresh() | `revalidatePath()` | Correct Next.js 15 App Router pattern — avoids stale cache |
| Date formatting | Custom date string | `new Date(ts).toLocaleString("es-CO")` | Built-in, respects Colombian locale |
| Drag-and-drop state | External DnD library | HTML5 `DragEvent` directly | Simpler, zero dependencies for single-file upload zone |

**Key insight:** Phase 2 is intentionally simple CRUD. Every temptation to reach for a library should be evaluated against "can I do this with the built-in platform APIs?" For this phase, the answer is almost always yes.

---

## Common Pitfalls

### Pitfall 1: Missing laboratoryId Scope (Security Bug)
**What goes wrong:** Patient or order data from another lab is returned or mutated.
**Why it happens:** Developer adds `eq(patients.id, params.id)` but forgets `eq(patients.laboratoryId, lab.id)`. The Drizzle pooler bypasses RLS so there's no DB-level safety net.
**How to avoid:** Every `.where()` on tenant-scoped tables MUST include `laboratoryId = lab.id` as the first condition. Use `and()` to combine with row-specific predicates.
**Warning signs:** Fetching a patient/order by ID only, without lab scoping.

### Pitfall 2: Mutating Validated Orders
**What goes wrong:** Result items can be added to an already-validated order, breaking the audit trail.
**Why it happens:** Server Action doesn't check order status before inserting.
**How to avoid:** In `addResultItemAction` and `uploadPdfAction`, fetch the order first and check `order.status === "pending"` before any mutation. Silently return if not pending.
**Warning signs:** Any insert into `order_items` or update to `orders.pdfPath` without a status guard.

### Pitfall 3: revalidatePath vs redirect Confusion
**What goes wrong:** Using `redirect()` in `addResultItemAction` causes the form URL to change, losing draft state. Or using `revalidatePath()` in `createPatientAction` means the user stays on the create form instead of seeing the list.
**How to avoid:**
- Create/delete mutations → `redirect()` to the canonical list or detail URL.
- In-page updates (add result item, upload PDF, validate) → `revalidatePath(currentUrl)`.
**Warning signs:** Result items form that redirects away, or create form that doesn't navigate after success.

### Pitfall 4: Patient Search with Full-Name Match
**What goes wrong:** Searching "juan garcia" doesn't match a patient stored as firstName="Juan", lastName="García".
**Why it happens:** Trying to ILIKE against a concatenated full_name that doesn't exist as a column.
**How to avoid:** Search firstName OR lastName OR documentNumber independently with three `ilike()` calls joined by `or()`. Do not try to search across a concatenated value.

```typescript
or(
  ilike(patients.firstName, `%${q}%`),
  ilike(patients.lastName, `%${q}%`),
  ilike(patients.documentNumber, `%${q}%`)
)
```

### Pitfall 5: nanoid Import in Server Action
**What goes wrong:** `nanoid` v5+ is ESM-only. Dynamic `require()` or CJS imports fail.
**Why it happens:** Next.js 15 with TypeScript may need explicit ESM handling for ESM-only packages.
**How to avoid:** Use `import { nanoid } from "nanoid"` (ESM import). Next.js 15 handles ESM-only packages in Server Actions correctly. If issues arise, pin to `nanoid@4` which has CJS support, or use `crypto.randomBytes(9).toString("base64url")` as a stdlib alternative.

### Pitfall 6: File Upload Action with Large PDFs
**What goes wrong:** Uploading a large PDF through a Next.js Server Action exceeds the default 1MB body limit.
**Why it happens:** Next.js has a default `bodySizeLimit` of 1MB for Server Actions.
**How to avoid:** Phase 2 is a stub (stores filename only, no actual file data). Phase 3 will need to configure `bodySizeLimit` in `next.config.ts` when actual Supabase Storage uploads are implemented:
```typescript
// next.config.ts — needed in Phase 3, NOT Phase 2
experimental: {
  serverActions: {
    bodySizeLimit: "5mb",
  },
},
```
For Phase 2, the upload action receives the file object but should NOT store the binary content — just store the filename as a placeholder path string.

---

## Code Examples

Verified patterns from Phase 1 established conventions:

### Schema Extension Pattern (Drizzle)
```typescript
// Append to src/lib/db/schema.ts — do NOT replace existing exports
export const documentTypeEnum = pgEnum("document_type", ["CC", "CE", "PA", "RC", "TI"]);

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  laboratoryId: uuid("laboratory_id").notNull().references(() => laboratories.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  documentNumber: text("document_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(), // ISO "YYYY-MM-DD"
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
```

### Order Status Validation in Server Action
```typescript
// Verify order is pending before mutation (addResultItemAction, validateOrderAction)
const orderRows = await db
  .select()
  .from(orders)
  .where(and(eq(orders.id, orderId), eq(orders.laboratoryId, lab.id)))
  .limit(1);
const order = orderRows[0];
if (!order || order.status !== "pending") return; // silently reject
```

### Validation Update (ORD-06)
```typescript
await db
  .update(orders)
  .set({
    status: "validated",
    validatedById: user.id,    // from getLabUser() LabContext
    validatedAt: new Date(),
  })
  .where(eq(orders.id, orderId));
revalidatePath(`/dashboard/ordenes/${orderId}`);
```

### Filter Tabs Pattern (ORD-02)
```typescript
// Server Component — read searchParam, build conditional query
const estado = (await searchParams)?.estado as string | undefined;
const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

const whereClause = estado === "hoy"
  ? and(eq(orders.laboratoryId, lab.id), gte(orders.createdAt, todayStart))
  : estado === "pendiente"
  ? and(eq(orders.laboratoryId, lab.id), eq(orders.status, "pending"))
  : eq(orders.laboratoryId, lab.id); // all orders (default)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes for mutations | Next.js 15 Server Actions | Next.js 13+ | No separate API layer; mutations co-located with routes |
| `getServerSideProps` for auth check | `getLabUser()` called in Server Component body | Next.js 13 App Router | Cleaner, no prop drilling, redirects work via `next/navigation` |
| Client-side form submission with SWR/React Query | Server Action + revalidatePath | Next.js 14+ | Zero client JS for CRUD mutations; built-in optimistic patterns available |
| File upload via separate API route | Server Action with File from FormData | Next.js 14+ | Unified, but `bodySizeLimit` must be configured for large files |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: Not applicable in App Router.
- Separate `pages/api/` routes for mutations: Replaced by Server Actions in this project.
- `.query.*` relational API: NOT used in this project due to pooler compatibility (established in Phase 1 Summary).

---

## Open Questions

1. **nanoid ESM compatibility with the specific Docker/Node version in use**
   - What we know: nanoid v5 is ESM-only; Next.js 15 handles ESM packages in Server Actions.
   - What's unclear: The exact Node.js version in the Docker container and whether the project's `tsconfig.json` `moduleResolution` setting is `bundler` (which handles ESM correctly).
   - Recommendation: If nanoid import fails, fall back to `crypto.randomBytes(9).toString("base64url")` which is stdlib and has no ESM concerns.

2. **bodySizeLimit for PDF upload in Phase 2**
   - What we know: Phase 2 is a stub — the file object is received but only the filename is stored. The binary content is NOT written to storage.
   - What's unclear: Whether Next.js enforces bodySizeLimit even when the action doesn't read the file bytes from storage.
   - Recommendation: For Phase 2, this is not a problem. Flag for Phase 3 when actual Supabase Storage upload is implemented.

3. **Drizzle Kit push vs manual SQL for new tables**
   - What we know: Phase 1 applied RLS via manual SQL. Phase 2 adds patients/orders/order_items tables AND needs RLS on those tables.
   - What's unclear: Whether `drizzle-kit push` is available (Docker was unavailable in Phase 1 WSL2).
   - Recommendation: Plan for two steps: (a) `drizzle-kit push` or manual `CREATE TABLE` for schema; (b) apply `0001_patients.sql` manually via Supabase Dashboard SQL Editor. Document both paths.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files or test directories found |
| Config file | None — Wave 0 gap |
| Quick run command | N/A — establish in Wave 0 |
| Full suite command | N/A — establish in Wave 0 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAT-01 | Patient creation inserts row scoped to lab.id | unit (Server Action) | manual-only — no framework | ❌ Wave 0 gap |
| PAT-02 | Search returns matching patients for lab only | unit (Drizzle query) | manual-only | ❌ Wave 0 gap |
| PAT-03 | Patient detail shows only orders for that patient+lab | unit (Server Component data) | manual-only | ❌ Wave 0 gap |
| PAT-04 | Cross-lab patient query returns empty (isolation) | integration (two labs in DB) | manual-only | ❌ Wave 0 gap |
| ORD-01 | Order creation links patient, generates verificationCode | unit (Server Action) | manual-only | ❌ Wave 0 gap |
| ORD-02 | Filter tabs return correct subset | unit (query logic) | manual-only | ❌ Wave 0 gap |
| ORD-03 | Order detail fetches order + patient + validatedBy | unit (Server Component) | manual-only | ❌ Wave 0 gap |
| ORD-04 | addResultItemAction rejects on non-pending orders | unit (Server Action guard) | manual-only | ❌ Wave 0 gap |
| ORD-05 | PDF upload stores placeholder path, rejects non-PDF | unit (Server Action) | manual-only | ❌ Wave 0 gap |
| ORD-06 | validateOrderAction sets status/validatedById/validatedAt | unit (Server Action) | manual-only | ❌ Wave 0 gap |

**Note on test architecture:** No test framework is configured in the project. Given the 10-day MVP timeline and existing CRUD-by-inspection patterns from Phase 1, the verification strategy for Phase 2 is:
- Static TypeScript compilation (`npx tsc --noEmit` — zero errors required)
- Manual smoke test against the running application (plan 02-03 includes a `checkpoint:human-verify` task)
- Drizzle query correctness verified by visual inspection of generated SQL (enable Drizzle `logger: true` temporarily if needed)

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (TypeScript correctness)
- **Per wave merge:** Manual browser test of the feature surface
- **Phase gate:** All must_haves truths satisfied + human verify task approved

### Wave 0 Gaps
- [ ] No test framework — not blocking for MVP timeline; out of scope for Phase 2 per project constraints

---

## Sources

### Primary (HIGH confidence)
- Phase 1 SUMMARY files (01-01, 01-02, 01-03) — established patterns: `db.select()` only, no `.query.*`, `getLabUser()` guard, `createAdminClient()` for service-role ops
- `/d/LabFlash/src/lib/db/schema.ts` — current schema baseline (laboratories + labUsers only)
- `/d/LabFlash/package.json` — confirmed installed dependencies; nanoid not yet installed
- `/d/LabFlash/.planning/phases/02-core-crud/02-01-PLAN.md` — schema extension design + patient CRUD
- `/d/LabFlash/.planning/phases/02-core-crud/02-02-PLAN.md` — order CRUD + nanoid + filter pattern
- `/d/LabFlash/.planning/phases/02-core-crud/02-03-PLAN.md` — result items + PDF upload + validate action
- `/d/LabFlash/.planning/STATE.md` — confirmed stack decisions and architectural notes

### Secondary (MEDIUM confidence)
- Next.js 15 App Router Server Actions documentation — `revalidatePath`, `redirect`, FormData handling patterns
- Drizzle ORM docs — `ilike`, `inArray`, `and`, `or` operators; `returning()` for insert

### Tertiary (LOW confidence)
- nanoid v5 ESM compatibility with Next.js 15 — confirmed as standard but not tested against this specific Docker/Node environment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed except nanoid; patterns verified from Phase 1 execution
- Architecture: HIGH — three full PLAN files already exist with implementation-depth detail; patterns match Next.js 15 App Router conventions
- Pitfalls: HIGH — multi-tenant isolation pitfall is confirmed from Phase 1 architectural note; others derived from code patterns in existing plans
- Validation: MEDIUM — no test framework exists; manual verification is the established pattern for this project

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable stack; 30-day validity)
