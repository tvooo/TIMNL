# Architecture

A kitchen dashboard on a reTerminal E1001 running TRMNL firmware. The
server renders web pages to e-paper-ready PNGs (800x480, 2-bit greyscale;
see `src/config/display.ts`) and serves them to the device.

```
┌─────────────────── server (ThinkPad, Arch) ────────────────────┐
│  systemd timer (15 min) → render.sh:                           │
│    fetch data (CalDAV, HA, Open-Meteo, Reminders, photos/)     │
│    → vite build → Playwright capture → 2-bit greyscale PNGs    │
│    → /srv/dashboard/*.png + images.txt                         │
│  Bun :8092  TRMNL device API, serves the images                │
└────────────────────────────────────────────────────────────────┘
                 ▲ HTTP pull on every wake
┌──────────────── reTerminal E1001 (TRMNL firmware) ─────────────┐
│  wakes every 15 min or on button press → next page             │
└────────────────────────────────────────────────────────────────┘
```

## Setup

1. Server: [`server/README.md`](server/README.md)
2. Device: in the firmware's WiFi setup portal, set the custom server URL
   to `http://<server>:8092`.

## Local development

```bash
npm install
npm run fetch-calendar    # + fetch-energy / fetch-weather / fetch-tasks / fetch-photo
npm run dev               # http://localhost:3000
                          # pages: / /week /energy /photo
```

Pages are React components in `src/pages/`, registered in
`src/config/pages.ts` — the capture script derives the screenshot list from
that config, and the server publishes whatever was captured, so adding a
page there is all that's needed for it to show up in the rotation. Setting
`fullBleed: true` on a page drops the tab rail and the footer so it gets the
whole frame (the photo page uses this). `disabled: true` keeps a page's
route but leaves it out of the tabs and the rotation (the photo page is
currently disabled).

## Photos

The photo page shows one image from `photos/` per render, advancing
round-robin through the directory (sorted by filename, remembering the last
one shown in `data/photo-state.json`). Adding or removing files doesn't
disturb the rotation. Drop images in with plain scp:

```bash
scp ~/holiday/*.jpg server:~/timnl/photos/
```

`scripts/fetch-photo.ts` prepares the picked image for the panel: EXIF
orientation applied, fitted to 800x480, greyscaled, contrast-normalised,
and Floyd-Steinberg dithered down to the panel's 4 grey levels — without
dithering, gradients band badly. The result is written to
`public/photo.png` and drawn 1:1 by the page, so the capture step is
lossless and the dither reaches the display exactly as computed.

Two env vars (see `.env.example`): `PHOTOS_DIR` (default `photos`, absolute
paths fine) and `PHOTO_FIT` — `contain` (default, whole photo with white
borders) or `cover` (fills the frame, crops using sharp's attention
strategy).

To test the full render pipeline locally:

```bash
OUTPUT_DIR=/tmp/dash-test server/render.sh && open /tmp/dash-test
```
