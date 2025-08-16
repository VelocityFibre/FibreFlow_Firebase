# SOW Import Scripts

This directory contains scripts for importing Scope of Work (SOW) data from Excel files into the Neon database.

## Setup

1. **Install dependencies**:
   ```bash
   cd scripts/sow-import
   npm install
   ```

2. **Configure Neon connection**:
   - Add your Neon connection string to `.env.local`:
   ```
   NEON_CONNECTION_STRING=postgresql://user:password@host/database?sslmode=require
   ```

## Usage

Import SOW data for a project:

```bash
node import-sow-to-neon.js <projectId> <poles.xlsx> <drops.xlsx> [fibre.xlsx]
```

### Example:

```bash
# Import with all three files
node import-sow-to-neon.js oAigmUjSbjWHmH80AMxc ~/Downloads/Lawley\ Poles.xlsx ~/Downloads/Lawley\ Drops.xlsx ~/Downloads/Fibre.xlsx

# Import without fibre (optional)
node import-sow-to-neon.js oAigmUjSbjWHmH80AMxc ~/Downloads/Lawley\ Poles.xlsx ~/Downloads/Lawley\ Drops.xlsx
```

## What it does

1. **Creates tables** if they don't exist:
   - `sow_poles` - Infrastructure pole data
   - `sow_drops` - Home connection data
   - `sow_fibre` - Cable segment data

2. **Imports data** from Excel files:
   - Validates and parses each file
   - Handles duplicate records (updates existing)
   - Reports import progress and errors

3. **Validates relationships**:
   - Checks if drops reference existing poles
   - Reports orphaned drops

## Database Schema

### sow_poles
- `project_id` - Links to Firebase project
- `pole_number` - Unique pole identifier
- `status` - Current pole status
- `latitude`, `longitude` - GPS coordinates
- `zone_no`, `pon_no` - Zone and PON identifiers

### sow_drops
- `project_id` - Links to Firebase project
- `drop_number` - Unique drop identifier
- `pole_number` - Reference to pole
- `address` - Physical address
- `status` - Connection status
- `distance_to_pole` - Distance in meters

### sow_fibre
- `project_id` - Links to Firebase project
- `segment_id` - Unique segment identifier
- `from_point`, `to_point` - Connection points
- `distance` - Segment length
- `fibre_type` - Cable type/cores

## Viewing in App

After importing, the data will be visible in the FibreFlow app:
1. Go to the project detail page
2. Click on the "Scope of Work" tab
3. View poles, drops, and fibre data

## Troubleshooting

- **Connection error**: Check your `NEON_CONNECTION_STRING` in `.env.local`
- **File not found**: Use full paths or ensure files are in current directory
- **No data imported**: Check console output for specific errors
- **Drops without poles**: Normal if pole data is missing from Excel