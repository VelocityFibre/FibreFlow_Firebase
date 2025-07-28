# OneMap Status Command

## Command
`/onemap-status`

## Description
Instantly shows OneMap processing status and next action. Solves the "3-hour morning startup" problem.

## What it does
1. Shows last 5 processed CSV files
2. Identifies next file to process
3. Provides ready-to-run command
4. Displays quick stats
5. Alerts to any issues

## Usage
```
User: /onemap-status
Claude: [Runs the status script and shows current state]
```

## Implementation
```bash
bash /home/ldp/VF/Apps/FibreFlow/OneMap/scripts/morning-status.sh
```

## Example Output
```
=== 🚀 OneMap Morning Status Report ===
📅 Recently Processed:
  - June 19, 2025: Lawley June Week 3 19062025.csv
  - June 22, 2025: Lawley June Week 3 22062025.csv

🎯 Next to Process:
  📄 File: Lawley July Week 3 16072025.csv
  ⚡ Quick Process: cd OneMap && node scripts/bulk-import-onemap.js "Lawley July Week 3 16072025.csv"

📊 Quick Stats:
  Total Files Processed: 19
  Last Process Date: 2025-07-24

⚡ Instant Commands:
  1. Process next CSV: [ready-to-run command]
```

## Benefits
- Takes 5 seconds instead of 3 hours
- No searching through files
- Instant context awareness
- Ready-to-execute commands

## Related Commands
- `/onemap-process` - Process the next CSV
- `/onemap-report` - Generate current report