#!/usr/bin/env node

const Database = require('./src/database');
const chalk = require('chalk');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

async function detectAnomalies(options = {}) {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== ANOMALY DETECTION & REPORTING ===\n'));
  
  // Run anomaly detection
  console.log(chalk.yellow('1. Detecting new anomalies...'));
  
  // Insert newly detected anomalies
  await db.run(`
    INSERT INTO status_anomalies (
      property_id, pole_number, drop_number,
      anomaly_type, old_status, new_status,
      status_change_date, import_file, import_batch_id,
      agent, address, severity
    )
    SELECT 
      property_id, pole_number, drop_number,
      anomaly_type, old_status, new_status,
      status_change_date, import_batch_id, import_batch_id,
      agent, address, severity
    FROM anomaly_detection_view
  `);
  
  const newAnomalies = await db.get('SELECT changes() as count');
  console.log(`   Found ${newAnomalies.count} new anomalies`);
  
  // Get anomaly summary
  console.log(chalk.yellow('\n2. Anomaly Summary:'));
  
  const summary = await db.all(`
    SELECT 
      anomaly_type,
      severity,
      COUNT(*) as total_count,
      COUNT(CASE WHEN resolved = 0 THEN 1 END) as unresolved,
      COUNT(CASE WHEN DATE(detected_date) = DATE('now') THEN 1 END) as today
    FROM status_anomalies
    GROUP BY anomaly_type, severity
    ORDER BY 
      CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      total_count DESC
  `);
  
  console.log(chalk.gray('─'.repeat(80)));
  console.log(chalk.white.bold('Type                          Severity    Total  Unresolved  Today'));
  console.log(chalk.gray('─'.repeat(80)));
  
  summary.forEach(row => {
    const severityColor = {
      'critical': chalk.red,
      'high': chalk.yellow,
      'medium': chalk.cyan,
      'low': chalk.gray
    }[row.severity];
    
    console.log(
      `${row.anomaly_type.padEnd(30)}` +
      `${severityColor(row.severity.padEnd(10))}` +
      `${row.total_count.toString().padStart(7)}` +
      `${row.unresolved.toString().padStart(12)}` +
      `${row.today.toString().padStart(7)}`
    );
  });
  
  // Show critical anomalies
  console.log(chalk.red('\n3. Critical Anomalies (Unresolved):'));
  
  const criticalAnomalies = await db.all(`
    SELECT * FROM status_anomalies
    WHERE severity = 'critical' AND resolved = 0
    ORDER BY detected_date DESC
    LIMIT 10
  `);
  
  if (criticalAnomalies.length > 0) {
    criticalAnomalies.forEach((anomaly, i) => {
      console.log(chalk.red(`\n${i + 1}. Property: ${anomaly.property_id}`));
      console.log(`   Type: ${anomaly.anomaly_type}`);
      console.log(`   Change: ${anomaly.old_status || 'NO PRIOR STATUS'} → ${anomaly.new_status}`);
      console.log(`   Date: ${anomaly.status_change_date}`);
      console.log(`   Agent: ${anomaly.agent || 'Unknown'}`);
      console.log(`   Address: ${anomaly.address || 'N/A'}`);
    });
  } else {
    console.log(chalk.green('   No critical anomalies found!'));
  }
  
  // Patterns analysis
  console.log(chalk.yellow('\n4. Anomaly Patterns:'));
  
  const patterns = await db.all(`
    SELECT 
      anomaly_type,
      COUNT(DISTINCT property_id) as affected_properties,
      COUNT(DISTINCT agent) as agents_involved,
      COUNT(DISTINCT DATE(status_change_date)) as days_with_anomalies,
      MIN(status_change_date) as first_occurrence,
      MAX(status_change_date) as last_occurrence
    FROM status_anomalies
    WHERE resolved = 0
    GROUP BY anomaly_type
  `);
  
  patterns.forEach(pattern => {
    console.log(`\n   ${chalk.cyan(pattern.anomaly_type)}:`);
    console.log(`     Affected properties: ${pattern.affected_properties}`);
    console.log(`     Agents involved: ${pattern.agents_involved}`);
    console.log(`     Days with anomalies: ${pattern.days_with_anomalies}`);
    console.log(`     First seen: ${pattern.first_occurrence}`);
    console.log(`     Last seen: ${pattern.last_occurrence}`);
  });
  
  // Geographic clustering
  console.log(chalk.yellow('\n5. Geographic Clustering:'));
  
  const clusters = await db.all(`
    SELECT 
      SUBSTR(address, INSTR(address, 'STREET') - 20, 30) as street_area,
      COUNT(DISTINCT property_id) as anomaly_count,
      GROUP_CONCAT(DISTINCT anomaly_type) as types
    FROM status_anomalies
    WHERE address IS NOT NULL AND resolved = 0
    GROUP BY street_area
    HAVING anomaly_count > 2
    ORDER BY anomaly_count DESC
    LIMIT 10
  `);
  
  if (clusters.length > 0) {
    clusters.forEach(cluster => {
      console.log(`   ${cluster.street_area}: ${cluster.anomaly_count} anomalies`);
      console.log(`     Types: ${cluster.types}`);
    });
  } else {
    console.log('   No significant geographic clusters found');
  }
  
  // Export detailed report
  if (options.export) {
    console.log(chalk.yellow('\n6. Exporting detailed report...'));
    
    // Get all unresolved anomalies
    const allAnomalies = await db.all(`
      SELECT 
        sa.*,
        ar.description as rule_description
      FROM status_anomalies sa
      LEFT JOIN anomaly_rules ar ON ar.rule_name = (
        SELECT rule_name FROM anomaly_rules 
        WHERE (from_status = sa.old_status AND to_status = sa.new_status)
           OR (from_status = '' AND sa.old_status IS NULL AND to_status = sa.new_status)
        LIMIT 1
      )
      WHERE sa.resolved = 0
      ORDER BY sa.severity DESC, sa.detected_date DESC
    `);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Detailed anomalies sheet
    const ws1 = XLSX.utils.json_to_sheet(allAnomalies);
    XLSX.utils.book_append_sheet(wb, ws1, 'Anomalies');
    
    // Summary sheet
    const summaryData = [
      ['Anomaly Detection Report'],
      ['Generated:', new Date().toISOString()],
      [''],
      ['Summary Statistics'],
      ['Total Anomalies:', allAnomalies.length],
      ['Critical:', allAnomalies.filter(a => a.severity === 'critical').length],
      ['High:', allAnomalies.filter(a => a.severity === 'high').length],
      ['Medium:', allAnomalies.filter(a => a.severity === 'medium').length],
      ['Low:', allAnomalies.filter(a => a.severity === 'low').length]
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    
    const filename = `Anomaly_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filepath = path.join(__dirname, '../reports/', filename);
    
    XLSX.writeFile(wb, filepath);
    console.log(chalk.green(`   ✓ Report exported to: ${filepath}`));
  }
  
  // Recommendations
  console.log(chalk.green('\n=== RECOMMENDATIONS ===\n'));
  
  if (criticalAnomalies.length > 0) {
    console.log(chalk.red('⚠️  CRITICAL: Address declined-to-installation cases immediately'));
    console.log('   These bypass the approval process entirely.\n');
  }
  
  const highCount = summary.find(s => s.severity === 'high' && s.unresolved > 0);
  if (highCount) {
    console.log(chalk.yellow('⚠️  HIGH: Review status reverts'));
    console.log('   Installations reverting to "in progress" may indicate data issues.\n');
  }
  
  console.log('Actions to take:');
  console.log('1. Review critical anomalies with field teams');
  console.log('2. Verify agent training on proper status updates');
  console.log('3. Check for system issues causing reverts');
  console.log('4. Update process documentation if needed');
  
  await db.close();
}

// Handle command line options
const args = process.argv.slice(2);
const options = {
  export: args.includes('--export') || args.includes('-e')
};

// Run detection
detectAnomalies(options).catch(console.error);