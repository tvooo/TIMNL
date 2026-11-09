// TEMPORARY: renders the agenda and week in several text-rendering variants,
// labelled in the corner, so they can be compared on the panel itself.
// Replaces capture.ts in the rotation until a variant is picked.
import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { DISPLAY } from '../src/config/display';
import { encodeGrayPng } from './gray-png';

const serverUrl = process.env.CAPTURE_URL || 'http://localhost:3000';
const outputDir = path.join(process.cwd(), 'screenshots');
const PAGES = ['/', '/week'];

// Mildly darken mid-tones before rounding to the panel's 4 greys
const darken = (v: number) => 255 * (v / 255) ** 1.4;
const none = (v: number) => v;

// Query flags (see src/main.tsx): ink = small grey text in black, medium
// weight; stroke = small text thickened by a fraction of a pixel
const VARIANTS = [
  { label: 'A current', query: '', tone: none },
  { label: 'E ink', query: '?ink', tone: none },
  { label: 'F ink+stroke', query: '?ink&stroke', tone: none },
  { label: 'G ink+curve', query: '?ink', tone: darken },
];

function labelSvg(text: string) {
  const width = 12 + text.length * 8;
  return Buffer.from(
    `<svg width="${width}" height="22"><rect width="${width}" height="22" fill="black"/>` +
      `<text x="6" y="16" font-family="sans-serif" font-size="14" font-weight="bold" fill="white">${text}</text></svg>`,
  );
}

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  let n = 0;
  for (const pagePath of PAGES) {
    for (const variant of VARIANTS) {
      const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
      });
      const page = await browser.newPage({
        viewport: { width: DISPLAY.width, height: DISPLAY.height },
        deviceScaleFactor: 1,
      });
      const url = `${serverUrl}${pagePath}${variant.query}`;
      console.log(`[${variant.label}] ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(2000);
      const screenshot = await page.screenshot();
      await browser.close();

      const { data, info } = await sharp(screenshot)
        .composite([{ input: labelSvg(variant.label), left: 0, top: DISPLAY.height - 22 }])
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const toned = data.map(variant.tone);

      n++;
      const target = path.join(outputDir, `dashboard-${String(n).padStart(2, '0')}.png`);
      fs.writeFileSync(target, encodeGrayPng(toned, info.width, info.height, DISPLAY.bitDepth));
    }
  }
  console.log(`Captured ${n} variant screenshots`);
}

main().catch((error) => {
  console.error('Error capturing variants:', error.message);
  process.exit(1);
});
