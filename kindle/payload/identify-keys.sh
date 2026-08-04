#!/bin/sh
# Interactive helper: press buttons on the Kindle and see their keycodes.
# Run over SSH: sh /mnt/us/dashboard/identify-keys.sh
# Put the codes you see into config.sh (NEXT_CODES etc.), then restart
# with: sh /mnt/us/dashboard/start-dashboard.sh
# Stop with Ctrl-C.

echo "Press buttons on the Kindle. Keycodes appear below (Ctrl-C to stop):"

listen() {
    dev="$1"
    while :; do
        ev=$(dd bs=16 count=1 2>/dev/null | od -An -tu2)
        set -- $ev
        [ $# -ge 7 ] || continue
        [ "$5" = "1" ] || continue   # EV_KEY only
        [ "$7" = "1" ] || continue   # key down only
        echo "device=$dev keycode=$6"
    done < "$dev"
}

PIDS=""
for dev in /dev/input/event*; do
    [ -e "$dev" ] || continue
    listen "$dev" &
    PIDS="$PIDS $!"
done

trap 'kill $PIDS 2>/dev/null; exit 0' INT TERM
wait
