---
name: app-guard-api-security-design
description: Design for media-editor-platform quality gate and API security hardening.
created: 2026-02-17
status: approved
---

# App Guard + API Security Design

## Objective
- Add measurable quality/security checks for the app repository.
- Harden API routes with shared input validation and safe URL/origin normalization.
- Improve coding consistency through reusable helpers and a standard handler flow.

## Architecture
- Add `scripts/app_guard.ps1` in `media-editor-platform`.
- Add reusable helpers:
- `src/lib/api/validation.ts`
- `src/lib/api/origin.ts`
- Refactor API routes:
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/portal/route.ts`
- `src/app/api/analytics/track/route.ts`

## Guard Checks
- `npm run lint`
- `npx tsc --noEmit`
- Static security scan for:
- non-localhost `http://` literals
- permissive `origin` use without normalization helper
- Output score: pass/warn/fail summary and percentage.

## API Security Rules
- Parse JSON safely with explicit error response.
- Validate required fields and enum values.
- Validate Stripe `priceId` format.
- Normalize return URLs to allowed origin and safe fallback path.
- Bound analytics payload complexity (keys/values depth/size limits).

## Completion Criteria
- Guard score >= 95% with zero fail checks.
- Lint and TypeScript checks pass.
- Target API routes share validation/origin safety utilities.
