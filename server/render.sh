#!/usr/bin/env bash
# Full render cycle: fetch data -> static build -> capture screenshots ->
# publish images to the directory Caddy serves.
# Run by the systemd timer, and by trigger-handler.sh when the Kindle's
# center button requests a hard refresh. Serialized with a lock so
# concurrent invocations queue instead of colliding.
set -uo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
OUTPUT_DIR="${OUTPUT_DIR:-/srv/kindle-dashboard}"
PREVIEW_PORT="${PREVIEW_PORT:-4173}"
LOCK_FILE="${LOCK_FILE:-/tmp/kindle-dashboard-render.lock}"

exec 9>"$LOCK_FILE"
flock 9

cd "$REPO_DIR"
echo "[render] starting at $(date '+%Y-%m-%d %H:%M:%S')"

# Data fetchers fail soft: stale data beats no dashboard
for source in calendar energy weather tasks photo; do
    npm run --silent "fetch-$source" || echo "[render] WARN: fetch-$source failed, using existing data"
done

echo "[render] building static site"
npm run --silent build || { echo "[render] ERROR: build failed"; exit 1; }

echo "[render] starting preview server on port $PREVIEW_PORT"
npx vite preview --port "$PREVIEW_PORT" --strictPort >/dev/null 2>&1 &
PREVIEW_PID=$!
trap 'kill "$PREVIEW_PID" 2>/dev/null' EXIT

for _ in $(seq 1 30); do
    curl -sf "http://localhost:$PREVIEW_PORT/" >/dev/null && break
    sleep 1
done
if ! curl -sf "http://localhost:$PREVIEW_PORT/" >/dev/null; then
    echo "[render] ERROR: preview server did not come up"
    exit 1
fi

echo "[render] capturing screenshots"
CAPTURE_URL="http://localhost:$PREVIEW_PORT" npm run --silent capture \
    || { echo "[render] ERROR: capture failed"; exit 1; }

kill "$PREVIEW_PID" 2>/dev/null
trap - EXIT

echo "[render] publishing to $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
shopt -s nullglob
published=0
for f in screenshots/dashboard-*.png; do
    name="$(basename "$f")"
    cp "$f" "$OUTPUT_DIR/.stage-$name" && mv "$OUTPUT_DIR/.stage-$name" "$OUTPUT_DIR/$name"
    published=$((published + 1))
done
if [ "$published" -eq 0 ]; then
    echo "[render] ERROR: no screenshots produced"
    exit 1
fi

ls "$OUTPUT_DIR" | grep '^dashboard-.*\.png$' | sort > "$OUTPUT_DIR/.stage-images.txt"
mv "$OUTPUT_DIR/.stage-images.txt" "$OUTPUT_DIR/images.txt"

echo "[render] done: $published images published at $(date '+%Y-%m-%d %H:%M:%S')"
