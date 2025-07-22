const fs = require('fs').promises;
const path = require('path');

async function createImportTrackingSystem() {
  console.log('📁 Creating Import Tracking System...\n');
  
  try {
    // 1. Create organized directory structure
    const dirs = [
      'imports',
      'imports/2025-07-21_Lawley_May_Week3',
      'imports/2025-07-21_Lawley_May_Week3/source',
      'imports/2025-07-21_Lawley_May_Week3/reports',
      'imports/2025-07-21_Lawley_May_Week3/scripts',
      'imports/2025-07-21_Lawley_May_Week3/logs'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    }
    
    // 2. Move/copy source file
    console.log('\n📄 Organizing source files...');
    try {
      await fs.copyFile(
        'downloads/Lawley May Week 3 22052025 - First Report.csv',
        'imports/2025-07-21_Lawley_May_Week3/source/Lawley May Week 3 22052025 - First Report.csv'
      );
      console.log('✅ Copied source CSV');
    } catch (err) {
      console.log('⚠️  Source CSV already organized or not found');
    }
    
    // 3. Create import manifest
    const manifest = {
      importName: "Lawley May Week 3 Import",
      importDate: "2025-07-21",
      sourceFile: "Lawley May Week 3 22052025 - First Report.csv",
      totalRecords: 746,
      importSessions: [
        {
          id: "IMP_2025-07-21_1753084532655",
          records: 323,
          status: "partial",
          timestamp: "2025-07-21T07:55:32.831Z"
        },
        {
          id: "IMP_2025-07-21_1753084414458", 
          records: 10,
          status: "test",
          timestamp: "2025-07-21T07:53:38.118Z"
        },
        {
          id: "IMP_2025-07-21_1753088586481",
          records: 52,
          status: "partial",
          timestamp: "2025-07-21T08:43:06.481Z"
        },
        {
          id: "IMP_2025-07-21_1753088791385",
          records: 361,
          status: "completed",
          timestamp: "2025-07-21T08:46:31.385Z"
        }
      ],
      stagingCollection: "onemap-processing-staging",
      recordsStaged: 746,
      recordsReadyForSync: 543,
      recordsNeedingAttention: 203,
      issues: {
        missingPoleNumbers: 203,
        missingFieldAgents: 269,
        duplicatePoles: 27
      },
      nextSteps: [
        "Sync 543 records to production",
        "Investigate 27 duplicate poles",
        "Get pole numbers for 203 records",
        "Assign agents to 269 records"
      ],
      relatedFiles: {
        reports: [
          "import_report_IMP_2025-07-21_1753084532655.md",
          "sync_report_IMP_2025-07-21_1753084186138.txt",
          "sync_report_IMP_2025-07-21_1753084414458.txt",
          "batch_import_completion_IMP_2025-07-21_1753088791385.txt",
          "full_import_report_2025-07-21_1753089028125.md"
        ],
        scripts: [
          "process-1map-sync-simple.js",
          "complete-import-batch.js",
          "sync-to-production.js"
        ]
      }
    };
    
    // Save manifest
    await fs.writeFile(
      'imports/2025-07-21_Lawley_May_Week3/IMPORT_MANIFEST.json',
      JSON.stringify(manifest, null, 2)
    );
    console.log('\n✅ Created import manifest');
    
    // 4. Create README for this import
    const readme = `# Lawley May Week 3 Import

## Overview
- **Date**: 2025-07-21
- **Source**: Lawley May Week 3 22052025 - First Report.csv
- **Total Records**: 746
- **Successfully Staged**: 746
- **Ready for Production**: 543

## Import Sessions
Due to timeouts, the import was completed in 4 sessions:
1. Initial import: 323 records
2. Test import: 10 records  
3. Partial retry: 52 records
4. Final batch: 361 records

## Current Status
✅ **Import Complete** - All 746 records are in staging
⏳ **Pending Sync** - 543 records ready for production sync

## Issues to Address
1. **Missing Pole Numbers**: 203 records
2. **Missing Field Agents**: 269 records
3. **Duplicate Poles**: 27 poles at multiple locations

## Directory Structure
\`\`\`
2025-07-21_Lawley_May_Week3/
├── source/           # Original CSV file
├── reports/          # All import and analysis reports
├── scripts/          # Scripts used for this import
├── logs/             # Processing logs
├── IMPORT_MANIFEST.json   # Detailed import metadata
└── README.md         # This file
\`\`\`

## Next Steps
1. Run \`sync-to-production.js\` for 543 records
2. Review duplicate poles report
3. Get missing pole numbers from field team
4. Update field agent assignments

## Commands
\`\`\`bash
# To sync to production (dry run first)
node sync-to-production.js --dry-run

# To generate updated report
node generate-full-import-report.js
\`\`\`
`;
    
    await fs.writeFile(
      'imports/2025-07-21_Lawley_May_Week3/README.md',
      readme
    );
    console.log('✅ Created README');
    
    // 5. Copy existing reports to organized location
    console.log('\n📄 Organizing existing reports...');
    const reportFiles = [
      'import_report_IMP_2025-07-21_1753084532655.md',
      'sync_report_IMP_2025-07-21_1753084186138.txt',
      'sync_report_IMP_2025-07-21_1753084414458.txt',
      'batch_import_completion_IMP_2025-07-21_1753088791385.txt',
      'full_import_report_2025-07-21_1753089028125.md'
    ];
    
    for (const file of reportFiles) {
      try {
        await fs.copyFile(
          `reports/${file}`,
          `imports/2025-07-21_Lawley_May_Week3/reports/${file}`
        );
        console.log(`✅ Copied: ${file}`);
      } catch (err) {
        console.log(`⚠️  Skipped: ${file} (not found)`);
      }
    }
    
    // 6. Create tracking index
    const trackingIndex = `# OneMap Import Tracking Index

## Purpose
Track all 1Map CSV imports, their status, and related files.

## Imports

### 2025-07-21: Lawley May Week 3
- **Status**: ✅ Imported, ⏳ Pending Sync
- **Records**: 746 total, 543 ready
- **Directory**: \`imports/2025-07-21_Lawley_May_Week3/\`
- **Issues**: 203 missing poles, 27 duplicates

## Directory Structure
\`\`\`
imports/
├── YYYY-MM-DD_ImportName/
│   ├── source/          # Original CSV files
│   ├── reports/         # All related reports
│   ├── scripts/         # Processing scripts
│   ├── logs/            # Import logs
│   ├── IMPORT_MANIFEST.json
│   └── README.md
└── INDEX.md             # This file
\`\`\`

## Quick Commands
\`\`\`bash
# View specific import
cd imports/2025-07-21_Lawley_May_Week3/

# Check manifest
cat IMPORT_MANIFEST.json

# View issues
cat README.md
\`\`\`
`;
    
    await fs.writeFile('imports/INDEX.md', trackingIndex);
    console.log('\n✅ Created tracking index');
    
    console.log('\n🎉 Import Tracking System Created!');
    console.log('\n📁 Structure:');
    console.log('imports/');
    console.log('├── INDEX.md                           # Master tracking index');
    console.log('└── 2025-07-21_Lawley_May_Week3/      # This import');
    console.log('    ├── IMPORT_MANIFEST.json           # Detailed metadata');
    console.log('    ├── README.md                      # Quick overview');
    console.log('    ├── source/                        # Original CSV');
    console.log('    ├── reports/                       # All reports');
    console.log('    ├── scripts/                       # Used scripts');
    console.log('    └── logs/                          # Processing logs');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createImportTrackingSystem();