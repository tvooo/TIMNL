# Architecture

A kitchen dashboard on a jailbroken Kindle 4 and a reTerminal E1001 running
TRMNL firmware. The server renders web pages to e-ink-ready PNGs, once per
display (`src/config/displays.ts`); the devices pull and display them. The Kindle never
needs to be reachable from the server, and keeps WiFi off between fetches.

```
┌─────────────────── server (ThinkPad, Arch) ────────────────────┐
│  systemd timer (15 min) → render.sh:                           │
│    fetch data (CalDAV, HA, Open-Meteo, Reminders, photos/)     │
│    → vite build → Playwright capture → rotate/grayscale        │
│    → /srv/kindle-dashboard/*.png + images.txt                  │
│  Caddy :8090  serves the images                                │
│  systemd socket :8091  GET = re-render now (hard refresh)      │
│  Bun :8092  TRMNL device API, serves trmnl/*.png               │
└────────────────────────────────────────────────────────────────┘
                 ▲ HTTP pull (WiFi cycled on/off)
┌─────────────────── Kindle (/mnt/us/dashboard) ─────────────────┐
│  cron (30 min): fetch-images.sh → wget PNGs → eips → WiFi off  │
│  buttons.sh daemon: ◀/▶ prev/next · center = hard refresh      │
│                     Home = redraw                              │
│  boot hook: dashboard mode persists across reboots             │
└────────────────────────────────────────────────────────────────┘
```

## Setup

1. Server: [`server/README.md`](server/README.md)
2. Kindle: [`kindle/README.md`](kindle/README.md) — one command:
   `kindle/bootstrap.sh <kindle-ip>`
3. TRMNL device: in the firmware's WiFi setup portal, set the custom
   server URL to `http://<server>:8092`. Every wake (timer or button) shows
   the next page.

## Local development

```bash
npm install
npm run fetch-calendar    # + fetch-energy / fetch-weather / fetch-tasks / fetch-photo
npm run dev               # http://localhost:3000
                          # pages: / /week /energy /weather /photo
                          # append ?display=trmnl for the 800x480 frame
```

Pages are React components in `src/pages/`, registered in
`src/config/pages.ts` — the capture script derives the screenshot list from
that config, and the server publishes whatever was captured, so adding a
page there is all that's needed for it to show up in the rotation. Setting
`fullBleed: true` on a page drops the tab rail and the footer so it gets the
whole frame (the photo page uses this).

## Photos

The photo page shows one image from `photos/` per render, advancing
round-robin through the directory (sorted by filename, remembering the last
one shown in `data/photo-state.json`). Adding or removing files doesn't
disturb the rotation. Drop images in with plain scp:

```bash
scp ~/holiday/*.jpg server:~/timnl/photos/
```

`scripts/fetch-photo.ts` prepares the picked image once per display: EXIF
orientation applied, fitted to the frame, greyscaled, contrast-normalised,
and Floyd-Steinberg dithered down to the grey levels the panel can actually
show (16 on the Kindle, 4 on the TRMNL) — without dithering, gradients band
badly. The results are written to `public/photo-<display>.png` and drawn 1:1
by the page, so the capture step is lossless and the dither reaches the
display exactly as computed.

Two env vars (see `.env.example`): `PHOTOS_DIR` (default `photos`, absolute
paths fine) and `PHOTO_FIT` — `contain` (default, whole photo with white
borders) or `cover` (fills the frame, crops using sharp's attention
strategy).

To test the full render pipeline locally:

```bash
OUTPUT_DIR=/tmp/dash-test server/render.sh && open /tmp/dash-test
```

## Legacy

`DEPLOY.md` / `npm run deploy` describe the old push-over-SSH flow (server
scp's images to the Kindle). It still works when the Kindle has WiFi on —
occasionally handy during development — but the pull model above is what
runs in production.
