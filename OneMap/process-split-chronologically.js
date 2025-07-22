#!/usr/bin/env node

/**
 * Process all split CSV files chronologically
 * Track permission-to-pole conversions over time
 */

const fs = require('fs').promises;
const path = require('path');
const { processDateComparison } = require('./compare-split-csvs.js');

// Add the export to compare-split-csvs.js
async function addExportToCompareScript() {
  const scriptPath = './compare-split-csvs.js';
  const content = await fs.readFile(scriptPath, 'utf-8');
  if (!content.includes('module.exports')) {
    const exportLine = '\nmodule.exports = { processDateComparison };\n';
    await fs.appendFile(scriptPath, exportLine);
  }
}

async function getAllDates(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const dates = entries
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(e.name))
    .map(e => e.name)
    .sort();
  return dates;
}

async function processAllDates(baseDir = 'split_data') {
  // Ensure export is available
  await addExportToCompareScript();
  
  console.log('📊 Processing Split CSVs Chronologically\n');
  
  const dates = await getAllDates(baseDir);
  console.log(`Found ${dates.length} dates to process\n`);
  
  const timeline = {
    dates: [],
    summary: {
      totalDays: dates.length,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      permissionGrowth: [],
      poleGrowth: [],
      conversionRate: []
    }
  };
  
  // Process first date as baseline
  console.log(`📍 Baseline: ${dates[0]}`);
  const baselineStats = await getDateStats(path.join(baseDir, dates[0]));
  timeline.dates.push({
    date: dates[0],
    stats: baselineStats,
    changes: null
  });
  
  // Process subsequent dates
  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currDate = dates[i];
    
    const comparison = await processDateComparison(prevDate, currDate, baseDir);
    const currStats = await getDateStats(path.join(baseDir, currDate));
    
    timeline.dates.push({
      date: currDate,
      stats: currStats,
      changes: comparison
    });
    
    // Track growth
    timeline.summary.permissionGrowth.push({
      date: currDate,
      count: currStats.permissions,
      growth: comparison.permissions ? 
        comparison.permissions.currCount - comparison.permissions.prevCount : 0
    });
    
    timeline.summary.poleGrowth.push({
      date: currDate,
      count: currStats.poles,
      growth: comparison.poles ? 
        comparison.poles.currCount - comparison.poles.prevCount : 0
    });
    
    if (comparison.conversions) {
      timeline.summary.conversionRate.push({
        date: currDate,
        conversions: comparison.conversions.length
      });
    }
  }
  
  // Generate reports
  await generateReports(timeline);
  
  return timeline;
}

async function getDateStats(dateDir) {
  const files = await fs.readdir(dateDir);
  const stats = {
    permissions: 0,
    poles: 0,
    total: 0
  };
  
  const permFile = files.find(f => f.includes('permission_records.csv'));
  const poleFile = files.find(f => f.includes('pole_records.csv'));
  
  if (permFile) {
    const content = await fs.readFile(path.join(dateDir, permFile), 'utf-8');
    stats.permissions = content.split('\n').length - 1; // Subtract header
  }
  
  if (poleFile) {
    const content = await fs.readFile(path.join(dateDir, poleFile), 'utf-8');
    stats.poles = content.split('\n').length - 1; // Subtract header
  }
  
  stats.total = stats.permissions + stats.poles;
  
  return stats;
}

async function generateReports(timeline) {
  const reportDir = path.join('reports', 'chronological_split');
  await fs.mkdir(reportDir, { recursive: true });
  
  // Save raw timeline data
  await fs.writeFile(
    path.join(reportDir, 'timeline.json'),
    JSON.stringify(timeline, null, 2)
  );
  
  // Generate markdown summary
  const markdownReport = `
# Split CSV Chronological Analysis

## Period: ${timeline.summary.startDate} to ${timeline.summary.endDate}

## Overview
- Total days analyzed: ${timeline.summary.totalDays}
- Starting permissions: ${timeline.dates[0].stats.permissions}
- Starting poles: ${timeline.dates[0].stats.poles}
- Final permissions: ${timeline.dates[timeline.dates.length - 1].stats.permissions}
- Final poles: ${timeline.dates[timeline.dates.length - 1].stats.poles}

## Daily Growth Summary

### Permission Records (No Poles Yet)
${timeline.summary.permissionGrowth.map(g => 
  `- ${g.date}: ${g.count} total (${g.growth >= 0 ? '+' : ''}${g.growth})`
).join('\n')}

### Pole Records
${timeline.summary.poleGrowth.map(g => 
  `- ${g.date}: ${g.count} total (${g.growth >= 0 ? '+' : ''}${g.growth})`
).join('\n')}

### Permission-to-Pole Conversions
${timeline.summary.conversionRate.map(c => 
  `- ${c.date}: ${c.conversions} conversions`
).join('\n')}

## Key Insights

1. **Total Growth**
   - Permissions: ${timeline.dates[timeline.dates.length - 1].stats.permissions - timeline.dates[0].stats.permissions}
   - Poles: ${timeline.dates[timeline.dates.length - 1].stats.poles - timeline.dates[0].stats.poles}

2. **Conversion Tracking**
   - Total conversions tracked: ${timeline.summary.conversionRate.reduce((sum, c) => sum + c.conversions, 0)}
   - Note: Conversions show addresses that appear in both files

3. **Data Quality**
   - Some addresses have multiple properties/poles
   - GPS coordinates help disambiguate locations
   - Address standardization needed for better matching

Generated: ${new Date().toISOString()}
`;
  
  await fs.writeFile(
    path.join(reportDir, 'chronological_summary.md'),
    markdownReport
  );
  
  console.log(`\n✅ Reports saved to: ${reportDir}`);
}

async function main() {
  const baseDir = process.argv[2] || 'split_data';
  await processAllDates(baseDir);
}

if (require.main === module) {
  main().catch(console.error);
}