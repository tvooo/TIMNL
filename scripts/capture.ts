import * as fs from 'fs';
import * as path from 'path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { APP_PAGES } from '../src/config/pages';

const CONFIG = {
  serverUrl: 'http://localhost:3000',
  outputDir: 'screenshots',
  width: 800,
  height: 600,
  waitTime: 2000,
};

// Generate numbered filenames for each page
const PAGES = APP_PAGES.map((page, index) => ({
  url: page.path,
  filename: `dashboard-${String(index + 1).padStart(2, '0')}.png`,
  name: page.name,
}));

async function captureScreenshots() {
  const outputPath = path.join(process.cwd(), CONFIG.outputDir);

  // Create output directory
  fs.mkdirSync(outputPath, { recursive: true });

  console.log('Launching browser...');
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: {
        width: CONFIG.width,
        height: CONFIG.height,
      },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // Capture each page
    for (const pageConfig of PAGES) {
      const url = `${CONFIG.serverUrl}${pageConfig.url}`;
      console.log(`\n[${pageConfig.name}] Navigating to ${url}...`);

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      console.log(`Waiting ${CONFIG.waitTime}ms for content to render...`);
      await page.waitForTimeout(CONFIG.waitTime);

      // Capture to temporary file first
      const tempFilepath = path.join(outputPath, `temp-${pageConfig.filename}`);
      const finalFilepath = path.join(outputPath, pageConfig.filename);

      console.log(`Capturing screenshot: ${pageConfig.filename}`);

      await page.screenshot({
        path: tempFilepath,
        fullPage: false,
      });

      // Rotate 90 degrees clockwise and convert to 8-bit grayscale for Kindle
      console.log(`[${pageConfig.name}] Processing image for Kindle (rotate + 8-bit grayscale)...`);
      await sharp(tempFilepath)
        .rotate(90)
        .grayscale() // or .greyscale() - converts to single channel grayscale
        .toColorspace("b-w") // ensures it's truly grayscale colorspace
        .png({
          compressionLevel: 9,
          palette: false, // prevents palette-based PNG
        })
        .toFile(finalFilepath);

      // Delete temporary file
      fs.unlinkSync(tempFilepath);

      console.log(`[${pageConfig.name}] Screenshot saved: ${finalFilepath} (600x800, 8-bit grayscale)`);
    }

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
