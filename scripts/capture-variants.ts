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

// Darken mid-tones before rounding to the panel's 4 greys, so grey text
// and anti-aliased edges land on darker levels
const darken = (v: number) => 255 * (v / 255) ** 2;
// 1-bit: everything below light grey becomes black
const threshold = (v: number) => (v < 170 ? 0 : 255);

const VARIANTS = [
  { label: 'A current', font: false, hinting: false, tone: (v: number) => v },
  { label: 'B darker', font: false, hinting: false, tone: darken },
  { label: 'C font+hint+darker', font: true, hinting: true, tone: darken },
  { label: 'D font+hint 1-bit', font: true, hinting: true, tone: threshold },
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
        args: variant.hinting ? ['--font-render-hinting=full'] : [],
      });
      const page = await browser.newPage({
        viewport: { width: DISPLAY.width, height: DISPLAY.height },
        deviceScaleFactor: 1,
      });
      const url = `${serverUrl}${pagePath}${variant.font ? '?font=atkinson' : ''}`;
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
