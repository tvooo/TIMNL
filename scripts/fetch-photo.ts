import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { DISPLAYS, type DisplayConfig, type DisplayName } from '../src/config/displays';

dotenv.config();

// One image per display, at its frame size and grey depth. The Kindle page
// is laid out landscape and capture.ts rotates the whole screenshot, so the
// photo is prepared landscape here and lands upright on the wall.
// Quantising here with Floyd-Steinberg gives smooth gradients instead of the
// hard banding the display drivers produce on their own.

const SOURCE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif',
];

const photosDir = path.resolve(process.cwd(), process.env.PHOTOS_DIR || 'photos');
const metaPath = path.join(process.cwd(), 'data/photo.json');
const statePath = path.join(process.cwd(), 'data/photo-state.json');
const fit: 'contain' | 'cover' = process.env.PHOTO_FIT === 'cover' ? 'cover' : 'contain';

interface PhotoData {
  fetchedAt: string;
  images: Partial<Record<DisplayName, string>>;
  file: string;
  index: number;
  count: number;
  error?: string;
}

function writeMeta(meta: PhotoData) {
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

function emptyMeta(error?: string): PhotoData {
  return {
    fetchedAt: new Date().toISOString(),
    images: {},
    file: '',
    index: 0,
    count: 0,
    error,
  };
}

function listPhotos(): string[] {
  if (!fs.existsSync(photosDir)) return [];
  return fs
    .readdirSync(photosDir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => SOURCE_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .filter((name) => fs.statSync(path.join(photosDir, name)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

// Round-robin: remember the last photo by name rather than by index, so
// adding or removing files doesn't make the rotation skip or repeat.
function pickNext(photos: string[]): number {
  let last = '';
  try {
    last = JSON.parse(fs.readFileSync(statePath, 'utf-8')).last ?? '';
  } catch {
    // no state yet, or unreadable — start from the top
  }
  const previous = photos.indexOf(last);
  return (previous + 1) % photos.length;
}

/**
 * Floyd-Steinberg dithering of an 8-bit greyscale buffer down to `levels`
 * evenly spaced greys, diffusing the quantisation error to the neighbours
 * that haven't been visited yet.
 */
function dither(pixels: Buffer, width: number, height: number, levels: number): Buffer {
  const step = 255 / (levels - 1);
  const work = Float32Array.from(pixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = work[i];
      const quantised = Math.round(Math.min(255, Math.max(0, old)) / step) * step;
      work[i] = quantised;

      const error = old - quantised;
      const hasRight = x + 1 < width;
      const hasBelow = y + 1 < height;

      if (hasRight) work[i + 1] += (error * 7) / 16;
      if (hasBelow) {
        if (x > 0) work[i + width - 1] += (error * 3) / 16;
        work[i + width] += (error * 5) / 16;
        if (hasRight) work[i + width + 1] += (error * 1) / 16;
      }
    }
  }

  const out = Buffer.alloc(width * height);
  for (let i = 0; i < work.length; i++) {
    out[i] = Math.min(255, Math.max(0, Math.round(work[i])));
  }
  return out;
}

async function fetchPhoto() {
  const photos = listPhotos();

  if (photos.length === 0) {
    console.log(`No photos found in ${photosDir}`);
    writeMeta(emptyMeta(`No photos in ${photosDir}`));
    return;
  }

  const index = pickNext(photos);
  const file = photos[index];
  const source = path.join(photosDir, file);
  console.log(`Photo ${index + 1}/${photos.length}: ${file}`);

  const images: PhotoData['images'] = {};
  for (const name of Object.keys(DISPLAYS) as DisplayName[]) {
    images[name] = `/photo-${name}.png`;
    await preparePhoto(source, path.join(process.cwd(), 'public', images[name]), DISPLAYS[name]);
  }

  writeMeta({
    fetchedAt: new Date().toISOString(),
    images,
    file,
    index,
    count: photos.length,
  });

  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify({ last: file }, null, 2));
}

async function preparePhoto(
  source: string,
  target: string,
  { width, height, grayLevels }: DisplayConfig,
) {
  // rotate() with no argument applies the EXIF orientation; normalise()
  // stretches the tonal range, which matters on a panel with few greys.
  const { data, info } = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize(width, height, {
      fit,
      position: fit === 'cover' ? sharp.strategy.attention : 'centre',
      background: { r: 255, g: 255, b: 255 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .normalise()
    .sharpen()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const dithered = dither(data, info.width, info.height, grayLevels);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  await sharp(dithered, { raw: { width: info.width, height: info.height, channels: 1 } })
    .toColorspace('b-w')
    .png({ compressionLevel: 9, palette: false })
    .toFile(target);

  console.log(`Photo written to ${target} (${info.width}x${info.height}, ${grayLevels} greys)`);
}

fetchPhoto().catch((error) => {
  console.error('Error preparing photo:', (error as Error).message);
  writeMeta(emptyMeta((error as Error).message));
  process.exit(1);
});
