#!/usr/bin/env bash
# Install the dashboard render pipeline on the server (Arch, systemd).
# Run from the repo on the server, as your normal user:
#   sudo server/install.sh
# Installs the render timer and the TRMNL device API, and creates the
# output directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${OUTPUT_DIR:-/srv/dashboard}"
RUN_USER="${SUDO_USER:-$(whoami)}"

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo server/install.sh" >&2
    exit 1
fi
if [ "$RUN_USER" = "root" ]; then
    echo "Refusing to install for root; run via sudo from your normal user." >&2
    exit 1
fi

# Prefer a system-installed chromium over Playwright's bundled build,
# which is an Ubuntu binary and unreliable on Arch. Empty is fine:
# capture.ts falls back to the bundled build when CHROMIUM_PATH is unset.
CHROMIUM_PATH="${CHROMIUM_PATH:-$(command -v chromium || command -v chromium-browser || true)}"
if [ -n "$CHROMIUM_PATH" ]; then
    echo "== Using system chromium: $CHROMIUM_PATH =="
else
    echo "== No system chromium found; units will use Playwright's bundled browser =="
    echo "   (install one with: sudo pacman -S chromium, then re-run this script)"
fi

# bun from a package, or from the bun.sh installer in the user's home
RUN_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
BUN_PATH="${BUN_PATH:-$(command -v bun || { [ -x "$RUN_HOME/.bun/bin/bun" ] && echo "$RUN_HOME/.bun/bin/bun"; } || true)}"
if [ -z "$BUN_PATH" ]; then
    echo "No bun found; install it from https://bun.sh, then re-run." >&2
    exit 1
fi
echo "== Using bun for the TRMNL server: $BUN_PATH =="

echo "== Installing systemd units (user=$RUN_USER, repo=$REPO_DIR) =="
for unit in dashboard-render.service dashboard-render.timer dashboard-trmnl.service; do
    sed -e "s|__USER__|$RUN_USER|g" \
        -e "s|__REPO_DIR__|$REPO_DIR|g" \
        -e "s|__OUTPUT_DIR__|$OUTPUT_DIR|g" \
        -e "s|__CHROMIUM_PATH__|$CHROMIUM_PATH|g" \
        -e "s|__BUN_PATH__|$BUN_PATH|g" \
        "$SCRIPT_DIR/$unit" > "/etc/systemd/system/$unit"
    echo "installed /etc/systemd/system/$unit"
done

echo "== Creating output directory $OUTPUT_DIR =="
mkdir -p "$OUTPUT_DIR"
chown "$RUN_USER" "$OUTPUT_DIR"

systemctl daemon-reload
systemctl enable --now dashboard-render.timer
systemctl enable dashboard-trmnl.service
systemctl restart dashboard-trmnl.service

cat <<EOF

== Installed ==
 - dashboard-render.timer   renders every 15 min (edit the .timer to change)
 - dashboard-trmnl.service  TRMNL device API on port 8092

Next steps:
 1. Test a render now:
      sudo systemctl start dashboard-render.service
      journalctl -u dashboard-render.service -f

 2. Verify: curl -H 'ID: test' http://localhost:8092/api/display
EOF
