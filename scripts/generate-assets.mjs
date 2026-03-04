/**
 * Generate image assets from icon.svg
 * Run: node scripts/generate-assets.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const iconSvg = readFileSync(join(publicDir, 'icon.svg'));

// --- favicon-16x16.png ---
await sharp(iconSvg)
  .resize(16, 16)
  .png()
  .toFile(join(publicDir, 'favicon-16x16.png'));
console.log('✓ favicon-16x16.png');

// --- apple-touch-icon.png (180x180) ---
await sharp(iconSvg)
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

// --- favicon.ico (32x32 png renamed to ico) ---
// ICO format: we generate a 32x32 PNG and save as .ico
// Modern browsers accept PNG-in-ICO format
const ico32 = await sharp(iconSvg)
  .resize(32, 32)
  .png()
  .toBuffer();
writeFileSync(join(publicDir, 'favicon.ico'), ico32);
console.log('✓ favicon.ico');

// --- OG Image (1200x630) ---
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E1B4B"/>
      <stop offset="100%" style="stop-color:#0F172A"/>
    </linearGradient>
    <linearGradient id="main" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7C3AED"/>
      <stop offset="50%" style="stop-color:#3B82F6"/>
      <stop offset="100%" style="stop-color:#06B6D4"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#A78BFA;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:#67E8F9;stop-opacity:0.1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <ellipse cx="600" cy="315" rx="500" ry="280" fill="url(#glow)" opacity="0.3"/>
  <!-- Stars -->
  <circle cx="100" cy="80" r="2" fill="#E0E7FF" opacity="0.8"/>
  <circle cx="1100" cy="60" r="1.5" fill="#E0E7FF" opacity="0.7"/>
  <circle cx="80" cy="500" r="1.8" fill="#C4B5FD" opacity="0.6"/>
  <circle cx="1120" cy="550" r="2.2" fill="#A5F3FC" opacity="0.7"/>
  <circle cx="300" cy="100" r="1.2" fill="#E0E7FF" opacity="0.5"/>
  <circle cx="900" cy="80" r="1.6" fill="#C4B5FD" opacity="0.6"/>
  <circle cx="200" cy="550" r="1.4" fill="#E0E7FF" opacity="0.5"/>
  <circle cx="1000" cy="500" r="1.8" fill="#A5F3FC" opacity="0.6"/>
  <!-- Icon -->
  <g transform="translate(130, 115) scale(0.78)">
    <g transform="translate(106, 120)">
      <path d="M40 280 L40 60 L150 180 L260 60 L260 280"
            stroke="url(#main)" stroke-width="36" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="260" y1="60" x2="340" y2="60" stroke="url(#main)" stroke-width="32" stroke-linecap="round"/>
      <line x1="260" y1="170" x2="320" y2="170" stroke="url(#main)" stroke-width="32" stroke-linecap="round"/>
      <line x1="260" y1="280" x2="340" y2="280" stroke="url(#main)" stroke-width="32" stroke-linecap="round"/>
    </g>
    <g transform="translate(370,340) rotate(-45)" opacity="0.9">
      <rect x="-6" y="-30" width="12" height="40" rx="3" fill="url(#main)"/>
      <polygon points="-6,10 6,10 0,22" fill="url(#main)"/>
    </g>
    <g transform="translate(410,180)">
      <rect x="-8" y="0" width="16" height="50" rx="8" fill="#06B6D4"/>
      <circle cx="0" cy="68" r="9" fill="#06B6D4"/>
    </g>
  </g>
  <!-- Text -->
  <text x="620" y="260" font-family="system-ui,-apple-system,sans-serif" font-size="72" font-weight="700" fill="white" text-anchor="start">MediaEditor</text>
  <text x="620" y="320" font-family="system-ui,-apple-system,sans-serif" font-size="32" fill="#94A3B8" text-anchor="start">AI-Powered Media Editing Platform</text>
  <text x="620" y="420" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#64748B" text-anchor="start">画像・動画編集 ✦ AIアシスタント ✦ クラウドベース</text>
  <!-- Orbital ring -->
  <ellipse cx="310" cy="315" rx="200" ry="50" fill="none" stroke="url(#main)" stroke-width="1.5" opacity="0.15" transform="rotate(-20,310,315)"/>
</svg>`;

await sharp(Buffer.from(ogSvg))
  .resize(1200, 630)
  .png()
  .toFile(join(publicDir, 'og-image.png'));
console.log('✓ og-image.png');

// --- Twitter Image (same as OG but different aspect ratio name) ---
await sharp(Buffer.from(ogSvg))
  .resize(1200, 630)
  .png()
  .toFile(join(publicDir, 'twitter-image.png'));
console.log('✓ twitter-image.png');

console.log('\nAll assets generated!');
