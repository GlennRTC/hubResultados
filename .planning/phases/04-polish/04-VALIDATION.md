---
phase: 4
slug: polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30 + ts-jest 29 |
| **Config file** | `jest.config.ts` (exists, `testMatch: ["**/tests/**/*.test.ts"]`) |
| **Quick run command** | `npm test -- --testPathPattern=tests/phase4` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern=tests/phase4`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-00-01 | 00 | 0 | LAB-01 | unit | `npm test -- --testPathPattern=tests/lab-settings` | ❌ W0 | ⬜ pending |
| 4-00-02 | 00 | 0 | LAB-02 | unit | `npm test -- --testPathPattern=tests/staff-management` | ❌ W0 | ⬜ pending |
| 4-00-03 | 00 | 0 | LAB-03 | unit | `npm test -- --testPathPattern=tests/analytics` | ❌ W0 | ⬜ pending |
| 4-00-04 | 00 | 0 | LAB-04 | unit | `npm test -- --testPathPattern=tests/audit-log` | ❌ W0 | ⬜ pending |
| 4-00-05 | 00 | 0 | LAB-05 | unit | `npm test -- --testPathPattern=tests/plan-limits` | ❌ W0 | ⬜ pending |
| 4-00-06 | 00 | 0 | SADM-01 | unit | `npm test -- --testPathPattern=tests/superadmin` | ❌ W0 | ⬜ pending |
| 4-00-07 | 00 | 0 | DEL-06 | unit | `npm test -- --testPathPattern=tests/resend` | ❌ W0 | ⬜ pending |
| 4-01-01 | 01 | 1 | LAB-01 | unit | `npm test -- --testPathPattern=tests/lab-settings` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | LAB-02 | unit | `npm test -- --testPathPattern=tests/staff-management` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | LAB-03 | unit | `npm test -- --testPathPattern=tests/analytics` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | LAB-04 | unit | `npm test -- --testPathPattern=tests/audit-log` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | DEL-06 | unit | `npm test -- --testPathPattern=tests/resend` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 3 | LAB-05 | unit | `npm test -- --testPathPattern=tests/plan-limits` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 3 | SADM-01 | unit | `npm test -- --testPathPattern=tests/superadmin` | ❌ W0 | ⬜ pending |
| 4-03-03 | 03 | 3 | SADM-04 | manual | manual only | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lab-settings.test.ts` — stubs for LAB-01 (settings update, role guard, Zod validation)
- [ ] `tests/staff-management.test.ts` — stubs for LAB-02 (invite guard, self-removal prevention, role check)
- [ ] `tests/analytics.test.ts` — stubs for LAB-03 (query math: today count, delivery rate)
- [ ] `tests/audit-log.test.ts` — stubs for LAB-04 (pagination scoping, lab isolation)
- [ ] `tests/plan-limits.test.ts` — stubs for LAB-05 (limit check at 29/30, atomic increment)
- [ ] `tests/superadmin.test.ts` — stubs for SADM-01 (auth guard email check, redirect for non-superadmin)
- [ ] `tests/resend.test.ts` — stubs for DEL-06 (new notifications row, order status update)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lab deletion cleans up Supabase Storage PDFs + logos | SADM-04 | Requires live Supabase instance; Storage API not mockable in unit tests | (1) Create test lab with uploaded logo and validated order (2) Delete lab via superadmin panel (3) Verify Storage buckets `results/` and `logos/` have no files for that labId (4) Verify auth users for that lab no longer exist in Supabase Auth |
| Staff invite email arrives in Spanish | LAB-02 | Requires live Supabase Auth + email delivery | Manually configure Supabase "Invite" email template to Spanish in dashboard, then send test invite |
| WhatsApp credential per-lab sends to correct number | LAB-01 | Requires live Meta Cloud API test number | Configure lab with test WhatsApp credentials, validate an order, confirm message arrives on configured phone number |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
