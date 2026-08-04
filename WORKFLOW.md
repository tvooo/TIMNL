# Architecture

A kitchen dashboard on a jailbroken Kindle 4. The server renders web pages
to e-ink-ready PNGs; the Kindle pulls and displays them. The Kindle never
needs to be reachable from the server, and keeps WiFi off between fetches.

```
┌─────────────────── server (ThinkPad, Arch) ────────────────────┐
│  systemd timer (15 min) → render.sh:                           │
│    fetch data (CalDAV, HA, Open-Meteo, Reminders)              │
│    → vite build → Playwright capture → rotate/grayscale        │
│    → /srv/kindle-dashboard/*.png + images.txt                  │
│  Caddy :8090  serves the images                                │
│  systemd socket :8091  GET = re-render now (hard refresh)      │
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

## Local development

```bash
npm install
npm run fetch-calendar    # + fetch-energy / fetch-weather / fetch-tasks
npm run dev               # http://localhost:3000, pages: / /week /energy /weather
```

Pages are React components in `src/pages/`, registered in
`src/config/pages.ts` — the capture script derives the screenshot list from
that config, and the server publishes whatever was captured, so adding a
page there is all that's needed for it to show up in the rotation.

To test the full render pipeline locally:

```bash
OUTPUT_DIR=/tmp/dash-test server/render.sh && open /tmp/dash-test
```

## Legacy

`DEPLOY.md` / `npm run deploy` describe the old push-over-SSH flow (server
scp's images to the Kindle). It still works when the Kindle has WiFi on —
occasionally handy during development — but the pull model above is what
runs in production.
