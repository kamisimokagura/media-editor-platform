---
name: contact-auto-send-design
description: Design for server-side auto-send contact form using Resend API.
created: 2026-02-17
status: approved
---

# Contact Auto-Send Design

## Objective
- Replace `mailto` behavior with server-side auto-send.
- Deliver all inquiry emails to `kamigaminosinri@gmail.com`.
- Keep implementation minimal and aligned with existing API route patterns.

## Architecture
- Add API route: `src/app/api/contact/route.ts`
- Update contact page submit flow: `src/app/contact/page.tsx`
- Add env documentation: `RESEND_API_KEY` and optional `CONTACT_FROM_EMAIL` in `.env.example`

## Data Flow
- Browser posts `{ name, email, message }` to `POST /api/contact`.
- API validates input and sends email via Resend REST API.
- API returns success/error JSON; UI shows toast and clears form on success.

## Error Handling
- `503` when `RESEND_API_KEY` is missing.
- `400` for invalid/missing input.
- `502` when upstream email API fails.
- `500` for unexpected failures.

## Security and Constraints
- Validate/trim all fields with shared validation utilities.
- Keep fixed destination email (`kamigaminosinri@gmail.com`) in server route.
- Do not expose API key to client.

## Completion Criteria
- Contact form sends successfully without opening mail client.
- Emails arrive at `kamigaminosinri@gmail.com`.
- Type check passes with `npx tsc --noEmit`.
