# HEIC/RAW Manual QA Checklist

This checklist validates runtime loading from `public/vendor` and user-facing conversion flows.

## Preconditions

1. Install deps: `npm ci`
2. Start app: `npm run dev`
3. Open: `http://localhost:3000`
4. Prepare files:
   - At least 1 HEIC/HEIF photo from iPhone (`.heic`/`.heif`)
   - At least 1 RAW photo (`.cr2`, `.cr3`, `.nef`, `.arw`, `.dng`, etc.)
   - 1 normal image (`.jpg` or `.png`) for control

## Build Verification

1. Run `npx tsc --noEmit`
2. Run `npx next build`
3. Run `npx next build --webpack`
4. Confirm all commands exit successfully.

## Flow A: Convert Page

Route: `/convert`

1. Upload HEIC file.
2. Confirm toast appears: `Converting HEIC image...`.
3. Confirm preview is shown and mode is image.
4. Export as `PNG` and verify downloaded file opens in browser.
5. Repeat with RAW file and confirm toast: `Converting RAW image...`.
6. Repeat with JPG/PNG and confirm no conversion toast appears.

Expected:
- No crash or blank screen.
- Converted file downloads successfully.
- Conversion processing completes within reasonable time for file size.

## Flow B: Editor Page

Route: `/editor`

1. Upload HEIC file in DropZone.
2. Confirm toast: `Converting HEIC image...`.
3. Confirm media metadata is shown and canvas renders image.
4. Apply one adjustment and export quick PNG.
5. Repeat with RAW file and confirm toast: `Converting RAW image...`.

Expected:
- Canvas initializes correctly after conversion.
- Export works without runtime error.

## Flow C: Image Editor Component

Route: `/image`

1. Upload HEIC file.
2. Confirm toast and successful image load.
3. Try crop + export.
4. Repeat with RAW file.

Expected:
- Converted image behaves the same as normal PNG/JPG in editing pipeline.

## Vendor Asset Health Check

Confirm these URLs return `200` in browser:

1. `/vendor/heic2any/heic2any.min.js`
2. `/vendor/libraw-wasm/index.js`
3. `/vendor/libraw-wasm/worker.js`
4. `/vendor/libraw-wasm/libraw.js`
5. `/vendor/libraw-wasm/libraw.wasm`

## Browser Matrix (Minimum)

1. Chrome (latest)
2. Edge (latest)
3. Safari (latest on macOS/iOS if available)

Record:
- Pass/Fail per browser
- File size + extension
- Any console/network errors

## Common Failure Signals

1. `Failed to load /vendor/...`:
   - Check files exist under `public/vendor`.
   - Check deployment includes static files.
2. `window.heic2any is missing`:
   - Check `heic2any.min.js` loaded successfully (Network tab).
3. RAW decode errors:
   - Confirm all 4 libraw files are present and same version.
   - Check wasm response content-type (should be `application/wasm` if configured by host).

## QA Report Template

Use this for each run:

- Date:
- Commit SHA:
- Environment: local / preview / production
- Browser:
- Test file:
- Route:
- Result: pass/fail
- Notes:
