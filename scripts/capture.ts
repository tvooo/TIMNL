import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { DISPLAYS, type DisplayConfig, type DisplayName } from '../src/config/displays';
import { APP_PAGES } from '../src/config/pages';
import { encodeGrayPng } from './gray-png';

const CONFIG = {
  serverUrl: process.env.CAPTURE_URL || 'http://localhost:3000',
  outputDir: 'screenshots',
  waitTime: 2000,
};

// Generate numbered filenames for each page
const PAGES = APP_PAGES.map((page, index) => ({
  url: page.path,
  filename: `dashboard-${String(index + 1).padStart(2, '0')}.png`,
  name: page.name,
}));

// Rotate for the panel's mounting, convert to greyscale, and write either an
// 8-bit PNG or a packed low-depth one for panels that need it
async function processScreenshot(screenshot: Buffer, display: DisplayConfig, target: string) {
  const image = sharp(screenshot).rotate(display.rotate).grayscale();

  if (display.bitDepth) {
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    fs.writeFileSync(target, encodeGrayPng(data, info.width, info.height, display.bitDepth));
    return;
  }

  await image
    .toColorspace('b-w') // ensures it's truly grayscale colorspace
    .png({
      compressionLevel: 9,
      palette: false, // prevents palette-based PNG
    })
    .toFile(target);
}

async function captureDisplay(page: Page, name: DisplayName) {
  const display = DISPLAYS[name];
  const outputPath = path.join(process.cwd(), CONFIG.outputDir, name);
  fs.mkdirSync(outputPath, { recursive: true });

  await page.setViewportSize({ width: display.width, height: display.height });

  for (const pageConfig of PAGES) {
    const url = `${CONFIG.serverUrl}${pageConfig.url}?display=${name}`;
    console.log(`\n[${name}/${pageConfig.name}] Navigating to ${url}...`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    console.log(`Waiting ${CONFIG.waitTime}ms for content to render...`);
    await page.waitForTimeout(CONFIG.waitTime);

    const target = path.join(outputPath, pageConfig.filename);
    await processScreenshot(await page.screenshot({ fullPage: false }), display, target);

    console.log(`[${name}/${pageConfig.name}] Screenshot saved: ${target}`);
  }
}

async function captureScreenshots() {
  console.log('Launching browser...');
  // CHROMIUM_PATH lets the server use a system-installed chromium
  // (e.g. pacman's) instead of Playwright's bundled build
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });

  try {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();

    for (const name of Object.keys(DISPLAYS) as DisplayName[]) {
      await captureDisplay(page, name);
    }

    console.log(`\nTotal screenshots captured: ${PAGES.length} per display`);

  } catch (error) {
    console.error('Error capturing screenshot:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if server is running before capturing
async function checkServer() {
  try {
    const response = await fetch(CONFIG.serverUrl);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

async function main() {
  console.log('Checking if dev server is running...');
  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error(`Error: Dev server is not running at ${CONFIG.serverUrl}`);
    console.error('Please start the server first with: npm run dev');
    process.exit(1);
  }

  console.log('Dev server is running!');
  await captureScreenshots();
  console.log('\nDone!');
}

main();
