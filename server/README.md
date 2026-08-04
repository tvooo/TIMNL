# Server Setup (headless ThinkPad, Arch Linux)

The server renders the dashboard pages to e-ink-ready PNGs on a systemd
timer and serves them over HTTP with Caddy. The Kindle pulls them; the
server never needs to reach the Kindle.

## Components

- `render.sh` — fetch data (fail-soft) → `vite build` → `vite preview` →
  Playwright capture → publish PNGs + `images.txt` manifest to
  `/srv/kindle-dashboard`
- `dashboard-render.timer` / `.service` — runs `render.sh` every 15 min
- `dashboard-trigger.socket` / `dashboard-trigger@.service` — port 8091;
  a plain HTTP GET triggers an immediate re-render (used by the Kindle's
  center button) and streams the render log back
- Caddy serves `/srv/kindle-dashboard` on port 8090

## Install

```bash
# 1. Dependencies
sudo pacman -S --needed nodejs npm chromium
git clone <this repo> && cd timnl
npm install

# 2. Config: copy .env.example to .env and fill in the data-source
#    credentials (CalDAV, Home Assistant, weather). Kindle vars not needed
#    on the server.

# 3. Use the system chromium (skips Playwright's bundled download and its
#    library requirements). Add to the .service files or your environment:
#    CHROMIUM_PATH=/usr/bin/chromium
#    (alternatively: npm run install-browser to use Playwright's build)

# 4. Test a render by hand first
CHROMIUM_PATH=/usr/bin/chromium OUTPUT_DIR=/tmp/dash-test server/render.sh
ls /tmp/dash-test   # expect dashboard-*.png + images.txt

# 5. Install the systemd units
sudo server/install.sh

# 6. Serve the images: add to /etc/caddy/Caddyfile
#      http://:8090 {
#          root * /srv/kindle-dashboard
#          file_server
#      }
sudo systemctl reload caddy

# 7. Verify
curl http://localhost:8090/images.txt
curl http://localhost:8091/          # triggers a re-render, streams the log
```

If you set `CHROMIUM_PATH`, add it as an `Environment=` line to both
`dashboard-render.service` and `dashboard-trigger@.service` in
`/etc/systemd/system/`, then `sudo systemctl daemon-reload`. (The render
script only reads it from its process environment, not from `.env`.)

## Operations

```bash
systemctl list-timers dashboard-render.timer   # next run
journalctl -u dashboard-render.service -f      # render logs
journalctl -u 'dashboard-trigger@*' -f         # trigger requests
sudo systemctl start dashboard-render.service  # render now
```

Notes:
- Renders are serialized with a lock file; a timer tick and a button
  trigger won't collide, they queue.
- RAM: Chromium only runs for the ~30 s capture, nothing heavy stays
  resident. Node needs to be on the system PATH (`pacman` install; nvm
  setups won't be visible to systemd without extra configuration).
