#!/usr/bin/env node

/**
 * Multi-Day Change Tracker
 * 
 * Processes multiple daily CSV files and tracks changes across all days
 * Perfect for understanding data evolution over time
 */

const fs = require('fs').promises;
const path = require('path');
const { buildEntityMap, compareEntityMaps, generateChangeReport } = require('../processors/track-daily-changes');

async function trackMultiDayChanges(csvDirectory) {
  console.log('🗓️ Multi-Day Change Analysis\n');
  
  try {
    // Get all CSV files and sort by date
    const files = await fs.readdir(csvDirectory);
    const csvFiles = files
      .filter(f => f.endsWith('.csv'))
      .map(f => ({
        path: path.join(csvDirectory, f),
        name: f,
        // Extract date from filename (adjust pattern as needed)
        date: extractDate(f)
      }))
      .filter(f => f.date)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (csvFiles.length < 2) {
      console.log('Need at least 2 CSV files to compare changes');
      return;
    }
    
    console.log(`Found ${csvFiles.length} CSV files to analyze:\n`);
    csvFiles.forEach(f => console.log(`  - ${f.name} (${f.date})`));
    console.log('');
    
    // Build entity maps for all days
    const dailyMaps = new Map();
    
    for (const csvFile of csvFiles) {
      console.log(`Processing ${csvFile.name}...`);
      const entityMap = await buildEntityMap(csvFile.path, csvFile.date);
      dailyMaps.set(csvFile.date, {
        map: entityMap,
        file: csvFile
      });
      console.log(`  ✅ ${entityMap.size} unique entities\n`);
    }
    
    // Compare consecutive days
    const changeHistory = [];
    
    for (let i = 1; i < csvFiles.length; i++) {
      const day1 = csvFiles[i-1];
      const day2 = csvFiles[i];
      
      console.log(`\nComparing ${day1.date} → ${day2.date}`);
      
      const changes = compareEntityMaps(
        dailyMaps.get(day1.date).map,
        dailyMaps.get(day2.date).map,
        day1.date,
        day2.date
      );
      
      changeHistory.push({
        from: day1.date,
        to: day2.date,
        changes
      });
      
      // Generate individual report
      await generateChangeReport(changes, day1.date, day2.date);
      
      // Show summary
      console.log(`  New: ${changes.new.length}`);
      console.log(`  Modified: ${changes.modified.length}`);
      console.log(`  Removed: ${changes.removed.length}`);
      console.log(`  Unchanged: ${changes.unchanged.length}`);
    }
    
    // Generate overall summary
    await generateOverallSummary(changeHistory, csvFiles);
    
    console.log('\n✅ Multi-day analysis complete!');
    console.log('📁 Check reports/ directory for detailed reports');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Extract date from filename
function extractDate(filename) {
  // Try different date patterns
  const patterns = [
    /(\d{8})/,                    // 20250723
    /(\d{2})(\d{2})(\d{4})/,      // 23072025
    /(\d{4}-\d{2}-\d{2})/,        // 2025-07-23
    /june(\d+)/i,                 // june3, june5
    /july.*?(\d{1,2})/i,          // July Week 3 16
  ];
  
  // Special cases
  if (filename.toLowerCase().includes('june')) {
    const match = filename.match(/june\s*(\d+)/i);
    if (match) return `2025-06-${match[1].padStart(2, '0')}`;
  }
  
  if (filename.toLowerCase().includes('july')) {
    const match = filename.match(/(\d{2})072025/);
    if (match) return `2025-07-${match[1]}`;
  }
  
  if (filename.toLowerCase().includes('may')) {
    const match = filename.match(/(\d{2})052025/);
    if (match) return `2025-05-${match[1]}`;
  }
  
  // Try to extract any date pattern
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

// Generate overall summary across all days
async function generateOverallSummary(changeHistory, csvFiles) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const summaryPath = path.join(__dirname, '../reports', `multi_day_summary_${timestamp}.md`);
  
  let md = `# Multi-Day Change Analysis Summary\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `## Files Analyzed\n\n`;
  
  csvFiles.forEach((f, i) => {
    md += `${i + 1}. **${f.date}**: ${f.name}\n`;
  });
  
  md += `\n## Change Progression\n\n`;
  
  // Calculate cumulative stats
  let totalNew = 0;
  let totalModified = 0;
  let totalRemoved = 0;
  
  changeHistory.forEach(period => {
    totalNew += period.changes.new.length;
    totalModified += period.changes.modified.length;
    totalRemoved += period.changes.removed.length;
    
    md += `### ${period.from} → ${period.to}\n`;
    md += `- New: ${period.changes.new.length}\n`;
    md += `- Modified: ${period.changes.modified.length}\n`;
    md += `- Removed: ${period.changes.removed.length}\n\n`;
  });
  
  md += `## Overall Statistics\n\n`;
  md += `- **Total New Entities**: ${totalNew}\n`;
  md += `- **Total Modifications**: ${totalModified}\n`;
  md += `- **Total Removals**: ${totalRemoved}\n\n`;
  
  // Track entity lifecycle
  md += `## Entity Lifecycle Patterns\n\n`;
  
  // Find entities that appear and disappear
  const allEntities = new Set();
  const firstSeen = new Map();
  const lastSeen = new Map();
  
  csvFiles.forEach((file, index) => {
    const dayData = changeHistory[index - 1];
    if (dayData) {
      dayData.changes.new.forEach(item => {
        allEntities.add(item.entity.id);
        if (!firstSeen.has(item.entity.id)) {
          firstSeen.set(item.entity.id, file.date);
        }
        lastSeen.set(item.entity.id, file.date);
      });
    }
  });
  
  md += `- **Total Unique Entities**: ${allEntities.size}\n`;
  md += `- **Entities Added Then Removed**: ${
    Array.from(allEntities).filter(id => 
      lastSeen.get(id) !== csvFiles[csvFiles.length - 1].date
    ).length
  }\n\n`;
  
  await fs.writeFile(summaryPath, md);
}

// Main execution
async function main() {
  const csvDirectory = process.argv[2] || path.join(__dirname, '../../downloads');
  
  console.log(`📁 Analyzing CSVs in: ${csvDirectory}\n`);
  
  await trackMultiDayChanges(csvDirectory);
}

if (require.main === module) {
  main();
}

module.exports = { trackMultiDayChanges };