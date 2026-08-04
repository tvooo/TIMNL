#!/usr/bin/env bash
# Handles a hard-refresh request from the Kindle (center button).
# Invoked by systemd socket activation (dashboard-trigger.socket) with
# stdin/stdout connected to the TCP connection: emit a minimal HTTP
# response and stream the render log so the client sees progress.

printf 'HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n'
echo "render triggered at $(date '+%Y-%m-%d %H:%M:%S')"

"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/render.sh" 2>&1
echo "render finished (exit $?)"
