import * as fs from 'fs';
import * as path from 'path';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import { DISPLAY } from '../src/config/display';
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

async function capturePages(page: Page) {
  const outputPath = path.join(process.cwd(), CONFIG.outputDir);
  // Start clean so pages removed from the config don't linger
  fs.rmSync(outputPath, { recursive: true, force: true });
  fs.mkdirSync(outputPath, { recursive: true });

  for (const pageConfig of PAGES) {
    const url = `${CONFIG.serverUrl}${pageConfig.url}`;
    console.log(`\n[${pageConfig.name}] Navigating to ${url}...`);

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 10000,
    });

    console.log(`Waiting ${CONFIG.waitTime}ms for content to render...`);
    await page.waitForTimeout(CONFIG.waitTime);

    // Greyscale, packed to the panel's depth
    const { data, info } = await sharp(await page.screenshot({ fullPage: false }))
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const target = path.join(outputPath, pageConfig.filename);
    fs.writeFileSync(target, encodeGrayPng(data, info.width, info.height, DISPLAY.bitDepth));

    console.log(`[${pageConfig.name}] Screenshot saved: ${target}`);
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
    const context = await browser.newContext({
      viewport: { width: DISPLAY.width, height: DISPLAY.height },
      deviceScaleFactor: 1,
    });
    await capturePages(await context.newPage());

    console.log(`\nTotal screenshots captured: ${PAGES.length}`);

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
