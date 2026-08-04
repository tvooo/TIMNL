#!/bin/sh
# Show dashboard images on the e-ink display.
# Usage: sh display.sh [current|next|prev]
# Images live in $IMAGE_DIR; images.txt (from the server) defines the order.

DIR="$(dirname "$0")"
. "$DIR/config.sh"

STATE_FILE="$IMAGE_DIR/.current_index"
CMD="${1:-current}"

# Ordered list of locally available images
list_images() {
    if [ -f "$IMAGE_DIR/images.txt" ]; then
        while read -r name; do
            name=$(echo "$name" | tr -d '\r')
            [ -f "$IMAGE_DIR/$name" ] && echo "$name"
        done < "$IMAGE_DIR/images.txt"
    else
        ls "$IMAGE_DIR" 2>/dev/null | grep '\.png$' | sort
    fi
}

IMAGES=$(list_images)
COUNT=$(echo "$IMAGES" | grep -c .)

if [ "$COUNT" -eq 0 ]; then
    eips -c
    eips 2 2 "No dashboard images yet."
    eips 2 4 "Press the center button to fetch."
    exit 1
fi

IDX=$(cat "$STATE_FILE" 2>/dev/null)
case "$IDX" in
    ''|*[!0-9]*) IDX=0 ;;
esac
[ "$IDX" -ge "$COUNT" ] && IDX=0

case "$CMD" in
    next) IDX=$(( (IDX + 1) % COUNT )) ;;
    prev) IDX=$(( (IDX - 1 + COUNT) % COUNT )) ;;
    current) ;;
    *) echo "Usage: display.sh [current|next|prev]"; exit 1 ;;
esac

IMAGE=$(echo "$IMAGES" | sed -n "$((IDX + 1))p")

eips -c
eips -g "$IMAGE_DIR/$IMAGE"

echo "$IDX" > "$STATE_FILE"
