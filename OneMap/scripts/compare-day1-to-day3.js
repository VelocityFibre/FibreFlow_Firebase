#!/usr/bin/env node

/**
 * Compare Day 1 (May 22) to Day 3 (May 26) - 4 days of potential changes
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

// File paths
const DAY1_FILE = 'downloads/Lawley May Week 3 22052025 - First Report.csv';
const DAY3_FILE = 'downloads/Lawley May Week 4 26052025.csv';

class ExtendedChangeAnalyzer {
  constructor() {
    this.day1Data = new Map();
    this.day3Data = new Map();
    this.changes = {
      newProperties: [],
      statusChanges: [],
      poleAssignments: [],
      agentAssignments: [],
      completions: [],
      removals: [],
      missingToActive: [] // Special case: Missing status to active status
    };
    this.stats = {
      day1Total: 0,
      day3Total: 0,
      newRecords: 0,
      changedRecords: 0,
      unchangedRecords: 0,
      removedRecords: 0
    };
  }

  async loadData() {
    console.log('📂 Loading CSV files for extended comparison...\n');
    
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

    // Load Day 3
    const day3Content = await fs.readFile(DAY3_FILE, 'utf-8');
    const day3Records = csv.parse(day3Content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`Day 3 (May 26): ${day3Records.length} records\n`);
    day3Records.forEach(record => {
      this.day3Data.set(record['Property ID'], record);
    });
    this.stats.day3Total = day3Records.length;
  }

  analyzeChanges() {
    console.log('🔍 Analyzing 4-day changes (May 22 → May 26)...\n');

    // Track status distribution
    const statusCounts = {
      day1: {},
      day3: {}
    };

    // Count Day 1 statuses
    for (const [, record] of this.day1Data) {
      const status = record['Status'] || 'No Status';
      statusCounts.day1[status] = (statusCounts.day1[status] || 0) + 1;
    }

    // Analyze changes and count Day 3 statuses
    for (const [propertyId, day3Record] of this.day3Data) {
      const status = day3Record['Status'] || 'No Status';
      statusCounts.day3[status] = (statusCounts.day3[status] || 0) + 1;

      const day1Record = this.day1Data.get(propertyId);
      
      if (!day1Record) {
        // New property
        this.changes.newProperties.push({
          propertyId,
          status: day3Record['Status'],
          poleNumber: day3Record['Pole Number'],
          address: day3Record['Location Address'],
          agent: day3Record['Field Agent - Pole Permission']
        });
        this.stats.newRecords++;
      } else {
        // Check for changes
        let hasChanges = false;

        // Status change
        if (day1Record['Status'] !== day3Record['Status']) {
          hasChanges = true;
          this.changes.statusChanges.push({
            propertyId,
            oldStatus: day1Record['Status'],
            newStatus: day3Record['Status'],
            address: day3Record['Location Address']
          });

          // Special case: Missing to Active
          if (day1Record['Status'] === 'Missing' && day3Record['Status'] !== 'Missing') {
            this.changes.missingToActive.push({
              propertyId,
              newStatus: day3Record['Status'],
              poleNumber: day3Record['Pole Number'],
              agent: day3Record['Field Agent - Pole Permission'],
              address: day3Record['Location Address']
            });
          }

          // Check if completed
          if (day3Record['Status']?.includes('Installed') || 
              day3Record['Status']?.includes('Completed')) {
            this.changes.completions.push({
              propertyId,
              status: day3Record['Status'],
              poleNumber: day3Record['Pole Number'],
              address: day3Record['Location Address']
            });
          }
        }

        // Pole assignment
        if (!day1Record['Pole Number'] && day3Record['Pole Number']) {
          hasChanges = true;
          this.changes.poleAssignments.push({
            propertyId,
            poleNumber: day3Record['Pole Number'],
            status: day3Record['Status'],
            address: day3Record['Location Address']
          });
        }

        // Agent assignment
        if (day1Record['Field Agent - Pole Permission'] !== day3Record['Field Agent - Pole Permission']) {
          hasChanges = true;
          this.changes.agentAssignments.push({
            propertyId,
            oldAgent: day1Record['Field Agent - Pole Permission'] || 'None',
            newAgent: day3Record['Field Agent - Pole Permission'] || 'None',
            address: day3Record['Location Address']
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
      if (!this.day3Data.has(propertyId)) {
        this.changes.removals.push({
          propertyId,
          status: day1Record['Status'],
          poleNumber: day1Record['Pole Number'],
          address: day1Record['Location Address']
        });
        this.stats.removedRecords++;
      }
    }

    // Log status distribution
    console.log('📊 Status Distribution:');
    console.log('\nDay 1 (May 22):');
    Object.entries(statusCounts.day1)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    
    console.log('\nDay 3 (May 26):');
    Object.entries(statusCounts.day3)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
  }

  async generateReport() {
    const reportDate = new Date().toISOString().split('T')[0];
    const report = `# Extended Change Report: May 22 → May 26, 2025 (4 Days)

Generated: ${new Date().toLocaleString()}

## 📊 Overview

| Metric | Day 1 (May 22) | Day 3 (May 26) | Change |
|--------|----------------|----------------|---------|
| Total Records | ${this.stats.day1Total} | ${this.stats.day3Total} | ${this.stats.day3Total - this.stats.day1Total > 0 ? '+' : ''}${this.stats.day3Total - this.stats.day1Total} |
| New Properties | - | ${this.stats.newRecords} | +${this.stats.newRecords} |
| Changed Records | - | ${this.stats.changedRecords} | ${this.stats.changedRecords} |
| Unchanged | - | ${this.stats.unchangedRecords} | ${this.stats.unchangedRecords} |
| Removed | - | ${this.stats.removedRecords} | ${this.stats.removedRecords} |

## 🎯 Key Achievement: Missing Status Resolutions (${this.changes.missingToActive.length})
${this.changes.missingToActive.length > 0 ?
'Properties that moved from "Missing" status to active work:\n' +
this.changes.missingToActive.slice(0, 10).map(m => 
`- Property ${m.propertyId}: Missing → ${m.newStatus}${m.poleNumber ? ` (Pole: ${m.poleNumber})` : ''}`
).join('\n') : 'No missing status resolutions'}
${this.changes.missingToActive.length > 10 ? `\n... and ${this.changes.missingToActive.length - 10} more` : ''}

## 🆕 New Properties Added (${this.changes.newProperties.length})
${this.changes.newProperties.length > 0 ? 
this.changes.newProperties.slice(0, 10).map(p => 
`- Property ${p.propertyId}: ${p.status}${p.poleNumber ? ` (Pole: ${p.poleNumber})` : ''}`
).join('\n') : 'No new properties added'}
${this.changes.newProperties.length > 10 ? `\n... and ${this.changes.newProperties.length - 10} more` : ''}

## 📈 All Status Changes (${this.changes.statusChanges.length})
${this.changes.statusChanges.length > 0 ?
this.changes.statusChanges.slice(0, 15).map(s => 
`- Property ${s.propertyId}: ${s.oldStatus} → ${s.newStatus}`
).join('\n') : 'No status changes'}
${this.changes.statusChanges.length > 15 ? `\n... and ${this.changes.statusChanges.length - 15} more` : ''}

## 🏗️ New Pole Assignments (${this.changes.poleAssignments.length})
${this.changes.poleAssignments.length > 0 ?
this.changes.poleAssignments.slice(0, 15).map(p => 
`- Property ${p.propertyId}: Assigned pole ${p.poleNumber} (${p.status})`
).join('\n') : 'No new pole assignments'}
${this.changes.poleAssignments.length > 15 ? `\n... and ${this.changes.poleAssignments.length - 15} more` : ''}

## ✅ Completions (${this.changes.completions.length})
${this.changes.completions.length > 0 ?
this.changes.completions.slice(0, 10).map(c => 
`- Property ${c.propertyId}: ${c.status}${c.poleNumber ? ` (Pole: ${c.poleNumber})` : ''}`
).join('\n') : 'No completions'}
${this.changes.completions.length > 10 ? `\n... and ${this.changes.completions.length - 10} more` : ''}

## 👷 Agent Assignment Changes (${this.changes.agentAssignments.length})
${this.changes.agentAssignments.length > 0 ?
this.changes.agentAssignments.slice(0, 10).map(a => 
`- Property ${a.propertyId}: ${a.oldAgent} → ${a.newAgent}`
).join('\n') : 'No agent changes'}
${this.changes.agentAssignments.length > 10 ? `\n... and ${this.changes.agentAssignments.length - 10} more` : ''}

## 🚮 Removed Records (${this.changes.removals.length})
${this.changes.removals.length > 0 ?
this.changes.removals.slice(0, 5).map(r => 
`- Property ${r.propertyId}: ${r.status}`
).join('\n') : 'No records removed'}
${this.changes.removals.length > 5 ? `\n... and ${this.changes.removals.length - 5} more` : ''}

## 📋 4-Day Summary

### Progress Indicators:
- **Missing Status Resolved**: ${this.changes.missingToActive.length} properties now have pole numbers
- **New Work Started**: ${this.changes.newProperties.length} new properties entered the system
- **Active Progress**: ${this.changes.statusChanges.length} properties changed status
- **Infrastructure**: ${this.changes.poleAssignments.length} poles assigned
- **Completions**: ${this.changes.completions.length} installations completed
- **Team Changes**: ${this.changes.agentAssignments.length} agent reassignments

### Key Metrics:
- **4-Day Velocity**: ${this.changes.statusChanges.length + this.changes.newProperties.length} total changes
- **Completion Rate**: ${this.changes.completions.length} completions over 4 days
- **Field Work Success**: ${this.changes.missingToActive.length} missing status resolved
- **Data Quality**: ${this.stats.removedRecords} records removed

### Work Rate Analysis:
- **Average Daily Changes**: ${Math.round((this.changes.statusChanges.length + this.changes.newProperties.length) / 4)} per day
- **Change Rate**: ${Math.round((this.stats.changedRecords / this.stats.day1Total) * 100)}% of records modified
- **Stability**: ${Math.round((this.stats.unchangedRecords / this.stats.day1Total) * 100)}% unchanged
`;

    // Save main report
    const reportsDir = 'reports';
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, `extended-change-report-${reportDate}.md`);
    await fs.writeFile(reportPath, report);
    
    console.log(`\n✅ Report saved to: ${reportPath}`);

    // Save detailed exports
    if (this.changes.missingToActive.length > 0) {
      const missingCsv = 'Property ID,New Status,Pole Number,Agent,Address\n' +
        this.changes.missingToActive.map(m => 
          `${m.propertyId},"${m.newStatus}","${m.poleNumber || ''}","${m.agent || ''}","${m.address}"`
        ).join('\n');
      await fs.writeFile(path.join(reportsDir, `missing-resolved-${reportDate}.csv`), missingCsv);
      console.log(`✅ Missing resolutions saved to: missing-resolved-${reportDate}.csv`);
    }

    // Display summary
    console.log('\n📊 4-DAY CHANGE SUMMARY');
    console.log('======================');
    console.log(`Missing → Active: ${this.changes.missingToActive.length} ⭐`);
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
      console.log('🚀 Starting Extended Change Analysis (4 days)...\n');
      
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
const analyzer = new ExtendedChangeAnalyzer();
analyzer.run();