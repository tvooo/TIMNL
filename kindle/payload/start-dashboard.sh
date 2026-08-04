#!/bin/sh
# Put the Kindle into dashboard mode:
#  - prevent the screensaver from kicking in
#  - stop the stock UI (framework) so it releases the screen and buttons
#  - start the hardware button daemon
#  - show the current image
# Safe to re-run at any time. Called by the boot hook on startup.

DIR="$(dirname "$0")"
. "$DIR/config.sh"

echo "$(date '+%Y-%m-%d %H:%M:%S') starting dashboard mode"

# Keep the device awake (powerd keeps running and manages charging)
lipc-set-prop com.lab126.powerd preventScreenSaver 1 2>/dev/null

# Stop the stock Kindle UI; try sysv then upstart style
if [ -x /etc/init.d/framework ]; then
    /etc/init.d/framework stop 2>/dev/null
else
    stop framework 2>/dev/null
fi

# Start (or restart) the button daemon; it kills any previous instance
sh "$DIR/buttons.sh" >> "$LOG_FILE" 2>&1 &

sleep 1
sh "$DIR/display.sh" current

echo "$(date '+%Y-%m-%d %H:%M:%S') dashboard mode active"
