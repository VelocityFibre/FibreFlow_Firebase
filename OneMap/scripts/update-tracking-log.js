#!/usr/bin/env node

/**
 * Script to update the import tracking log with new import data
 */

const fs = require('fs').promises;
const path = require('path');

class ImportTracker {
  constructor() {
    this.logFile = 'imports/IMPORT_TRACKING_LOG.json';
  }

  async loadLog() {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading tracking log:', error);
      return null;
    }
  }

  async saveLog(log) {
    await fs.writeFile(this.logFile, JSON.stringify(log, null, 2));
    console.log('✅ Tracking log updated');
  }

  async addImport(importData) {
    const log = await this.loadLog();
    if (!log) return;

    // Add new import
    log.imports.push(importData);
    
    // Update running totals
    log.running_totals.total_imports++;
    log.running_totals.last_updated = new Date().toISOString();
    
    // Update other totals based on import data
    if (importData.metrics) {
      log.running_totals.total_unique_properties = Math.max(
        log.running_totals.total_unique_properties,
        importData.record_count
      );
    }

    await this.saveLog(log);
  }

  async addComparison(comparisonData) {
    const log = await this.loadLog();
    if (!log) return;

    // Add new comparison
    log.comparisons.push(comparisonData);
    
    // Update running totals
    log.running_totals.total_comparisons++;
    log.running_totals.last_updated = new Date().toISOString();

    await this.saveLog(log);
  }

  async generateSummaryReport() {
    const log = await this.loadLog();
    if (!log) return;

    console.log('\n📊 IMPORT TRACKING SUMMARY');
    console.log('=========================\n');
    
    console.log(`Project: ${log.project.name} (${log.project.id})`);
    console.log(`Tracking Since: ${log.project.tracking_started}\n`);
    
    console.log('Import History:');
    log.imports.forEach(imp => {
      console.log(`- ${imp.file_date}: ${imp.record_count} records (${imp.metrics.with_pole_numbers} with poles)`);
    });
    
    console.log('\nChange History:');
    log.comparisons.forEach(comp => {
      console.log(`- ${comp.period.from} to ${comp.period.to}: +${comp.changes_detected.records_added} new, ${comp.changes_detected.status_changes} changes`);
    });
    
    console.log('\nCurrent Status:');
    console.log(`- Total Properties: ${log.running_totals.total_unique_properties}`);
    console.log(`- Poles Assigned: ${log.running_totals.cumulative_poles_assigned}`);
    console.log(`- Completions: ${log.running_totals.cumulative_completions}`);
    console.log(`- Needing Poles: ${log.running_totals.outstanding_no_pole}`);
  }
}

// Example usage
async function example() {
  const tracker = new ImportTracker();
  
  // Generate summary
  await tracker.generateSummaryReport();
  
  // Example of adding a new import (commented out)
  /*
  await tracker.addImport({
    import_id: "IMP_2025-07-22_001",
    import_date: new Date().toISOString(),
    source_file: "Lawley May Week 4 27052025.csv",
    file_date: "2025-05-27",
    record_count: 760,
    metrics: {
      total_records: 760,
      with_pole_numbers: 550,
      without_pole_numbers: 210
    }
  });
  */
}

// Run if called directly
if (require.main === module) {
  example().catch(console.error);
}

module.exports = ImportTracker;