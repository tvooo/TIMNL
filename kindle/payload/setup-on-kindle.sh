#!/bin/sh
# One-time device setup, run ON the Kindle (bootstrap.sh does this for you):
#  - install the periodic fetch cron job
#  - install a boot hook so dashboard mode starts on every reboot
# Idempotent: safe to re-run. Modified system files are backed up first.

DIR="$(dirname "$0")"
. "$DIR/config.sh"

BASE=/mnt/us/dashboard
BACKUP="$BASE/backups"
mkdir -p "$BASE/images" "$BACKUP"

rootfs_rw() { mntroot rw 2>/dev/null || mount -o remount,rw /; }
rootfs_ro() { mntroot ro 2>/dev/null || mount -o remount,ro /; }

echo "== Installing cron job =="
CRON_FILE=/etc/crontab/root
CRON_LINE="*/$FETCH_INTERVAL_MIN * * * * sh $BASE/fetch-images.sh cron >> $LOG_FILE 2>&1"

rootfs_rw

if [ -f "$CRON_FILE" ]; then
    cp "$CRON_FILE" "$BACKUP/crontab-root.orig" 2>/dev/null
    # Remove any previous dashboard entries, then append the current one
    grep -v 'dashboard/fetch-images.sh\|dashboard/rotate-display.sh\|rotate-display.sh' "$CRON_FILE" > /tmp/crontab.new
else
    : > /tmp/crontab.new
fi
echo "$CRON_LINE" >> /tmp/crontab.new
cp /tmp/crontab.new "$CRON_FILE"
echo "cron: $CRON_LINE"

# Make crond pick up the change
if [ -x /etc/init.d/cron ]; then
    /etc/init.d/cron restart 2>/dev/null
else
    killall -HUP crond 2>/dev/null
fi

echo "== Installing boot hook =="
BOOT_OK=0

if [ -d /etc/upstart ]; then
    cat > /etc/upstart/dashboard.conf <<EOF
# Kindle dashboard: start dashboard mode on boot
start on started dbus
script
    sleep 20
    sh $BASE/start-dashboard.sh >> $LOG_FILE 2>&1
end script
EOF
    echo "boot hook: /etc/upstart/dashboard.conf (upstart)"
    BOOT_OK=1
elif [ -d /etc/init.d ]; then
    cat > /etc/init.d/dashboard <<EOF
#!/bin/sh
# Kindle dashboard boot hook
case "\$1" in
    start)
        ( sleep 20; sh $BASE/start-dashboard.sh >> $LOG_FILE 2>&1 ) &
        ;;
    stop)
        sh $BASE/stop-dashboard.sh >> $LOG_FILE 2>&1
        ;;
esac
exit 0
EOF
    chmod +x /etc/init.d/dashboard
    LINKED=0
    for rcdir in /etc/rc5.d /etc/rc3.d /etc/rcS.d; do
        if [ -d "$rcdir" ]; then
            ln -sf /etc/init.d/dashboard "$rcdir/S99dashboard"
            echo "boot hook: /etc/init.d/dashboard -> $rcdir/S99dashboard"
            LINKED=1
            break
        fi
    done
    [ "$LINKED" = 1 ] && BOOT_OK=1
fi

rootfs_ro

if [ "$BOOT_OK" != 1 ]; then
    echo "WARNING: could not find a supported boot mechanism (no /etc/upstart,"
    echo "no /etc/rc*.d). Dashboard mode will NOT start automatically on reboot."
    echo "Start it manually after a reboot with:"
    echo "  ssh root@<kindle-ip> sh $BASE/start-dashboard.sh"
fi

echo "== Device setup done =="
