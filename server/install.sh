#!/usr/bin/env bash
# Install the dashboard render pipeline on the server (Arch, systemd).
# Run from the repo on the server, as your normal user:
#   sudo server/install.sh
# Installs the render timer and the hard-refresh trigger socket, creates
# the output directory, and prints the Caddy snippet to add.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${OUTPUT_DIR:-/srv/kindle-dashboard}"
RUN_USER="${SUDO_USER:-$(whoami)}"

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo server/install.sh" >&2
    exit 1
fi
if [ "$RUN_USER" = "root" ]; then
    echo "Refusing to install for root; run via sudo from your normal user." >&2
    exit 1
fi

echo "== Installing systemd units (user=$RUN_USER, repo=$REPO_DIR) =="
for unit in dashboard-render.service dashboard-render.timer \
            dashboard-trigger.socket dashboard-trigger@.service; do
    sed -e "s|__USER__|$RUN_USER|g" \
        -e "s|__REPO_DIR__|$REPO_DIR|g" \
        -e "s|__OUTPUT_DIR__|$OUTPUT_DIR|g" \
        "$SCRIPT_DIR/$unit" > "/etc/systemd/system/$unit"
    echo "installed /etc/systemd/system/$unit"
done

echo "== Creating output directory $OUTPUT_DIR =="
mkdir -p "$OUTPUT_DIR"
chown "$RUN_USER" "$OUTPUT_DIR"

systemctl daemon-reload
systemctl enable --now dashboard-render.timer
systemctl enable --now dashboard-trigger.socket

cat <<EOF

== Installed ==
 - dashboard-render.timer   renders every 15 min (edit the .timer to change)
 - dashboard-trigger.socket hard-refresh endpoint on port 8091

Next steps:
 1. Serve the images with Caddy - add to /etc/caddy/Caddyfile:

      http://:8090 {
          root * $OUTPUT_DIR
          file_server
      }

    then: sudo systemctl reload caddy

 2. Test a render now:
      sudo systemctl start dashboard-render.service
      journalctl -u dashboard-render.service -f

 3. Verify: curl http://localhost:8090/images.txt
EOF
