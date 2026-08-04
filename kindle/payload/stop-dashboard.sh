#!/bin/sh
# Leave dashboard mode for maintenance: stop the button daemon, allow the
# screensaver again, and enable WiFi so the device is reachable over SSH.
# The stock UI is NOT restarted automatically - reboot the Kindle (or run
# /etc/init.d/framework start) to get the normal Kindle interface back.

DIR="$(dirname "$0")"
. "$DIR/config.sh"

echo "$(date '+%Y-%m-%d %H:%M:%S') leaving dashboard mode"

if [ -f "$DIR/.buttons.pids" ]; then
    for pid in $(cat "$DIR/.buttons.pids"); do
        kill "$pid" 2>/dev/null
    done
    rm -f "$DIR/.buttons.pids"
fi

lipc-set-prop com.lab126.powerd preventScreenSaver 0 2>/dev/null

# Turn WiFi on and keep it on so you can SSH in
touch "$DIR/.keepwifi"
lipc-set-prop com.lab126.cmd wirelessEnable 1 2>/dev/null \
    || lipc-set-prop com.lab126.wifid enable 1 2>/dev/null \
    || ifup wlan0 2>/dev/null

echo "Dashboard stopped. WiFi is on and will stay on (.keepwifi flag set)."
echo "Remove the flag with: rm $DIR/.keepwifi"
echo "Restore the Kindle UI with a reboot, or: /etc/init.d/framework start"
