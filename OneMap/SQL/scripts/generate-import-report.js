#!/usr/bin/env node

const Database = require('./src/database');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

async function generateImportReport() {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('Generating Import Report...'));
  
  // Get basic statistics
  const stats = await db.getStats();
  
  // Get status distribution
  const statusDist = await db.all(`
    SELECT status, COUNT(*) as count
    FROM status_changes
    GROUP BY status
    ORDER BY count DESC
  `);
  
  // Get pole capacity analysis
  const poleCapacity = await db.all(`
    SELECT 
      COUNT(DISTINCT pole_number) as total_poles,
      AVG(drop_count) as avg_drops_per_pole,
      MAX(drop_count) as max_drops,
      COUNT(CASE WHEN drop_count > 10 THEN 1 END) as poles_near_capacity
    FROM (
      SELECT pole_number, COUNT(DISTINCT drop_number) as drop_count
      FROM status_changes
      WHERE pole_number IS NOT NULL AND pole_number != ''
      GROUP BY pole_number
    )
  `);
  
  // Get data coverage
  const coverage = await db.get(`
    SELECT 
      COUNT(DISTINCT property_id) as properties,
      COUNT(CASE WHEN pole_number IS NULL OR pole_number = '' THEN 1 END) as records_without_poles,
      COUNT(CASE WHEN drop_number IS NULL OR drop_number = '' THEN 1 END) as records_without_drops,
      COUNT(CASE WHEN status IS NULL OR status = '' THEN 1 END) as records_without_status
    FROM status_changes
  `);
  
  // Generate report
  const report = `# Import Analysis Report
Generated: ${new Date().toISOString()}

## Summary Statistics
- Total Records: ${stats.totalRecords.count}
- Unique Poles: ${stats.uniquePoles.count}
- Unique Drops: ${stats.uniqueDrops.count}
- Unique Properties: ${coverage.properties}

## Data Quality
- Records without Pole Numbers: ${coverage.records_without_poles} (${((coverage.records_without_poles/stats.totalRecords.count)*100).toFixed(1)}%)
- Records without Drop Numbers: ${coverage.records_without_drops} (${((coverage.records_without_drops/stats.totalRecords.count)*100).toFixed(1)}%)
- Records without Status: ${coverage.records_without_status} (${((coverage.records_without_status/stats.totalRecords.count)*100).toFixed(1)}%)

## Pole Capacity Analysis
- Average Drops per Pole: ${parseFloat(poleCapacity[0].avg_drops_per_pole).toFixed(2)}
- Maximum Drops on a Pole: ${poleCapacity[0].max_drops}
- Poles Near Capacity (>10 drops): ${poleCapacity[0].poles_near_capacity}

## Status Distribution
${statusDist.map(s => `- ${s.status || '(Blank)'}: ${s.count} records (${((s.count/stats.totalRecords.count)*100).toFixed(1)}%)`).join('\n')}

## Recommendations
1. Map date fields properly for time-based analysis
2. Map agent fields to track performance
3. Investigate records with blank status
4. Review poles with >10 drops for capacity issues
`;

  // Save report
  const reportPath = path.join(__dirname, '../reports/import_analysis_' + new Date().toISOString().split('T')[0] + '.md');
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, report);
  
  console.log(chalk.green('\n✓ Report generated:'));
  console.log(reportPath);
  console.log('\n' + report);
  
  await db.close();
}

generateImportReport().catch(console.error);