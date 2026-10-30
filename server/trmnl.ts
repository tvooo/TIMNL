// TRMNL "bring your own server" device API, run with Bun. Serves the
// dashboard images render.sh publishes to $OUTPUT_DIR/trmnl to devices
// running TRMNL firmware. Each /api/display call advances to the next page,
// so the device's button flips pages too.
//
// No device authentication: like the Caddy image server, it's LAN-only.
import { createHash } from 'crypto';
import { basename, join } from 'path';

const PORT = Number(process.env.TRMNL_PORT || 8092);
const IMAGE_DIR = join(process.env.OUTPUT_DIR || '/srv/kindle-dashboard', 'trmnl');
const REFRESH_RATE = Number(process.env.TRMNL_REFRESH_RATE || 900);

const pageIndex = new Map<string, number>();

async function listImages(): Promise<string[]> {
  const manifest = Bun.file(join(IMAGE_DIR, 'images.txt'));
  if (!(await manifest.exists())) return [];
  return (await manifest.text()).split('\n').filter(Boolean);
}

// The firmware only downloads an image when its filename changes, so the
// render time goes into the name. Max 31 characters.
async function screen(origin: string, image: string) {
  const { mtimeMs } = await Bun.file(join(IMAGE_DIR, image)).stat();
  return {
    image_url: `${origin}/trmnl/${image}`,
    filename: `${basename(image, '.png')}-${Math.floor(mtimeMs / 1000)}`,
  };
}

async function setup(req: Request, origin: string) {
  const id = req.headers.get('ID') ?? '';
  const [first] = await listImages();
  console.log(`[setup] ${id} (${req.headers.get('Model')}, fw ${req.headers.get('FW-Version')})`);
  return Response.json({
    status: 200,
    api_key: createHash('sha256').update(id).digest('hex').slice(0, 22),
    friendly_id: id.replaceAll(':', '').slice(-6).toUpperCase(),
    message: 'Welcome to the kitchen dashboard',
    ...(first && (await screen(origin, first))),
  });
}

async function display(req: Request, origin: string) {
  const id = req.headers.get('ID') ?? '';
  const images = await listImages();
  if (images.length === 0) {
    console.log(`[display] ${id}: no images in ${IMAGE_DIR}`);
    return new Response('no images rendered yet', { status: 503 });
  }

  const index = ((pageIndex.get(id) ?? -1) + 1) % images.length;
  pageIndex.set(id, index);
  console.log(
    `[display] ${id} → ${images[index]} ` +
      `(battery ${req.headers.get('Battery-Voltage')} V, rssi ${req.headers.get('RSSI')})`,
  );

  return Response.json({
    status: 0,
    ...(await screen(origin, images[index])),
    refresh_rate: REFRESH_RATE,
    reset_firmware: false,
    update_firmware: false,
    firmware_url: null,
    special_function: 'none',
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/setup') return setup(req, url.origin);
    if (req.method === 'GET' && url.pathname === '/api/display') return display(req, url.origin);
    if (req.method === 'POST' && url.pathname === '/api/log') {
      console.log(`[log] ${req.headers.get('ID')}: ${await req.text()}`);
      return new Response(null, { status: 204 });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/trmnl/')) {
      const file = Bun.file(join(IMAGE_DIR, basename(url.pathname)));
      if (await file.exists()) return new Response(file);
    }

    return new Response('not found', { status: 404 });
  },
});

console.log(`TRMNL server on :${PORT}, serving ${IMAGE_DIR}`);
