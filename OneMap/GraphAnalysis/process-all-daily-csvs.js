#!/usr/bin/env node

/**
 * Comprehensive Daily CSV Processor
 * 
 * Processes all daily CSV files, tracks changes, and generates organized reports
 * with clear naming conventions and linked documentation
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Ensure all necessary directories exist
async function ensureDirectories() {
  const dirs = [
    'data/relationships',
    'data/graphs',
    'data/changes',
    'data/indices',
    'reports/daily',
    'reports/summary',
    'reports/complete'
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(path.join(__dirname, dir), { recursive: true });
  }
}

// Extract date from filename with multiple pattern support
function extractDateFromFilename(filename) {
  const patterns = [
    // June patterns
    { regex: /june\s*(\d+)/i, transform: (m) => `2025-06-${m[1].padStart(2, '0')}` },
    // July patterns
    { regex: /july.*?(\d{2})072025/i, transform: (m) => `2025-07-${m[1]}` },
    // May patterns  
    { regex: /may.*?(\d{2})052025/i, transform: (m) => `2025-05-${m[1]}` },
    // Standard date patterns
    { regex: /(\d{4})-(\d{2})-(\d{2})/, transform: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    { regex: /(\d{2})(\d{2})(\d{4})/, transform: (m) => `${m[3]}-${m[2]}-${m[1]}` }
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern.regex);
    if (match) {
      return pattern.transform(match);
    }
  }
  
  return null;
}

// Process all CSV files
async function processAllDailyCSVs() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const sessionId = `daily_analysis_${timestamp}`;
  
  console.log('📊 OneMap Daily CSV Analysis System');
  console.log('═'.repeat(50));
  console.log(`Session ID: ${sessionId}`);
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  try {
    await ensureDirectories();
    
    // Step 1: Find all CSV files
    const downloadsDir = path.join(__dirname, '../downloads');
    const files = await fs.readdir(downloadsDir);
    const csvFiles = files
      .filter(f => f.endsWith('.csv'))
      .map(f => ({
        filename: f,
        path: path.join(downloadsDir, f),
        date: extractDateFromFilename(f),
        size: 0
      }))
      .filter(f => f.date); // Only files with extractable dates
    
    // Get file sizes
    for (const file of csvFiles) {
      const stats = await fs.stat(file.path);
      file.size = stats.size;
    }
    
    // Sort by date
    csvFiles.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`📁 Found ${csvFiles.length} CSV files with dates:\n`);
    csvFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.date} - ${f.filename} (${(f.size / 1024 / 1024).toFixed(1)}MB)`);
    });
    console.log('');
    
    // Step 2: Process each file for relationships
    console.log('🔄 Processing Files for Graph Analysis...\n');
    
    const processedFiles = [];
    
    for (const [index, csvFile] of csvFiles.entries()) {
      console.log(`Processing ${index + 1}/${csvFiles.length}: ${csvFile.filename}`);
      
      try {
        // Extract relationships
        const { stdout: extractOutput } = await execAsync(
          `node processors/extract-relationships.js "${csvFile.path}"`
        );
        
        // Parse output to get session info
        const sessionMatch = extractOutput.match(/Session ID: ([\w-]+)/);
        const nodesMatch = extractOutput.match(/Nodes extracted: (\d+)/);
        const edgesMatch = extractOutput.match(/Edges extracted: (\d+)/);
        
        processedFiles.push({
          ...csvFile,
          processSessionId: sessionMatch ? sessionMatch[1] : null,
          nodes: nodesMatch ? parseInt(nodesMatch[1]) : 0,
          edges: edgesMatch ? parseInt(edgesMatch[1]) : 0,
          success: true
        });
        
        console.log(`  ✅ Nodes: ${nodesMatch ? nodesMatch[1] : 0}, Edges: ${edgesMatch ? edgesMatch[1] : 0}`);
      } catch (error) {
        console.log(`  ❌ Failed: ${error.message}`);
        processedFiles.push({
          ...csvFile,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 3: Build cumulative graph
    console.log('\n📈 Building Cumulative Graph...');
    
    try {
      await execAsync('node processors/build-graph.js fresh');
      console.log('  ✅ Graph built successfully');
    } catch (error) {
      console.log('  ❌ Graph build failed:', error.message);
    }
    
    // Step 4: Track daily changes
    console.log('\n📊 Tracking Daily Changes...\n');
    
    const changeReports = [];
    
    for (let i = 1; i < processedFiles.length; i++) {
      const day1 = processedFiles[i - 1];
      const day2 = processedFiles[i];
      
      if (!day1.success || !day2.success) continue;
      
      console.log(`Comparing ${day1.date} → ${day2.date}`);
      
      try {
        const { stdout } = await execAsync(
          `node processors/track-daily-changes.js "${day1.path}" "${day2.path}"`
        );
        
        // Extract change summary from output
        const newMatch = stdout.match(/New entities: (\d+)/);
        const modifiedMatch = stdout.match(/Modified entities: (\d+)/);
        const removedMatch = stdout.match(/Removed entities: (\d+)/);
        
        const changeReport = {
          from: day1.date,
          to: day2.date,
          new: newMatch ? parseInt(newMatch[1]) : 0,
          modified: modifiedMatch ? parseInt(modifiedMatch[1]) : 0,
          removed: removedMatch ? parseInt(removedMatch[1]) : 0
        };
        
        changeReports.push(changeReport);
        
        console.log(`  ✅ New: ${changeReport.new}, Modified: ${changeReport.modified}, Removed: ${changeReport.removed}`);
      } catch (error) {
        console.log(`  ❌ Comparison failed: ${error.message}`);
      }
    }
    
    // Step 5: Find duplicates
    console.log('\n🔍 Running Duplicate Analysis...');
    
    let duplicateReport = null;
    try {
      const { stdout } = await execAsync('node analyzers/find-duplicates.js');
      
      // Extract duplicate counts
      const poleMatch = stdout.match(/POLE duplicates: (\d+)/);
      const dropMatch = stdout.match(/DROP duplicates: (\d+)/);
      const addressMatch = stdout.match(/ADDRESS duplicates: (\d+)/);
      const propertyMatch = stdout.match(/PROPERTY duplicates: (\d+)/);
      
      duplicateReport = {
        poles: poleMatch ? parseInt(poleMatch[1]) : 0,
        drops: dropMatch ? parseInt(dropMatch[1]) : 0,
        addresses: addressMatch ? parseInt(addressMatch[1]) : 0,
        properties: propertyMatch ? parseInt(propertyMatch[1]) : 0
      };
      
      console.log(`  ✅ Found duplicates - Poles: ${duplicateReport.poles}, Drops: ${duplicateReport.drops}`);
    } catch (error) {
      console.log(`  ❌ Duplicate analysis failed: ${error.message}`);
    }
    
    // Step 6: Generate comprehensive report
    console.log('\n📝 Generating Comprehensive Report...\n');
    
    const report = await generateComprehensiveReport({
      sessionId,
      timestamp,
      csvFiles: processedFiles,
      changeReports,
      duplicateReport
    });
    
    console.log('✅ Analysis Complete!\n');
    console.log('📁 Generated Reports:');
    console.log(`  - Master Report: ${report.masterReportPath}`);
    console.log(`  - Data Summary: ${report.dataSummaryPath}`);
    console.log(`  - Change Analysis: ${report.changeAnalysisPath}`);
    console.log(`  - Report Index: ${report.indexPath}`);
    
    // Step 7: Create index file
    await createReportIndex(sessionId, report);
    
    console.log('\n🎯 Next Steps:');
    console.log('  1. Review the master report for overall insights');
    console.log('  2. Check change analysis for daily progressions');
    console.log('  3. Use duplicate reports to clean data');
    console.log('  4. All reports are linked in the index file');
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

// Generate comprehensive report
async function generateComprehensiveReport(data) {
  const { sessionId, timestamp, csvFiles, changeReports, duplicateReport } = data;
  const reportsDir = path.join(__dirname, 'reports', 'complete', sessionId);
  
  await fs.mkdir(reportsDir, { recursive: true });
  
  // 1. Master Report
  const masterReportPath = path.join(reportsDir, `${sessionId}_MASTER_REPORT.md`);
  let masterMd = `# OneMap Daily CSV Analysis - Master Report\n\n`;
  masterMd += `**Session ID**: ${sessionId}\n`;
  masterMd += `**Generated**: ${new Date().toISOString()}\n`;
  masterMd += `**Total Files Analyzed**: ${csvFiles.length}\n\n`;
  
  masterMd += `## Executive Summary\n\n`;
  masterMd += `This report analyzes ${csvFiles.length} daily CSV files from OneMap, tracking changes in pole installation data over time.\n\n`;
  
  masterMd += `### Key Findings\n\n`;
  
  // Calculate totals
  const totalNew = changeReports.reduce((sum, r) => sum + r.new, 0);
  const totalModified = changeReports.reduce((sum, r) => sum + r.modified, 0);
  const totalRemoved = changeReports.reduce((sum, r) => sum + r.removed, 0);
  
  masterMd += `- **Total New Entities Added**: ${totalNew.toLocaleString()}\n`;
  masterMd += `- **Total Modifications**: ${totalModified.toLocaleString()}\n`;
  masterMd += `- **Total Entities Removed**: ${totalRemoved.toLocaleString()}\n\n`;
  
  if (duplicateReport) {
    masterMd += `### Duplicate Issues Found\n\n`;
    masterMd += `- **Duplicate Poles**: ${duplicateReport.poles} groups\n`;
    masterMd += `- **Duplicate Drops**: ${duplicateReport.drops} groups\n`;
    masterMd += `- **Duplicate Addresses**: ${duplicateReport.addresses} groups\n`;
    masterMd += `- **Duplicate Properties**: ${duplicateReport.properties} groups\n\n`;
  }
  
  masterMd += `## Files Processed\n\n`;
  masterMd += `| Date | Filename | Size (MB) | Entities | Status |\n`;
  masterMd += `|------|----------|-----------|----------|--------|\n`;
  
  csvFiles.forEach(file => {
    masterMd += `| ${file.date} | ${file.filename} | ${(file.size / 1024 / 1024).toFixed(1)} | ${file.nodes || 'N/A'} | ${file.success ? '✅' : '❌'} |\n`;
  });
  
  masterMd += `\n## Daily Change Summary\n\n`;
  masterMd += `| Period | New | Modified | Removed | Net Change |\n`;
  masterMd += `|--------|-----|----------|---------|------------|\n`;
  
  changeReports.forEach(report => {
    const netChange = report.new - report.removed;
    masterMd += `| ${report.from} → ${report.to} | ${report.new} | ${report.modified} | ${report.removed} | ${netChange > 0 ? '+' : ''}${netChange} |\n`;
  });
  
  masterMd += `\n## Related Reports\n\n`;
  masterMd += `- [Data Summary](${sessionId}_DATA_SUMMARY.json) - Detailed data in JSON format\n`;
  masterMd += `- [Change Analysis](${sessionId}_CHANGE_ANALYSIS.md) - Detailed change tracking\n`;
  masterMd += `- [Report Index](../../../REPORT_INDEX.md) - All reports index\n`;
  
  await fs.writeFile(masterReportPath, masterMd);
  
  // 2. Data Summary (JSON)
  const dataSummaryPath = path.join(reportsDir, `${sessionId}_DATA_SUMMARY.json`);
  const dataSummary = {
    sessionId,
    timestamp: new Date().toISOString(),
    filesAnalyzed: csvFiles.length,
    dateRange: {
      start: csvFiles[0]?.date,
      end: csvFiles[csvFiles.length - 1]?.date
    },
    files: csvFiles,
    changeReports,
    duplicateReport,
    totals: {
      newEntities: totalNew,
      modifications: totalModified,
      removals: totalRemoved,
      netChange: totalNew - totalRemoved
    }
  };
  
  await fs.writeFile(dataSummaryPath, JSON.stringify(dataSummary, null, 2));
  
  // 3. Change Analysis Report
  const changeAnalysisPath = path.join(reportsDir, `${sessionId}_CHANGE_ANALYSIS.md`);
  let changeMd = `# Change Analysis Report\n\n`;
  changeMd += `**Session**: ${sessionId}\n\n`;
  
  changeMd += `## Change Patterns\n\n`;
  
  // Identify trends
  const growthDays = changeReports.filter(r => r.new > r.removed).length;
  const shrinkDays = changeReports.filter(r => r.removed > r.new).length;
  
  changeMd += `- **Growth Days**: ${growthDays} (more entities added than removed)\n`;
  changeMd += `- **Shrink Days**: ${shrinkDays} (more entities removed than added)\n`;
  changeMd += `- **Average Daily New**: ${(totalNew / changeReports.length).toFixed(0)}\n`;
  changeMd += `- **Average Daily Modified**: ${(totalModified / changeReports.length).toFixed(0)}\n\n`;
  
  changeMd += `## Detailed Daily Changes\n\n`;
  
  changeReports.forEach((report, index) => {
    changeMd += `### Day ${index + 1}: ${report.from} → ${report.to}\n\n`;
    changeMd += `- **New Entities**: ${report.new}\n`;
    changeMd += `- **Modified**: ${report.modified}\n`;
    changeMd += `- **Removed**: ${report.removed}\n`;
    changeMd += `- **Net Change**: ${report.new - report.removed > 0 ? '+' : ''}${report.new - report.removed}\n\n`;
  });
  
  await fs.writeFile(changeAnalysisPath, changeMd);
  
  return {
    masterReportPath,
    dataSummaryPath,
    changeAnalysisPath,
    indexPath: path.join(__dirname, 'reports', 'REPORT_INDEX.md')
  };
}

// Create report index
async function createReportIndex(sessionId, report) {
  const indexPath = path.join(__dirname, 'reports', 'REPORT_INDEX.md');
  
  let indexMd = `# OneMap Graph Analysis - Report Index\n\n`;
  indexMd += `This index contains all generated reports from daily CSV analysis.\n\n`;
  
  // Add new session
  const sessionEntry = `## ${new Date().toISOString().split('T')[0]} - Session: ${sessionId}\n\n`;
  const sessionContent = `- **[Master Report](complete/${sessionId}/${sessionId}_MASTER_REPORT.md)** - Executive summary and key findings\n`;
  const dataContent = `- **[Data Summary](complete/${sessionId}/${sessionId}_DATA_SUMMARY.json)** - Complete data in JSON format\n`;
  const changeContent = `- **[Change Analysis](complete/${sessionId}/${sessionId}_CHANGE_ANALYSIS.md)** - Detailed change tracking\n\n`;
  
  try {
    // Read existing index
    const existingIndex = await fs.readFile(indexPath, 'utf8').catch(() => '');
    
    // Prepend new session
    const newIndex = indexMd + sessionEntry + sessionContent + dataContent + changeContent + '---\n\n' + 
                     existingIndex.replace(/^# OneMap Graph Analysis - Report Index\n\n.*?\n\n/, '');
    
    await fs.writeFile(indexPath, newIndex);
  } catch (error) {
    // Create new index
    await fs.writeFile(indexPath, indexMd + sessionEntry + sessionContent + dataContent + changeContent);
  }
}

// Main execution
if (require.main === module) {
  processAllDailyCSVs();
}

module.exports = { processAllDailyCSVs };