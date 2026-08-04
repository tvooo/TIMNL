#!/bin/sh
# Pull dashboard images from the server, cycling WiFi on/off around the
# transfer. Modes:
#   sh fetch-images.sh            pull latest images (used by cron)
#   sh fetch-images.sh trigger    ask the server to re-render first
#                                 (hard refresh; used by the center button)
# Append "keepwifi" to leave WiFi enabled afterwards (used by bootstrap).

DIR="$(dirname "$0")"
. "$DIR/config.sh"

MODE=pull
KEEP="$KEEP_WIFI"
# Maintenance switch: `touch /mnt/us/dashboard/.keepwifi` to stop WiFi
# from being disabled after fetches (e.g. while you want SSH access).
[ -f "$DIR/.keepwifi" ] && KEEP=1
for arg in "$@"; do
    case "$arg" in
        trigger) MODE=trigger ;;
        keepwifi) KEEP=1 ;;
    esac
done

LOCK=/tmp/dashboard-fetch.lock
if ! mkdir "$LOCK" 2>/dev/null; then
    echo "fetch already running, skipping"
    exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT INT TERM

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }
msg() { eips 1 1 "$1     " 2>/dev/null; }

wifi_connected() {
    ifconfig wlan0 2>/dev/null | grep -q 'inet addr'
}

wifi_on() {
    lipc-set-prop com.lab126.cmd wirelessEnable 1 2>/dev/null \
        || lipc-set-prop com.lab126.wifid enable 1 2>/dev/null \
        || ifup wlan0 2>/dev/null
}

wifi_off() {
    lipc-set-prop com.lab126.cmd wirelessEnable 0 2>/dev/null \
        || lipc-set-prop com.lab126.wifid enable 0 2>/dev/null \
        || ifdown wlan0 2>/dev/null
}

# The Kindle's busybox wget (1.7.2) has no timeout flag; enforce one by
# running it in the background and killing it if it overruns. Its -O also
# refuses to write to an existing file (even /dev/null), so clear the
# target first and never pass device nodes.
# Usage: wget_to <timeout-seconds> <output-file> <url>
wget_to() {
    _t="$1"; _out="$2"; _url="$3"
    rm -f "$_out"
    wget -q -O "$_out" "$_url" 2>/dev/null &
    _pid=$!
    _i=0
    while kill -0 "$_pid" 2>/dev/null; do
        if [ "$_i" -ge "$_t" ]; then
            kill "$_pid" 2>/dev/null
            wait "$_pid" 2>/dev/null
            return 1
        fi
        sleep 1
        _i=$((_i + 1))
    done
    wait "$_pid"
}

server_ok() {
    wget_to 5 /tmp/dashboard-probe "$SERVER_URL/images.txt"
}

msg "Updating..."
wifi_connected || wifi_on

i=0
while [ $i -lt 30 ]; do
    server_ok && break
    sleep 2
    i=$((i + 1))
done

if ! server_ok; then
    log "ERROR: cannot reach $SERVER_URL"
    msg "No connection"
    [ "$KEEP" = 1 ] || wifi_off
    sleep 2
    sh "$DIR/display.sh" current
    exit 1
fi

if [ "$MODE" = trigger ] && [ -n "$TRIGGER_URL" ]; then
    log "requesting server re-render"
    msg "Refreshing data..."
    wget_to 300 /tmp/dashboard-trigger.out "$TRIGGER_URL" && tail -3 /tmp/dashboard-trigger.out
    rm -f /tmp/dashboard-trigger.out
fi

mkdir -p "$IMAGE_DIR"
MANIFEST=/tmp/dashboard-images.txt
if ! wget_to 15 "$MANIFEST" "$SERVER_URL/images.txt"; then
    log "ERROR: failed to download manifest"
    msg "Fetch failed"
    [ "$KEEP" = 1 ] || wifi_off
    sleep 2
    sh "$DIR/display.sh" current
    exit 1
fi

FETCHED=0
while read -r name; do
    name=$(echo "$name" | tr -d '\r')
    [ -n "$name" ] || continue
    # Only accept plain image filenames from the manifest
    case "$name" in
        *[!A-Za-z0-9._-]*|.*) log "skipping suspicious name: $name"; continue ;;
        *.png) ;;
        *) continue ;;
    esac
    if wget_to 60 "$IMAGE_DIR/.tmp.$name" "$SERVER_URL/$name"; then
        mv "$IMAGE_DIR/.tmp.$name" "$IMAGE_DIR/$name"
        FETCHED=$((FETCHED + 1))
    else
        log "WARN: failed to fetch $name"
        rm -f "$IMAGE_DIR/.tmp.$name"
    fi
done < "$MANIFEST"

if [ "$FETCHED" -gt 0 ]; then
    cp "$MANIFEST" "$IMAGE_DIR/images.txt"
fi
log "fetched $FETCHED images"

[ "$KEEP" = 1 ] || wifi_off

# Keep the log from growing forever
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 200000 ]; then
    tail -c 100000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

sh "$DIR/display.sh" current
