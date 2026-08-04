# Kindle Dashboard Display Script

This script rotates through dashboard images on your jailbroken Kindle 4.

## Setup on Kindle

### 1. Copy the script to your Kindle

```bash
scp kindle/rotate-display.sh root@your-kindle-ip:/mnt/us/
```

### 2. Make it executable

SSH into your Kindle and run:
```bash
ssh root@your-kindle-ip
chmod +x /mnt/us/rotate-display.sh
```

### 3. Create the dashboards directory

```bash
mkdir -p /mnt/us/dashboards
```

### 4. Set up cron job

On the Kindle, edit the crontab:
```bash
crontab -e
```

Add this line to rotate images every 5 minutes:
```cron
*/5 * * * * /mnt/us/rotate-display.sh >> /mnt/us/dashboard.log 2>&1
```

Or every 15 minutes:
```cron
*/15 * * * * /mnt/us/rotate-display.sh >> /mnt/us/dashboard.log 2>&1
```

## Configuration

Edit the script to change these settings:

- `IMAGE_DIR`: Where images are stored (default: `/mnt/us/dashboards`)
- `STATE_FILE`: Where to track current image (default: `.current_index` in IMAGE_DIR)

## How It Works

1. Lists all `.png` files in the dashboards directory
2. Reads the current index from `.current_index` file
3. Displays the next image using `eips -g`
4. Increments and saves the index (wraps around to 0 at end)
5. Logs output if run via cron

## Troubleshooting

**No images display:**
- Check that images are in `/mnt/us/dashboards/`
- Verify images are `.png` format
- Check log: `cat /mnt/us/dashboard.log`

**Images are corrupted:**
- Ensure images are 600x800 (portrait) or 800x600 (landscape)
- Use the `kindle_image_converter.py` script to convert images

**Cron not running:**
- Check cron is installed: `which cron`
- Check cron is running: `ps | grep cron`
- Some Kindle models need `launchpad` or `kual` for cron support
