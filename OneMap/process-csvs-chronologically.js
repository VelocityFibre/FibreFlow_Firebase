#!/usr/bin/env node

/**
 * Process OneMap CSV files chronologically
 * Track changes day by day, building complete history
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

// CSV file mapping (date -> filename)
const CSV_FILES = {
  '2025-05-22': 'Lawley May Week 3 22052025 - First Report.csv',
  '2025-05-23': 'Lawley May Week 3 23052025.csv',
  '2025-05-26': 'Lawley May Week 4 26052025.csv',
  '2025-05-27': 'Lawley May Week 4 27052025.csv',
  '2025-05-29': 'Lawley May Week 4 29052025.csv',
  '2025-05-30': 'Lawley May Week 4 30052025.csv',
  '2025-06-02': 'Lawley June Week 1 02062025.csv',
  '2025-06-03': 'Lawley June Week 1 03062025.csv',
  '2025-06-05': 'Lawley June  Week 1 05062025.csv',
  '2025-06-10': 'Lawley June Week 2 10062025.csv',
  '2025-06-11': 'Lawley June Week 2 11062025.csv',
  '2025-06-12': 'Lawley June Week 2 12062025.csv',
  '2025-06-17': 'Lawley June Week 3 17062025.csv',
  '2025-06-18': 'Lawley June Week 3 18062025.csv',
  '2025-06-19': 'Lawley June Week 3 19062025.csv',
  '2025-06-24': 'Lawley June Week 4 24062025.csv',
  '2025-06-25': 'Lawley June Week 4 25062025.csv',
  '2025-06-26': 'Lawley June Week 4 26062025.csv',
  '2025-07-01': 'Lawley July Week 1 01072025.csv',
  '2025-07-02': 'Lawley July Week 1 02072025.csv',
  '2025-07-03': 'Lawley July Week 1 03072025.csv',
  '2025-07-07': 'Lawley July Week 2 07072025.csv',
  '2025-07-08': 'Lawley July Week 2 08072025.csv',
  '2025-07-11': 'Lawley July Week 2 11072025.csv',
  '2025-07-14': 'Lawley July Week 3 14072025.csv'
};

// Key milestones to track
const MILESTONES = [
  'Pole Permission: Approved',
  'Pole Permission: Planted',
  'Home Sign Ups: Approved & Installation Scheduled',
  'Home Sign Ups: Installed'
];

async function parseCSV(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return csv.parse(content.replace(/^\uFEFF/, ''), {
      columns: true,
      delimiter: ';'
    });
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

function compareData(previousMap, currentMap) {
  const changes = {
    new: [],
    changed: [],
    unchanged: [],
    missing: []
  };
  
  // Check current records
  currentMap.forEach((record, propertyId) => {
    if (!previousMap.has(propertyId)) {
      changes.new.push(record);
    } else {
      const prevRecord = previousMap.get(propertyId);
      if (prevRecord.Status !== record.Status ||
          prevRecord['Flow Name Groups'] !== record['Flow Name Groups']) {
        changes.changed.push({
          propertyId,
          previous: prevRecord,
          current: record,
          statusChange: prevRecord.Status !== record.Status ? 
            `${prevRecord.Status} → ${record.Status}` : null
        });
      } else {
        changes.unchanged.push(propertyId);
      }
    }
  });
  
  // Check for missing records
  previousMap.forEach((record, propertyId) => {
    if (!currentMap.has(propertyId)) {
      changes.missing.push(record);
    }
  });
  
  return changes;
}

function trackMilestones(records) {
  const milestoneCount = {};
  MILESTONES.forEach(m => milestoneCount[m] = 0);
  
  records.forEach(record => {
    const flowGroups = record['Flow Name Groups'] || '';
    MILESTONES.forEach(milestone => {
      if (flowGroups.includes(milestone)) {
        milestoneCount[milestone]++;
      }
    });
  });
  
  return milestoneCount;
}

async function processChronologically(startDate, endDate, outputDir) {
  console.log(`📅 Processing CSVs from ${startDate} to ${endDate}\n`);
  
  // Create output directories
  await fs.mkdir(path.join(outputDir, 'daily'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'cumulative'), { recursive: true });
  await fs.mkdir(path.join(outputDir, 'summary'), { recursive: true });
  
  // Get dates to process
  const dates = Object.keys(CSV_FILES).filter(date => 
    date >= startDate && date <= endDate
  ).sort();
  
  console.log(`Found ${dates.length} files to process\n`);
  
  let previousData = null;
  let cumulativeStats = [];
  
  for (const date of dates) {
    console.log(`\n📄 Processing ${date}: ${CSV_FILES[date]}`);
    
    // Determine path (some files are in subdirectory)
    const fileName = CSV_FILES[date];
    let filePath = path.join('downloads', fileName);
    
    // Check if file exists in main downloads
    try {
      await fs.access(filePath);
    } catch {
      // Try in Lawley Raw Stats subdirectory
      filePath = path.join('downloads', 'Lawley Raw Stats', fileName);
    }
    
    // Parse CSV
    const records = await parseCSV(filePath);
    if (records.length === 0) {
      console.log(`  ⚠️  No records found or error reading file`);
      continue;
    }
    
    console.log(`  📊 Records: ${records.length}`);
    
    // Create map for easy lookup
    const currentMap = new Map();
    records.forEach(record => {
      currentMap.set(record['Property ID'], record);
    });
    
    console.log(`  📊 Unique Property IDs: ${currentMap.size}`);
    
    // Track milestones
    const milestones = trackMilestones(records);
    
    // Compare with previous data
    let changes = null;
    if (previousData) {
      changes = compareData(previousData.map, currentMap);
      console.log(`  🆕 New: ${changes.new.length}`);
      console.log(`  📝 Changed: ${changes.changed.length}`);
      console.log(`  ❌ Missing: ${changes.missing.length}`);
    } else {
      console.log(`  ✅ Baseline established`);
    }
    
    // Save daily report
    const dailyReport = {
      date,
      fileName,
      totalRecords: records.length,
      uniquePropertyIds: currentMap.size,
      milestones,
      changes: changes || { new: records.length, changed: 0, missing: 0, unchanged: 0 },
      summary: {
        growth: previousData ? currentMap.size - previousData.map.size : currentMap.size,
        totalProperties: currentMap.size
      }
    };
    
    await fs.writeFile(
      path.join(outputDir, 'daily', `${date}.json`),
      JSON.stringify(dailyReport, null, 2)
    );
    
    // Update cumulative stats
    cumulativeStats.push({
      date,
      totalProperties: currentMap.size,
      milestones,
      growth: dailyReport.summary.growth
    });
    
    // Save cumulative data
    await fs.writeFile(
      path.join(outputDir, 'cumulative', `${date}_cumulative.json`),
      JSON.stringify(cumulativeStats, null, 2)
    );
    
    // Update previous data for next iteration
    previousData = {
      date,
      map: currentMap,
      records: records
    };
  }
  
  // Generate final summary
  const summary = {
    processedDates: dates,
    totalDays: dates.length,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    finalStats: cumulativeStats[cumulativeStats.length - 1],
    growthOverTime: cumulativeStats.map(s => ({
      date: s.date,
      total: s.totalProperties,
      growth: s.growth
    }))
  };
  
  await fs.writeFile(
    path.join(outputDir, 'summary', 'overall_summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  // Generate markdown report
  const markdownReport = `
# Chronological Processing Summary

## Overview
- **Period**: ${summary.startDate} to ${summary.endDate}
- **Days Processed**: ${summary.totalDays}
- **Final Property Count**: ${summary.finalStats.totalProperties}

## Growth Timeline
${summary.growthOverTime.map(g => 
  `- **${g.date}**: ${g.total} properties (${g.growth >= 0 ? '+' : ''}${g.growth})`
).join('\n')}

## Final Milestone Status
${Object.entries(summary.finalStats.milestones).map(([milestone, count]) =>
  `- **${milestone}**: ${count}`
).join('\n')}

Generated: ${new Date().toISOString()}
`;
  
  await fs.writeFile(
    path.join(outputDir, 'summary', 'chronological_summary.md'),
    markdownReport
  );
  
  console.log(`\n✅ Processing complete!`);
  console.log(`📁 Results saved to: ${outputDir}`);
  
  return summary;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Simple argument parsing
  let startDate = '2025-05-22';
  let endDate = '2025-07-14';
  let outputDir = 'reports/chronological';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      startDate = args[i + 1];
      i++;
    } else if (args[i] === '--end' && args[i + 1]) {
      endDate = args[i + 1];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    }
  }
  
  await processChronologically(startDate, endDate, outputDir);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processChronologically };