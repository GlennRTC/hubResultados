---
phase: 03-delivery
plan: "01"
subsystem: pdf-generation
tags: [pdf, qrcode, supabase-storage, react-pdf, server-side]
dependency_graph:
  requires: [03-00]
  provides: [generateResultPDF, generateQRDataUrl, uploadPDF, getSignedUrl]
  affects: [03-04-validate-and-send]
tech_stack:
  added: ["@react-pdf/renderer@4.3.2", "qrcode@1.5.4", "@types/qrcode@1.5.6"]
  patterns: [renderToBuffer, supabase-service-role-storage, tdd-red-green]
key_files:
  created:
    - src/lib/pdf/ResultPDF.tsx
    - src/lib/pdf/generate-pdf.tsx
    - src/lib/pdf/generate-qr.ts
    - src/lib/storage/upload-pdf.ts
    - tests/pdf.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "generate-pdf.tsx uses .tsx extension (not .ts) — file uses JSX syntax; jest config sets jsx:react mode requiring explicit React import"
  - "React import added to generate-pdf.tsx — jest ts-jest config uses jsx:react (not react-jsx), so React must be in scope"
  - "ResultPDF.tsx uses Helvetica font only — no TTF embedding; keeps PDF well under 500KB limit"
  - "upload-pdf.ts uses getAdminClient() factory pattern (not module-level singleton) — avoids env var access at import time"
metrics:
  duration: "14 minutes"
  completed_date: "2026-03-09"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
requirements_satisfied: [DEL-01, DEL-02, INFRA-07]
---

# Phase 3 Plan 01: PDF Generation Pipeline Summary

**One-liner:** Branded @react-pdf/renderer PDF generator with QR code embedding and Supabase Storage upload using service-role client for RLS bypass.

## What Was Built

### Installed Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-pdf/renderer` | 4.3.2 | Server-side PDF generation via renderToBuffer |
| `qrcode` | 1.5.4 | QR PNG data URL generation for PDF embedding |
| `@types/qrcode` | 1.5.6 | TypeScript types for qrcode |

Installation method: `docker exec labflash-app-1 npm install` (node_modules live inside Docker named volume — host filesystem is not writable for node_modules).

### Files Created

**`src/lib/pdf/ResultPDF.tsx`**
A pure @react-pdf/renderer Document component. Accepts `ResultPDFData` props — no React context, no client APIs. Layout: lab header (name, address, phone, optional logo) + QR code top-right, patient info section, order info section, results table with flag coloring (H/A/L/B/C/N), validated-by footer, Spanish disclaimer. Uses Helvetica font only (built-in PDF font — no TTF embedding).

**`src/lib/pdf/generate-pdf.tsx`**
Exports `generateResultPDF(data: ResultPDFData): Promise<Buffer>`. Wraps `renderToBuffer(<ResultPDF data={data} />)`. Logs a warning if buffer exceeds 400KB. Named `.tsx` because it uses JSX syntax.

**`src/lib/pdf/generate-qr.ts`**
Exports `generateQRDataUrl(url: string): Promise<string>`. Calls `QRCode.toDataURL()` at width:200 with M-level error correction. Returns `data:image/png;base64,...` directly usable as `<Image src>` in @react-pdf.

**`src/lib/storage/upload-pdf.ts`**
Exports:
- `uploadPDF(buffer: Buffer, path: string): Promise<string>` — uploads to Supabase Storage `results` bucket with `upsert: true`, returns the path
- `getSignedUrl(path: string): Promise<string>` — creates a signed URL with 3600s (1 hour) expiry

Uses `getAdminClient()` factory (service-role key) to bypass RLS. Must be called from server-side code only.

**`tests/pdf.test.ts`**
3 passing unit tests:
1. `generateResultPDF(mockData)` resolves to a Buffer (DEL-01)
2. PDF buffer is less than 500KB / `byteLength < 500_000` (INFRA-07)
3. `generateQRDataUrl(url)` returns a string matching `/^data:image\/png;base64,/`

Mocks `@react-pdf/renderer` (renderToBuffer returns `Buffer.alloc(100_000)`) and `qrcode` (toDataURL returns `"data:image/png;base64,abc123"`).

## Test Results

```
PASS tests/pdf.test.ts
  generateResultPDF
    ✓ generates a PDF buffer for a valid order
    ✓ PDF buffer is less than 500KB (INFRA-07)
  generateQRDataUrl
    ✓ returns a base64 PNG data URL

Tests: 3 passed, 3 total
```

Full suite: 6 test suites, 3 passed + 18 todos (stubs from 03-00), 0 failures.

## TypeScript Compilation Status

`npx tsc --noEmit` — no errors in newly created files. Pre-existing errors in `src/lib/supabase/middleware.ts` and `src/lib/supabase/server.ts` (implicit `any` on cookie parameters) are from Phase 1 (commit 9495d63) and are out of scope for this plan.

## Known Limitations

1. **`upload-pdf.ts` has no unit tests** — Supabase Storage integration is integration-only (requires live Supabase connection). TypeScript compilation verifies the API surface.
2. **Logo embedding** — `ResultPDF.tsx` accepts `logoBase64: string | null`. The caller (Plan 03-04) is responsible for fetching the lab logo URL and converting it to base64 before passing to `generateResultPDF`.
3. **generate-pdf.tsx is .tsx** — The plan specified `.ts` but since the file uses JSX syntax (`<ResultPDF data={data} />`), `.tsx` is required. The test import path `@/lib/pdf/generate-pdf` resolves correctly to the `.tsx` file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added React import to generate-pdf.tsx**
- **Found during:** Task 1 GREEN phase (test run)
- **Issue:** `ReferenceError: React is not defined` — jest ts-jest config uses `jsx: "react"` mode which requires React in scope (not the automatic JSX transform)
- **Fix:** Added `import React from "react"` to `generate-pdf.tsx`
- **Files modified:** `src/lib/pdf/generate-pdf.tsx`
- **Commit:** 1bbca4e

**2. [Rule 1 - Bug] File extension changed from .ts to .tsx**
- **Found during:** Task 1 planning — critical note in plan itself warned about this
- **Issue:** `generate-pdf.ts` would not compile JSX syntax; `.tsx` extension required
- **Fix:** Created file as `generate-pdf.tsx` instead of `generate-pdf.ts`
- **Files modified:** `src/lib/pdf/generate-pdf.tsx` (name change from plan)

## Commits

| Hash | Type | Description |
|------|------|-------------|
| cb86fbf | test | RED: failing tests for PDF generation and QR code |
| 1bbca4e | feat | GREEN: ResultPDF component, generate-pdf.tsx, generate-qr.ts (3 tests passing) |
| c774b05 | feat | Supabase Storage upload and signed URL helpers |

## Self-Check: PASSED

Files exist:
- src/lib/pdf/ResultPDF.tsx: FOUND
- src/lib/pdf/generate-pdf.tsx: FOUND
- src/lib/pdf/generate-qr.ts: FOUND
- src/lib/storage/upload-pdf.ts: FOUND
- tests/pdf.test.ts: FOUND

Commits exist:
- cb86fbf: FOUND
- 1bbca4e: FOUND
- c774b05: FOUND
