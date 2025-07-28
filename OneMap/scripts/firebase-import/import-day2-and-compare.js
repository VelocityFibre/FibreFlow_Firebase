#!/usr/bin/env node

/**
 * Import Day 2 data and generate change report
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

// File paths
const DAY1_FILE = 'downloads/Lawley May Week 3 22052025 - First Report.csv';
const DAY2_FILE = 'downloads/Lawley May Week 3 23052025.csv';

class DailyChangeAnalyzer {
  constructor() {
    this.day1Data = new Map(); // propertyId -> record
    this.day2Data = new Map();
    this.changes = {
      newProperties: [],
      statusChanges: [],
      poleAssignments: [],
      agentAssignments: [],
      completions: [],
      removals: []
    };
    this.stats = {
      day1Total: 0,
      day2Total: 0,
      newRecords: 0,
      changedRecords: 0,
      unchangedRecords: 0,
      removedRecords: 0
    };
  }

  async loadData() {
    console.log('📂 Loading CSV files...\n');
    
    // Load Day 1
    const day1Content = await fs.readFile(DAY1_FILE, 'utf-8');
    const day1Records = csv.parse(day1Content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`Day 1 (May 22): ${day1Records.length} records`);
    day1Records.forEach(record => {
      this.day1Data.set(record['Property ID'], record);
    });
    this.stats.day1Total = day1Records.length;

    // Load Day 2
    const day2Content = await fs.readFile(DAY2_FILE, 'utf-8');
    const day2Records = csv.parse(day2Content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`Day 2 (May 23): ${day2Records.length} records\n`);
    day2Records.forEach(record => {
      this.day2Data.set(record['Property ID'], record);
    });
    this.stats.day2Total = day2Records.length;
  }

  analyzeChanges() {
    console.log('🔍 Analyzing changes...\n');

    // Check for new properties and changes
    for (const [propertyId, day2Record] of this.day2Data) {
      const day1Record = this.day1Data.get(propertyId);
      
      if (!day1Record) {
        // New property
        this.changes.newProperties.push({
          propertyId,
          status: day2Record['Status'],
          poleNumber: day2Record['Pole Number'],
          address: day2Record['Location Address'],
          agent: day2Record['Field Agent - Pole Permission']
        });
        this.stats.newRecords++;
      } else {
        // Check for changes
        let hasChanges = false;
        const changeDetails = {
          propertyId,
          changes: []
        };

        // Status change
        if (day1Record['Status'] !== day2Record['Status']) {
          hasChanges = true;
          changeDetails.changes.push({
            field: 'Status',
            from: day1Record['Status'],
            to: day2Record['Status']
          });
          this.changes.statusChanges.push({
            propertyId,
            oldStatus: day1Record['Status'],
            newStatus: day2Record['Status'],
            address: day2Record['Location Address']
          });

          // Check if completed
          if (day2Record['Status']?.includes('Installed') || 
              day2Record['Status']?.includes('Completed')) {
            this.changes.completions.push({
              propertyId,
              status: day2Record['Status'],
              poleNumber: day2Record['Pole Number'],
              address: day2Record['Location Address']
            });
          }
        }

        // Pole assignment
        if (!day1Record['Pole Number'] && day2Record['Pole Number']) {
          hasChanges = true;
          this.changes.poleAssignments.push({
            propertyId,
            poleNumber: day2Record['Pole Number'],
            status: day2Record['Status'],
            address: day2Record['Location Address']
          });
        }

        // Agent assignment
        if (day1Record['Field Agent - Pole Permission'] !== day2Record['Field Agent - Pole Permission']) {
          hasChanges = true;
          this.changes.agentAssignments.push({
            propertyId,
            oldAgent: day1Record['Field Agent - Pole Permission'] || 'None',
            newAgent: day2Record['Field Agent - Pole Permission'] || 'None',
            address: day2Record['Location Address']
          });
        }

        if (hasChanges) {
          this.stats.changedRecords++;
        } else {
          this.stats.unchangedRecords++;
        }
      }
    }

    // Check for removed properties
    for (const [propertyId, day1Record] of this.day1Data) {
      if (!this.day2Data.has(propertyId)) {
        this.changes.removals.push({
          propertyId,
          status: day1Record['Status'],
          poleNumber: day1Record['Pole Number'],
          address: day1Record['Location Address']
        });
        this.stats.removedRecords++;
      }
    }
  }

  async generateReport() {
    const reportDate = new Date().toISOString().split('T')[0];
    const report = `# Daily Change Report: May 22 → May 23, 2025

Generated: ${new Date().toLocaleString()}

## 📊 Overview

| Metric | Day 1 (May 22) | Day 2 (May 23) | Change |
|--------|----------------|----------------|---------|
| Total Records | ${this.stats.day1Total} | ${this.stats.day2Total} | ${this.stats.day2Total - this.stats.day1Total > 0 ? '+' : ''}${this.stats.day2Total - this.stats.day1Total} |
| New Properties | - | ${this.stats.newRecords} | +${this.stats.newRecords} |
| Changed Records | - | ${this.stats.changedRecords} | ${this.stats.changedRecords} |
| Unchanged | - | ${this.stats.unchangedRecords} | ${this.stats.unchangedRecords} |
| Removed | - | ${this.stats.removedRecords} | ${this.stats.removedRecords} |

## 🆕 New Properties Added (${this.changes.newProperties.length})
${this.changes.newProperties.length > 0 ? 
this.changes.newProperties.slice(0, 10).map(p => 
`- Property ${p.propertyId}: ${p.status}${p.poleNumber ? ` (Pole: ${p.poleNumber})` : ''}`
).join('\n') : 'No new properties added'}
${this.changes.newProperties.length > 10 ? `\n... and ${this.changes.newProperties.length - 10} more` : ''}

## 📈 Status Changes (${this.changes.statusChanges.length})
${this.changes.statusChanges.length > 0 ?
this.changes.statusChanges.slice(0, 10).map(s => 
`- Property ${s.propertyId}: ${s.oldStatus} → ${s.newStatus}`
).join('\n') : 'No status changes'}
${this.changes.statusChanges.length > 10 ? `\n... and ${this.changes.statusChanges.length - 10} more` : ''}

## 🏗️ New Pole Assignments (${this.changes.poleAssignments.length})
${this.changes.poleAssignments.length > 0 ?
this.changes.poleAssignments.slice(0, 10).map(p => 
`- Property ${p.propertyId}: Assigned pole ${p.poleNumber}`
).join('\n') : 'No new pole assignments'}
${this.changes.poleAssignments.length > 10 ? `\n... and ${this.changes.poleAssignments.length - 10} more` : ''}

## ✅ Completions (${this.changes.completions.length})
${this.changes.completions.length > 0 ?
this.changes.completions.slice(0, 10).map(c => 
`- Property ${c.propertyId}: ${c.status}${c.poleNumber ? ` (Pole: ${c.poleNumber})` : ''}`
).join('\n') : 'No completions'}
${this.changes.completions.length > 10 ? `\n... and ${this.changes.completions.length - 10} more` : ''}

## 👷 Agent Assignment Changes (${this.changes.agentAssignments.length})
${this.changes.agentAssignments.length > 0 ?
this.changes.agentAssignments.slice(0, 5).map(a => 
`- Property ${a.propertyId}: ${a.oldAgent} → ${a.newAgent}`
).join('\n') : 'No agent changes'}
${this.changes.agentAssignments.length > 5 ? `\n... and ${this.changes.agentAssignments.length - 5} more` : ''}

## 🚮 Removed Records (${this.changes.removals.length})
${this.changes.removals.length > 0 ?
this.changes.removals.slice(0, 5).map(r => 
`- Property ${r.propertyId}: ${r.status}`
).join('\n') : 'No records removed'}
${this.changes.removals.length > 5 ? `\n... and ${this.changes.removals.length - 5} more` : ''}

## 📋 Summary

### Progress Indicators:
- **New Work Started**: ${this.changes.newProperties.length} new properties entered the system
- **Active Progress**: ${this.changes.statusChanges.length} properties changed status
- **Infrastructure**: ${this.changes.poleAssignments.length} poles assigned
- **Completions**: ${this.changes.completions.length} installations completed
- **Team Changes**: ${this.changes.agentAssignments.length} agent reassignments

### Key Metrics:
- **Daily Velocity**: ${this.changes.statusChanges.length + this.changes.newProperties.length} total changes
- **Completion Rate**: ${this.changes.completions.length} completions in 24 hours
- **Data Quality**: ${this.stats.removedRecords} records removed (cleanup)
`;

    // Save main report
    const reportsDir = 'reports';
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, `daily-change-report-${reportDate}.md`);
    await fs.writeFile(reportPath, report);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Save detailed CSV exports
    if (this.changes.statusChanges.length > 0) {
      const statusCsv = 'Property ID,Old Status,New Status,Address\n' +
        this.changes.statusChanges.map(s => 
          `${s.propertyId},"${s.oldStatus}","${s.newStatus}","${s.address}"`
        ).join('\n');
      await fs.writeFile(path.join(reportsDir, `status-changes-${reportDate}.csv`), statusCsv);
    }

    if (this.changes.poleAssignments.length > 0) {
      const polesCsv = 'Property ID,Pole Number,Status,Address\n' +
        this.changes.poleAssignments.map(p => 
          `${p.propertyId},"${p.poleNumber}","${p.status}","${p.address}"`
        ).join('\n');
      await fs.writeFile(path.join(reportsDir, `pole-assignments-${reportDate}.csv`), polesCsv);
    }

    // Display summary
    console.log('\n📊 CHANGE SUMMARY');
    console.log('================');
    console.log(`New Properties: ${this.changes.newProperties.length}`);
    console.log(`Status Changes: ${this.changes.statusChanges.length}`);
    console.log(`Pole Assignments: ${this.changes.poleAssignments.length}`);
    console.log(`Completions: ${this.changes.completions.length}`);
    console.log(`Agent Changes: ${this.changes.agentAssignments.length}`);
    console.log(`Removed Records: ${this.changes.removals.length}`);
    
    return report;
  }

  async run() {
    try {
      console.log('🚀 Starting Daily Change Analysis...\n');
      
      await this.loadData();
      this.analyzeChanges();
      await this.generateReport();
      
      console.log('\n✅ Analysis complete!');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

// Run the analyzer
const analyzer = new DailyChangeAnalyzer();
analyzer.run();