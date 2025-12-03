#!/bin/sh

# Configuration
IMAGE_DIR="/mnt/us/dashboards"
STATE_FILE="${IMAGE_DIR}/.current_index"

# Create image directory if it doesn't exist
mkdir -p "${IMAGE_DIR}"

# Get list of image files (png only for Kindle compatibility)
cd "${IMAGE_DIR}" || exit 1
IMAGES=$(ls -1 *.png 2>/dev/null | sort)

# Count images
IMAGE_COUNT=$(echo "${IMAGES}" | wc -l)

# Exit if no images found
if [ "${IMAGE_COUNT}" -eq 0 ]; then
    echo "No images found in ${IMAGE_DIR}"
    exit 1
fi

# Read current index (default to 0 if file doesn't exist)
if [ -f "${STATE_FILE}" ]; then
    CURRENT_INDEX=$(cat "${STATE_FILE}")
else
    CURRENT_INDEX=0
fi

# Get current image (1-indexed for awk, so add 1)
NEXT_LINE=$((CURRENT_INDEX + 1))
CURRENT_IMAGE=$(echo "${IMAGES}" | sed -n "${NEXT_LINE}p")

# If we couldn't get an image (index out of bounds), reset to first image
if [ -z "${CURRENT_IMAGE}" ]; then
    CURRENT_INDEX=0
    CURRENT_IMAGE=$(echo "${IMAGES}" | head -n 1)
fi

# Display the image
echo "Displaying: ${CURRENT_IMAGE}"

# Clear the screen first
eips -c

# Display image using eips (Kindle's image display tool)
# The -g flag displays a PNG image
eips -g "${IMAGE_DIR}/${CURRENT_IMAGE}"

# Increment index for next time (wrap around)
NEXT_INDEX=$((CURRENT_INDEX + 1))
if [ "${NEXT_INDEX}" -ge "${IMAGE_COUNT}" ]; then
    NEXT_INDEX=0
fi

# Save next index
echo "${NEXT_INDEX}" > "${STATE_FILE}"

exit 0
