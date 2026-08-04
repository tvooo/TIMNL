#!/bin/sh
# Hardware button daemon: reads raw input events and maps them to
# dashboard actions.
#   page-turn / 5-way left-right  -> previous / next screen
#   5-way center (select)         -> hard refresh (WiFi on, fetch, WiFi off)
#   Home                          -> redraw current screen (clears ghosting)
# Keycodes are configured in config.sh; run identify-keys.sh to find the
# right codes for your device if the defaults don't match.

DIR="$(dirname "$0")"
. "$DIR/config.sh"

PIDFILE="$DIR/.buttons.pids"

# Replace any previous instance
if [ -f "$PIDFILE" ]; then
    for pid in $(cat "$PIDFILE"); do
        kill "$pid" 2>/dev/null
    done
    rm -f "$PIDFILE"
fi
echo $$ > "$PIDFILE"

matches() {
    # matches <code> <list of codes>
    _code="$1"; shift
    for c in "$@"; do
        [ "$c" = "$_code" ] && return 0
    done
    return 1
}

handle_key() {
    code="$1"
    if matches "$code" $NEXT_CODES; then
        sh "$DIR/display.sh" next
    elif matches "$code" $PREV_CODES; then
        sh "$DIR/display.sh" prev
    elif matches "$code" $REFRESH_CODES; then
        # Run in background so buttons stay responsive; fetch-images.sh
        # holds its own lock, so repeated presses are ignored while busy.
        sh "$DIR/fetch-images.sh" trigger >> "$LOG_FILE" 2>&1 &
    elif matches "$code" $REDRAW_CODES; then
        sh "$DIR/display.sh" current
    fi
}

# Each input_event on 32-bit ARM is 16 bytes:
#   sec(4) usec(4) type(2) code(2) value(4)
# The Kindle has no od, but hexdump(1) is present; print 8 decimal
# shorts: field 5 = type, 6 = code, 7 = value low word.
# type 1 = EV_KEY, value 1 = key down.
listen() {
    dev="$1"
    while :; do
        ev=$(dd bs=16 count=1 2>/dev/null | hexdump -e '8/2 "%u " "\n"')
        set -- $ev
        [ $# -ge 7 ] || continue
        [ "$5" = "1" ] || continue
        [ "$7" = "1" ] || continue
        handle_key "$6"
    done < "$dev"
}

for dev in /dev/input/event*; do
    [ -e "$dev" ] || continue
    listen "$dev" &
    echo $! >> "$PIDFILE"
done

wait
