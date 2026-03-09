---
phase: 3
slug: delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest + ts-jest (not yet installed — Wave 0 installs) |
| **Config file** | `jest.config.ts` — Wave 0 creates |
| **Quick run command** | `npx jest --testPathPattern=tests/ --passWithNoTests` |
| **Full suite command** | `npx jest --passWithNoTests` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=tests/ --passWithNoTests`
- **After every plan wave:** Run `npx jest --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green + manual portal smoke test
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| PDF generation | 03-01 | 1 | DEL-01, INFRA-07 | unit | `npx jest tests/pdf.test.ts` | ❌ W0 | ⬜ pending |
| Storage upload | 03-01 | 1 | DEL-02 | manual | manual — requires live Supabase | — | ⬜ pending |
| WhatsApp send | 03-02 | 2 | DEL-03 | unit | `npx jest tests/whatsapp.test.ts` | ❌ W0 | ⬜ pending |
| Webhook handler | 03-02 | 2 | DEL-04, INFRA-06 | unit | `npx jest tests/webhook.test.ts` | ❌ W0 | ⬜ pending |
| Realtime status | 03-02 | 2 | DEL-05 | manual | Open dashboard, validate order, observe badge | — | ⬜ pending |
| Portal route render | 03-03 | 3 | PORTAL-01 | smoke | `curl /r/{code}` → 200 | — | ⬜ pending |
| Portal auth | 03-03 | 3 | PORTAL-02 | unit | `npx jest tests/portal-auth.test.ts` | ❌ W0 | ⬜ pending |
| PDF viewer | 03-03 | 3 | PORTAL-03 | manual | Open `/r/{code}`, auth, observe viewer | — | ⬜ pending |
| Download button | 03-03 | 3 | PORTAL-04 | manual | Click download, verify PDF file | — | ⬜ pending |
| Rate limiting | 03-03 | 3 | PORTAL-05 | unit | `npx jest tests/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| Verify page | 03-03 | 3 | PORTAL-06 | unit | `npx jest tests/verify.test.ts` | ❌ W0 | ⬜ pending |
| Zod validation | 03-04 | 4 | INFRA-06 | unit | included in webhook + portal tests | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `jest.config.ts` — jest configuration with ts-jest preset
- [ ] `package.json` test script — `"test": "jest --passWithNoTests"`
- [ ] `npm install --save-dev jest @types/jest ts-jest` — test framework
- [ ] `tests/pdf.test.ts` — stubs for DEL-01, INFRA-07 (PDF buffer generated, < 500KB)
- [ ] `tests/whatsapp.test.ts` — stub for DEL-03 (correct request body built)
- [ ] `tests/webhook.test.ts` — stubs for DEL-04, INFRA-06 (GET handshake, POST status update, Zod rejection)
- [ ] `tests/portal-auth.test.ts` — stub for PORTAL-02 (valid/invalid credential matching)
- [ ] `tests/rate-limit.test.ts` — stub for PORTAL-05 (6th attempt blocked)
- [ ] `tests/verify.test.ts` — stub for PORTAL-06 (verification page data)
- [ ] Supabase `results` storage bucket — must exist before PDF upload tasks

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase Storage upload & signed URL | DEL-02 | Requires live Supabase credentials | Upload a test PDF, verify signed URL is valid HTTPS, expires in 1h |
| Realtime delivery status update | DEL-05 | Requires live Supabase Realtime + browser | Open dashboard, validate an order, observe badge change without refresh |
| PDF viewer renders in portal | PORTAL-03 | Browser rendering, no headless test | Authenticate on `/r/{code}`, confirm PDF renders in iframe/viewer |
| Download button works | PORTAL-04 | Browser interaction required | Click download button, verify PDF file is saved correctly |
| WhatsApp template pre-approval | DEL-03 deployment | Meta review process (24-48h) | Submit `resultado_listo` template to Meta, confirm approved status |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
