# OneMap Photo Quality Tracking

Quick reference for tracking photo quality improvements in 1Map data.

## Quick Start

```bash
# Track quality for new CSV file
node simple-quality-log.js "../downloads/new-file.csv"

# View trends
node view-quality-trends.js

# Flag missing photos (detailed analysis)
node flag-missing-installation-photos.js
```

## Current Status

Run `node view-quality-trends.js` to see latest metrics.

## Files

- `PHOTO_QUALITY_TRACKING_MISSION.md` - Complete mission overview
- `simple-quality-log.js` - Main tracking script
- `view-quality-trends.js` - Display trends
- `flag-missing-installation-photos.js` - Detailed analysis

## Reports Location

Quality tracking data saved to: `../reports/quality-log.csv`