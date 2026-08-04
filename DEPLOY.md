# One-Command Deployment

The `deploy` script automates the entire workflow from fetching calendar data to displaying on your Kindle.

## Setup

### 1. Configure SSH Key Authentication (Recommended)

For passwordless deployment, set up SSH keys:

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy to Kindle
ssh-copy-id root@your-kindle-ip

# Test connection
ssh root@your-kindle-ip "echo 'Connected!'"
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Kindle Configuration
KINDLE_HOST=192.168.1.xxx
KINDLE_USER=root
KINDLE_DIR=/mnt/us/dashboards
KINDLE_SCRIPT=/mnt/us/rotate-display.sh
```

**Required:**
- `KINDLE_HOST`: IP address of your Kindle

**Optional (with defaults):**
- `KINDLE_USER`: SSH user (default: `root`)
- `KINDLE_DIR`: Directory for screenshots (default: `/mnt/us/dashboards`)
- `KINDLE_SCRIPT`: Rotation script path (default: `/mnt/us/rotate-display.sh`)

## Usage

### One-Command Deployment

```bash
npm run deploy
```

This will:
1. ✓ Fetch calendar data from CalDAV
2. ✓ Start Vite dev server (if not running)
3. ✓ Capture screenshots
4. ✓ Transfer to Kindle via SCP
5. ✓ Trigger display rotation on Kindle

### Example Output

```
═══════════════════════════════════════════
  Kindle Dashboard Deployment
═══════════════════════════════════════════

▶ Step 1/5: Fetching calendar data...
✓ Step 1/5: Fetching calendar data completed

▶ Step 2/5: Starting dev server...
✓ Dev server started

▶ Step 3/5: Capturing screenshots...
✓ Step 3/5: Capturing screenshots completed

▶ Step 4/5: Transferring screenshots to Kindle...
✓ Step 4/5: Transferring screenshots to Kindle completed

▶ Step 5/5: Triggering display rotation on Kindle...
✓ Step 5/5: Triggering display rotation on Kindle completed

═══════════════════════════════════════════
  ✓ Deployment completed successfully!
═══════════════════════════════════════════
```

## How It Works

### Server Management
- Checks if dev server is already running
- Starts server only if needed
- Automatically stops server when done (if it was started by script)
- Waits for server to be ready before capturing

### Error Handling
- Validates configuration before starting
- Continues with existing data if calendar fetch fails
- Stops on screenshot or transfer failures
- Graceful cleanup on Ctrl+C

### Smart Behavior
- Detects already-running dev server (doesn't start duplicate)
- Reuses existing server if available
- Only transfers changed screenshots
- Minimal downtime on Kindle

## Scheduling Automatic Deployments

### Option 1: Cron (macOS/Linux)

```bash
# Edit crontab
crontab -e

# Add line for hourly updates
0 * * * * cd /Users/tim/Developer/timnl && npm run deploy >> deploy.log 2>&1

# Or every 30 minutes
*/30 * * * * cd /Users/tim/Developer/timnl && npm run deploy >> deploy.log 2>&1
```

### Option 2: launchd (macOS)

Create `~/Library/LaunchAgents/com.timnl.kindle-deploy.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.timnl.kindle-deploy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/npm</string>
        <string>run</string>
        <string>deploy</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/tim/Developer/timnl</string>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>/Users/tim/kindle-deploy.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/tim/kindle-deploy-error.log</string>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.timnl.kindle-deploy.plist
```

## Troubleshooting

### "KINDLE_HOST not set in .env file"
Add `KINDLE_HOST=192.168.1.xxx` to your `.env` file.

### "Permission denied (publickey)"
Set up SSH key authentication (see Setup section above).

### "Dev server already running"
This is normal! The script will use the existing server.

### Calendar fetch fails
The script continues with existing data. Check your CalDAV credentials.

### Screenshots not appearing on Kindle
- Verify Kindle is on network: `ping your-kindle-ip`
- Check SSH access: `ssh root@your-kindle-ip`
- Verify directory exists: `ssh root@your-kindle-ip "ls /mnt/us/dashboards"`

### Manual fallback
If deployment fails, run steps manually:
```bash
npm run fetch-calendar
npm run dev &
npm run capture
scp screenshots/*.png root@your-kindle-ip:/mnt/us/dashboards/
ssh root@your-kindle-ip "/mnt/us/rotate-display.sh"
```

## Development Tips

### Keep server running during development
```bash
# Terminal 1: Keep server running
npm run dev

# Terminal 2: Deploy (reuses server)
npm run deploy
```

The script detects the running server and won't start a duplicate.

### Test individual steps
```bash
npm run fetch-calendar  # Step 1 only
npm run capture         # Step 3 only (requires server)
```

### View logs on automated runs
```bash
tail -f deploy.log
```
