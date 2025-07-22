#!/usr/bin/env node

/**
 * Process multiple CSV files and track all changes
 */

const fs = require('fs').promises;
const csv = require('csv-parse/sync');
const path = require('path');

// Import our tracking system
const ImportTracker = require('./update-tracking-log.js');

function removeBOM(str) {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1);
  }
  return str;
}

class MultiDayProcessor {
  constructor() {
    this.tracker = new ImportTracker();
    this.allData = new Map(); // date -> records
    this.results = [];
  }

  async loadFile(filePath, fileDate) {
    console.log(`\n📂 Loading ${fileDate} data...`);
    
    let content = await fs.readFile(filePath, 'utf-8');
    content = removeBOM(content);
    
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: ';',
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`   ✅ Loaded ${records.length} records`);
    
    // Store for comparison
    this.allData.set(fileDate, records);
    
    // Analyze the data
    const analysis = this.analyzeData(records, fileDate);
    
    return {
      fileDate,
      filePath,
      recordCount: records.length,
      analysis
    };
  }

  analyzeData(records, fileDate) {
    const analysis = {
      totalRecords: records.length,
      withPoleNumbers: 0,
      withoutPoleNumbers: 0,
      withGPS: 0,
      withAgents: 0,
      statusCounts: {},
      propertyIds: new Set()
    };
    
    records.forEach(record => {
      // Count various fields
      if (record['Pole Number']) analysis.withPoleNumbers++;
      else analysis.withoutPoleNumbers++;
      
      if (record['Latitude'] && record['Longitude']) analysis.withGPS++;
      
      if (record['Field Agent Name (pole permission)'] && 
          record['Field Agent Name (pole permission)'] !== 'No Agent') {
        analysis.withAgents++;
      }
      
      // Status distribution
      const status = record['Status'] || 'Blank/Empty';
      analysis.statusCounts[status] = (analysis.statusCounts[status] || 0) + 1;
      
      // Track property IDs
      if (record['Property ID']) {
        analysis.propertyIds.add(record['Property ID']);
      }
    });
    
    return analysis;
  }

  compareWithPrevious(currentDate, currentData, previousDate, previousData) {
    console.log(`\n🔄 Comparing ${previousDate} → ${currentDate}...`);
    
    const currentMap = new Map(currentData.map(r => [r['Property ID'], r]));
    const previousMap = new Map(previousData.map(r => [r['Property ID'], r]));
    
    const comparison = {
      period: { from: previousDate, to: currentDate },
      newRecords: [],
      removedRecords: [],
      statusChanges: [],
      poleAssignments: [],
      agentChanges: [],
      completions: []
    };
    
    // Find new records
    for (const [propId, record] of currentMap) {
      if (!previousMap.has(propId)) {
        comparison.newRecords.push({
          propertyId: propId,
          status: record['Status'],
          poleNumber: record['Pole Number']
        });
      }
    }
    
    // Find removed records
    for (const [propId, record] of previousMap) {
      if (!currentMap.has(propId)) {
        comparison.removedRecords.push({
          propertyId: propId,
          status: record['Status']
        });
      }
    }
    
    // Find changes in existing records
    for (const [propId, currentRecord] of currentMap) {
      const previousRecord = previousMap.get(propId);
      if (previousRecord) {
        // Status changes
        if (previousRecord['Status'] !== currentRecord['Status']) {
          comparison.statusChanges.push({
            propertyId: propId,
            from: previousRecord['Status'] || 'Blank',
            to: currentRecord['Status'] || 'Blank'
          });
          
          // Check for completions
          if (currentRecord['Status']?.includes('Installed') || 
              currentRecord['Status']?.includes('Completed')) {
            comparison.completions.push({
              propertyId: propId,
              status: currentRecord['Status']
            });
          }
        }
        
        // Pole assignments
        if (!previousRecord['Pole Number'] && currentRecord['Pole Number']) {
          comparison.poleAssignments.push({
            propertyId: propId,
            poleNumber: currentRecord['Pole Number'],
            status: currentRecord['Status']
          });
        }
        
        // Agent changes
        const prevAgent = previousRecord['Field Agent Name (pole permission)'] || 'None';
        const currAgent = currentRecord['Field Agent Name (pole permission)'] || 'None';
        if (prevAgent !== currAgent) {
          comparison.agentChanges.push({
            propertyId: propId,
            from: prevAgent,
            to: currAgent
          });
        }
      }
    }
    
    // Summary
    console.log(`   New records: ${comparison.newRecords.length}`);
    console.log(`   Status changes: ${comparison.statusChanges.length}`);
    console.log(`   Pole assignments: ${comparison.poleAssignments.length}`);
    console.log(`   Completions: ${comparison.completions.length}`);
    
    return comparison;
  }

  async generateDetailedReport(results) {
    const reportDate = new Date().toISOString().split('T')[0];
    let report = `# Multi-Day Analysis Report - ${reportDate}\n\n`;
    
    report += `## Files Processed\n\n`;
    report += `| Date | Records | With Poles | Without Poles | Status Distribution |\n`;
    report += `|------|---------|------------|---------------|--------------------|\n`;
    
    results.forEach(result => {
      const topStatus = Object.entries(result.analysis.statusCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ');
      
      report += `| ${result.fileDate} | ${result.recordCount} | ${result.analysis.withPoleNumbers} | ${result.analysis.withoutPoleNumbers} | ${topStatus} |\n`;
    });
    
    report += `\n## Day-to-Day Changes\n\n`;
    
    // Add comparison details
    for (let i = 1; i < results.length; i++) {
      const comparison = results[i].comparison;
      if (comparison) {
        report += `### ${comparison.period.from} → ${comparison.period.to}\n\n`;
        report += `- **New Records**: ${comparison.newRecords.length}\n`;
        report += `- **Removed**: ${comparison.removedRecords.length}\n`;
        report += `- **Status Changes**: ${comparison.statusChanges.length}\n`;
        report += `- **Pole Assignments**: ${comparison.poleAssignments.length}\n`;
        report += `- **Completions**: ${comparison.completions.length}\n`;
        report += `- **Agent Changes**: ${comparison.agentChanges.length}\n\n`;
        
        if (comparison.statusChanges.length > 0) {
          report += `#### Sample Status Changes:\n`;
          comparison.statusChanges.slice(0, 5).forEach(change => {
            report += `- Property ${change.propertyId}: ${change.from} → ${change.to}\n`;
          });
          report += '\n';
        }
        
        if (comparison.poleAssignments.length > 0) {
          report += `#### New Pole Assignments:\n`;
          comparison.poleAssignments.slice(0, 5).forEach(pole => {
            report += `- Property ${pole.propertyId}: ${pole.poleNumber}\n`;
          });
          report += '\n';
        }
      }
    }
    
    // Save report
    const reportPath = `reports/multi-day-analysis-${reportDate}.md`;
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  async processAllFiles() {
    console.log('🚀 Starting Multi-Day Processing...\n');
    
    // Define files to process in order
    const filesToProcess = [
      { path: 'downloads/Lawley May Week 3 22052025 - First Report.csv', date: '2025-05-22' },
      { path: 'downloads/Lawley May Week 3 23052025.csv', date: '2025-05-23' },
      { path: 'downloads/Lawley May Week 4 26052025.csv', date: '2025-05-26' },
      { path: 'downloads/Lawley May Week 4 27052025.csv', date: '2025-05-27' },
      { path: 'downloads/Lawley May Week 4 29052025.csv', date: '2025-05-29' },
      { path: 'downloads/Lawley May Week 4 30052025.csv', date: '2025-05-30' }
    ];
    
    // Process each file
    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const result = await this.loadFile(file.path, file.date);
      
      // Compare with previous if not the first file
      if (i > 0) {
        const previousDate = filesToProcess[i-1].date;
        const previousData = this.allData.get(previousDate);
        const currentData = this.allData.get(file.date);
        
        result.comparison = this.compareWithPrevious(
          file.date, 
          currentData, 
          previousDate, 
          previousData
        );
      }
      
      this.results.push(result);
      
      // Update tracking log
      await this.updateTrackingLog(result);
    }
    
    // Generate comprehensive report
    await this.generateDetailedReport(this.results);
    
    // Show summary
    this.showSummary();
  }

  async updateTrackingLog(result) {
    if (result.comparison) {
      // Add comparison to tracking log
      await this.tracker.addComparison({
        comparison_id: `CMP_${new Date().toISOString().split('T')[0]}_${Date.now()}`,
        comparison_date: new Date().toISOString(),
        period: result.comparison.period,
        files_compared: [
          `${result.comparison.period.from}.csv`,
          `${result.comparison.period.to}.csv`
        ],
        changes_detected: {
          net_records: result.comparison.newRecords.length - result.comparison.removedRecords.length,
          records_added: result.comparison.newRecords.length,
          records_removed: result.comparison.removedRecords.length,
          status_changes: result.comparison.statusChanges.length,
          pole_assignments: result.comparison.poleAssignments.length,
          agent_changes: result.comparison.agentChanges.length,
          completions: result.comparison.completions.length
        }
      });
    }
  }

  showSummary() {
    console.log('\n📊 PROCESSING COMPLETE - SUMMARY');
    console.log('================================\n');
    
    console.log('Files Processed:');
    this.results.forEach(r => {
      console.log(`  ${r.fileDate}: ${r.recordCount} records`);
    });
    
    console.log('\nKey Findings:');
    
    // Calculate totals
    let totalNewRecords = 0;
    let totalStatusChanges = 0;
    let totalPoleAssignments = 0;
    let totalCompletions = 0;
    
    this.results.forEach(r => {
      if (r.comparison) {
        totalNewRecords += r.comparison.newRecords.length;
        totalStatusChanges += r.comparison.statusChanges.length;
        totalPoleAssignments += r.comparison.poleAssignments.length;
        totalCompletions += r.comparison.completions.length;
      }
    });
    
    console.log(`  Total New Records: ${totalNewRecords}`);
    console.log(`  Total Status Changes: ${totalStatusChanges}`);
    console.log(`  Total Pole Assignments: ${totalPoleAssignments}`);
    console.log(`  Total Completions: ${totalCompletions}`);
    
    // Final status
    const lastResult = this.results[this.results.length - 1];
    console.log(`\nFinal Status (${lastResult.fileDate}):`);
    console.log(`  Total Properties: ${lastResult.recordCount}`);
    console.log(`  With Poles: ${lastResult.analysis.withPoleNumbers}`);
    console.log(`  Without Poles: ${lastResult.analysis.withoutPoleNumbers}`);
  }
}

// Run the processor
const processor = new MultiDayProcessor();
processor.processAllFiles().catch(console.error);