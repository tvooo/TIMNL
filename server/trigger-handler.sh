#!/usr/bin/env bash
# Handles a hard-refresh request from the Kindle (center button).
# Invoked by systemd socket activation (dashboard-trigger.socket) with
# stdin/stdout connected to the TCP connection.
#
# Responds immediately and detaches the render from the connection: the
# Kindle's WiFi drops often enough that streaming the render log over
# the socket used to kill the render mid-build when the link died. The
# Kindle polls stamp.txt to see the render publish (fetch-images.sh).

printf 'HTTP/1.0 200 OK\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\n'
echo "render triggered at $(date '+%Y-%m-%d %H:%M:%S')"

# Drop the socket fds so the connection closes now; render output goes
# to the journal instead. The service keeps running until the render is
# done (Type=oneshot, TimeoutStartSec covers it).
exec 0</dev/null 1>&2

"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/render.sh"
echo "render finished (exit $?)"
