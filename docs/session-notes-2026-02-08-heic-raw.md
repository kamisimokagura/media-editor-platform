# Session Notes (2026-02-08): HEIC/RAW + Turbopack

## Why this was done

- `heic2any` and `libraw-wasm` could cause build issues when imported through npm package graph with Turbopack.
- Goal: keep HEIC/RAW conversion available while avoiding bundler hang risk.

## What was implemented

1. Re-enabled HEIC/RAW conversion logic in UI flows:
   - `src/app/editor/page.tsx`
   - `src/app/convert/page.tsx`
   - `src/components/editor/ImageEditor.tsx`
2. Replaced direct package imports with runtime vendor loading:
   - `src/lib/heicConverter.ts`
     - Loads `/vendor/heic2any/heic2any.min.js` at runtime and uses `window.heic2any`.
   - `src/lib/rawConverter.ts`
     - Loads `/vendor/libraw-wasm/index.js` via runtime URL import (`webpackIgnore`).
3. Added vendor assets under `public/vendor`:
   - `public/vendor/heic2any/heic2any.min.js`
   - `public/vendor/libraw-wasm/index.js`
   - `public/vendor/libraw-wasm/worker.js`
   - `public/vendor/libraw-wasm/libraw.js`
   - `public/vendor/libraw-wasm/libraw.wasm`
4. Added manual QA checklist:
   - `docs/heic-raw-manual-qa.md`

## Verification completed in this session

- `npx tsc --noEmit` -> PASS
- `npx next build` (Turbopack) -> PASS
- `npx next build --webpack` -> PASS
- Runtime route checks with `next start` -> PASS
  - `/convert` -> 200
  - `/editor` -> 200
  - `/image` -> 200
  - `/vendor/heic2any/heic2any.min.js` -> 200
  - `/vendor/libraw-wasm/index.js` -> 200
  - `/vendor/libraw-wasm/worker.js` -> 200
  - `/vendor/libraw-wasm/libraw.js` -> 200
  - `/vendor/libraw-wasm/libraw.wasm` -> 200

## Remaining manual QA (requires real files + browser operation)

Follow:

- `docs/heic-raw-manual-qa.md`

Focus:

1. Upload real `.heic`/`.heif` in `/convert`, `/editor`, `/image`
2. Upload real RAW (`.cr2`/`.nef`/`.arw`/`.dng` etc.) in same routes
3. Confirm toast, conversion, preview, and export behavior

## Next time in Warp

Open this file first:

- `docs/session-notes-2026-02-08-heic-raw.md`

Then run:

1. `npm run dev`
2. Use `docs/heic-raw-manual-qa.md` to finish manual upload QA
