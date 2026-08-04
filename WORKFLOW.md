# Kindle Dashboard Workflow

Complete workflow for generating and deploying dashboard images to your Kindle.

## Prerequisites

1. Install dependencies: `npm install`
2. Install Playwright browser: `npm run install-browser`
3. Configure CalDAV credentials in `.env`:
   ```env
   CALDAV_URL=https://your-caldav-server.com/calendar
   CALDAV_USERNAME=your-username
   CALDAV_PASSWORD=your-password
   CALDAV_CALENDAR_NAME=Familie
   ```

## Step-by-Step Workflow

### 1. Fetch Calendar Data
```bash
npm run fetch-calendar
```

This fetches the next 14 days of events from your CalDAV server and saves to `src/data/calendar.json`.

### 2. Start Dev Server
```bash
npm run dev
```

Opens at http://localhost:3000. The dashboard shows:
- Current time and date
- Upcoming calendar events

Leave this running for the next step.

### 3. Capture Screenshot
In a **separate terminal**:
```bash
npm run capture
```

This:
- Uses Playwright to load the dashboard at 800x600 resolution
- Waits 2 seconds for content to render
- Captures screenshot to `screenshots/dashboard-[timestamp].png`
- Also saves as `screenshots/latest.png`

### 4. Deploy to Kindle

**Option A: Manual SCP**
```bash
scp screenshots/latest.png root@your-kindle-ip:/mnt/us/dashboards/
```

**Option B: Copy all screenshots**
```bash
scp screenshots/*.png root@your-kindle-ip:/mnt/us/dashboards/
```

**Option C: Use the deployment script** (if created)
```bash
npm run deploy
```

### 5. View on Kindle

The Kindle's cron job will automatically rotate through images in `/mnt/us/dashboards/`.

Or manually trigger the rotation script:
```bash
ssh root@your-kindle-ip "/mnt/us/rotate-display.sh"
```

## Automated Workflow

You can automate the entire process with a single command:

```bash
npm run fetch-calendar && npm run dev & sleep 5 && npm run capture
```

Or create a combined script:
```bash
./scripts/generate-all.sh
```

## Directory Structure

```
/Users/tim/Developer/timnl/
├── screenshots/              # Generated screenshots (gitignored)
│   ├── dashboard-[timestamp].png
│   └── latest.png
├── src/data/
│   └── calendar.json        # Fetched calendar data (gitignored)
├── scripts/
│   ├── fetch-calendar.js    # CalDAV fetch script
│   └── capture.js           # Playwright screenshot script
└── kindle/
    ├── rotate-display.sh    # Kindle rotation script
    └── README.md            # Kindle setup instructions
```

## Tips

**Update frequency:**
- Fetch calendar: Once daily or when events change
- Capture: After each calendar fetch or UI changes
- Deploy: After capturing new screenshots

**Image optimization:**
Use `kindle_image_converter.py` to optimize for e-ink:
```bash
python kindle_image_converter.py screenshots/latest.png dashboard-optimized.png
```

**Multiple views:**
You can modify the capture script to take screenshots of different routes or widget combinations.

**Cron automation:**
Set up a cron job on your computer to auto-fetch and deploy:
```cron
# Every hour: fetch calendar, capture, deploy
0 * * * * cd /Users/tim/Developer/timnl && npm run fetch-calendar && npm run capture && npm run deploy
```

## Troubleshooting

**"Dev server is not running"**
- Start the dev server first: `npm run dev`
- Check it's accessible at http://localhost:3000

**Screenshot is blank**
- Increase `waitTime` in `scripts/capture.js` (default: 2000ms)
- Check for errors in browser console

**Calendar shows no events**
- Verify `.env` credentials are correct
- Check `CALDAV_CALENDAR_NAME` matches your calendar
- Run `npm run fetch-calendar` manually to see errors

**Kindle not displaying images**
- Verify images are in `/mnt/us/dashboards/`
- Check cron job is running: `ssh root@kindle "crontab -l"`
- Run rotation script manually: `ssh root@kindle "/mnt/us/rotate-display.sh"`
