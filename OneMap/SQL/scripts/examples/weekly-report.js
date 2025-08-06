#!/usr/bin/env node

/**
 * Weekly Report Generator
 * Generates a comprehensive weekly report for OneMap data
 */

const Database = require('../src/database');
const Analytics = require('../src/analytics');
const chalk = require('chalk');

async function generateWeeklyReport() {
  const db = await new Database();
  await db.initialize();
  
  const analytics = new Analytics(db);
  
  console.log(chalk.cyan('Generating Weekly Report...'));
  
  // Get last 7 days of data
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  console.log(chalk.gray(`Period: ${startDate} to ${endDate}`));
  
  // Run multiple analytics
  const report = {
    summary: await db.get(`
      SELECT 
        COUNT(DISTINCT pole_number) as poles_processed,
        COUNT(DISTINCT drop_number) as drops_processed,
        COUNT(DISTINCT agent) as active_agents,
        COUNT(*) as total_changes
      FROM status_changes
      WHERE status_date >= ? AND status_date <= ?
    `, [startDate, endDate]),
    
    firstApprovals: await analytics.runFirstApprovals({ startDate, endDate }),
    agentPerformance: await analytics.runAgentPerformance({ startDate, endDate }),
    dailyActivity: await analytics.runDailyActivity({ startDate, endDate })
  };
  
  // Display summary
  console.log(chalk.green('\nWeekly Summary:'));
  console.log(`Poles Processed: ${report.summary.poles_processed}`);
  console.log(`Drops Processed: ${report.summary.drops_processed}`);
  console.log(`Active Agents: ${report.summary.active_agents}`);
  console.log(`Total Changes: ${report.summary.total_changes}`);
  
  // Export to Excel
  const filename = `../reports/weekly_report_${endDate}.xlsx`;
  await analytics.exportToExcel(report.firstApprovals, filename, 'First Approvals');
  
  console.log(chalk.green(`\n✓ Report saved to: ${filename}`));
  
  await db.close();
}

// Run the report
generateWeeklyReport().catch(console.error);