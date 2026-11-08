# Server Setup (headless ThinkPad, Arch Linux)

The server renders the dashboard pages to e-paper-ready PNGs on a systemd
timer and serves them to the TRMNL device with a small Bun server.

## Components

- `render.sh` — fetch data (fail-soft) → `vite build` → `vite preview` →
  Playwright capture → publish PNGs (800x480, 2-bit greyscale) + an
  `images.txt` manifest to `/srv/dashboard`
- `dashboard-render.timer` / `.service` — runs `render.sh` every 15 min
- `trmnl.ts` / `dashboard-trmnl.service` — TRMNL device API (`/api/setup`,
  `/api/display`, `/api/log`) on port 8092, run with Bun. Serves the
  images, advancing one page per device wake. Refresh interval:
  `TRMNL_REFRESH_RATE` in the unit (seconds, default 900)

## Install

```bash
# 1. Dependencies, plus bun from https://bun.sh
sudo pacman -S --needed nodejs npm chromium
git clone <this repo> && cd timnl
npm install

# 2. Config: copy .env.example to .env and fill in the data-source
#    credentials (CalDAV, Home Assistant, weather). PHOTOS_DIR points at
#    the photo page's source images.
mkdir -p photos   # scp images here; one is shown per render, round-robin

# 3. Use the system chromium — do NOT run `npx playwright install` on Arch.
#    Playwright downloads Ubuntu fallback builds (all browsers, slow, and
#    often broken at launch due to missing libs). The pacman chromium from
#    step 1 is all that's needed; install.sh detects it automatically.

# 4. Test a render by hand first
CHROMIUM_PATH=/usr/bin/chromium OUTPUT_DIR=/tmp/dash-test server/render.sh
ls /tmp/dash-test   # expect dashboard-*.png + images.txt

# 5. Install the systemd units
sudo server/install.sh

# 6. Let the device in through the firewall
sudo ufw allow from 192.168.1.0/24 to any port 8092 proto tcp

# 7. Verify
curl -H 'ID: test' http://localhost:8092/api/display   # screen JSON
```

`install.sh` detects the system chromium (`command -v chromium`) and bakes
`CHROMIUM_PATH` into the render unit. If you install chromium later or
want a different browser binary, re-run `sudo server/install.sh` (or pass
`CHROMIUM_PATH=/path/to/browser sudo -E server/install.sh`). When manually
testing `render.sh`, set `CHROMIUM_PATH` in the environment yourself — the
script doesn't read `.env`.

## Operations

```bash
systemctl list-timers dashboard-render.timer   # next run
journalctl -u dashboard-render.service -f      # render logs
journalctl -u dashboard-trmnl.service -f       # device requests, battery, logs
sudo systemctl start dashboard-render.service  # render now
```

Notes:
- Renders are serialized with a lock file, so overlapping runs queue.
- RAM: Chromium only runs for the ~30 s capture, nothing heavy stays
  resident. Node needs to be on the system PATH (`pacman` install; nvm
  setups won't be visible to systemd without extra configuration).
