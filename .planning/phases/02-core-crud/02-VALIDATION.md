---
phase: 2
slug: core-crud
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — no test config files or test directories found |
| **Config file** | none — Wave 0 gap |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit` + manual browser smoke test |
| **Estimated runtime** | ~10 seconds (tsc only) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx tsc --noEmit` + manual browser test of the feature surface
- **Before `/gsd:verify-work`:** Full suite must be green + human verify task approved
- **Max feedback latency:** ~10 seconds (tsc)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | PAT-04 | compile | `npx tsc --noEmit` | ❌ Wave 0 | ⬜ pending |
| 2-01-02 | 02-01 | 1 | PAT-01, PAT-02 | compile + grep | `grep -q "createPatientAction" src/app/dashboard/pacientes/nuevo/actions.ts` | ❌ Wave 0 | ⬜ pending |
| 2-01-03 | 02-01 | 1 | PAT-03, PAT-04 | compile + grep | `grep -q "laboratoryId" src/app/dashboard/pacientes/[id]/page.tsx` | ❌ Wave 0 | ⬜ pending |
| 2-02-01 | 02-02 | 2 | ORD-01 | compile + grep | `grep -q "nanoid\|createOrderAction" src/app/dashboard/ordenes/nueva/actions.ts` | ❌ Wave 0 | ⬜ pending |
| 2-02-02 | 02-02 | 2 | ORD-02 | compile + grep | `grep -q "estado\|filter\|inArray" src/app/dashboard/ordenes/page.tsx` | ❌ Wave 0 | ⬜ pending |
| 2-02-03 | 02-02 | 2 | ORD-03 | compile + grep | `grep -q "laboratoryId" src/app/dashboard/ordenes/[id]/page.tsx` | ❌ Wave 0 | ⬜ pending |
| 2-03-01 | 02-03 | 3 | ORD-04, ORD-06 | compile + grep | `grep -q "validateOrderAction\|addResultItemAction" src/app/dashboard/ordenes/[id]/actions.ts` | ❌ Wave 0 | ⬜ pending |
| 2-03-02 | 02-03 | 3 | ORD-05 | compile + grep | `grep -q "uploadPdfAction\|PdfUpload" src/components/pdf-upload.tsx` | ❌ Wave 0 | ⬜ pending |
| 2-03-03 | 02-03 | 3 | ORD-04, ORD-05, ORD-06 | compile + grep | `grep -q "ResultItemsForm\|PdfUpload\|validateOrderAction" src/app/dashboard/ordenes/[id]/page.tsx` | ❌ Wave 0 | ⬜ pending |
| 2-03-04 | 02-03 | 3 | ORD-04, ORD-05, ORD-06 | manual | see Manual-Only Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No test framework — not blocking for MVP timeline; out of scope for Phase 2 per project constraints
- [ ] TypeScript compilation baseline: `npx tsc --noEmit` must pass before wave 1 begins

*All phase behaviors rely on compile-time checks + manual verification per established Phase 1 pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Patient creation inserts row scoped to lab.id | PAT-01, PAT-04 | No test framework | Create patient → verify appears in /dashboard/pacientes only for that lab |
| Search returns matching patients for lab only | PAT-02 | No test framework | Search by name and document number → verify cross-lab isolation |
| Patient detail shows order history | PAT-03 | No test framework | Click patient row → verify orders list renders |
| Order creation links patient, generates verificationCode | ORD-01 | No test framework | Create order → verify nanoid code in DB |
| Filter tabs return correct subset | ORD-02 | No test framework | Switch status tabs → verify correct orders shown |
| Order detail renders patient + order data | ORD-03 | No test framework | Open order → verify patient name and order fields |
| Add result item appends to list | ORD-04 | No test framework | Submit result form → verify item appears in list |
| PDF drag-and-drop stores placeholder | ORD-05 | No test framework | Drop PDF → verify "PDF adjunto" state shown |
| Validate & Send locks order | ORD-06 | No test framework | Click Validar → verify status=validated, button disabled, timestamps recorded |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
