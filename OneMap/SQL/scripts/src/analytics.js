const chalk = require('chalk');
const Table = require('cli-table3');
const XLSX = require('xlsx');
const fs = require('fs');

class Analytics {
  constructor(database) {
    this.db = database;
  }

  async runFirstApprovals(options = {}) {
    const { startDate, endDate, limit = 100 } = options;
    
    let sql = `
      SELECT 
        pole_number,
        first_approval_date,
        first_approval_agent,
        total_statuses
      FROM first_approvals
      WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
      sql += ' AND first_approval_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND first_approval_date <= ?';
      params.push(endDate);
    }
    
    sql += ' ORDER BY first_approval_date DESC LIMIT ?';
    params.push(limit);
    
    const results = await this.db.all(sql, params);
    
    return results;
  }

  async runAgentPerformance(options = {}) {
    const { startDate, endDate, minPoles = 0 } = options;
    
    let sql = `
      SELECT 
        agent,
        poles_handled,
        drops_handled,
        total_actions,
        first_action,
        last_action,
        days_active,
        ROUND(CAST(total_actions AS REAL) / NULLIF(days_active, 0), 2) as avg_actions_per_day
      FROM agent_performance
      WHERE poles_handled >= ?
    `;
    
    const params = [minPoles];
    
    if (startDate || endDate) {
      // Need to filter based on the underlying table
      sql = `
        SELECT 
          agent,
          COUNT(DISTINCT pole_number) as poles_handled,
          COUNT(DISTINCT drop_number) as drops_handled,
          COUNT(*) as total_actions,
          DATE(MIN(status_date)) as first_action,
          DATE(MAX(status_date)) as last_action,
          CAST((julianday(MAX(status_date)) - julianday(MIN(status_date))) AS INTEGER) as days_active,
          ROUND(CAST(COUNT(*) AS REAL) / NULLIF(CAST((julianday(MAX(status_date)) - julianday(MIN(status_date))) AS INTEGER), 0), 2) as avg_actions_per_day
        FROM status_changes
        WHERE agent IS NOT NULL AND agent != ''
      `;
      
      if (startDate) {
        sql += ' AND status_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ' AND status_date <= ?';
        params.push(endDate);
      }
      
      sql += ' GROUP BY agent HAVING COUNT(DISTINCT pole_number) >= ?';
      params.push(minPoles);
    }
    
    sql += ' ORDER BY poles_handled DESC';
    
    const results = await this.db.all(sql, params);
    
    return results;
  }

  async runStatusAnalysis(options = {}) {
    const sql = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(DISTINCT pole_number) as unique_poles,
        COUNT(DISTINCT drop_number) as unique_drops,
        COUNT(DISTINCT agent) as unique_agents,
        MIN(status_date) as first_occurrence,
        MAX(status_date) as last_occurrence
      FROM status_changes
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const results = await this.db.all(sql);
    
    return results;
  }

  async runDailyActivity(options = {}) {
    const { startDate, endDate, limit = 30 } = options;
    
    let sql = `
      SELECT 
        activity_date,
        poles_touched,
        drops_touched,
        active_agents,
        total_changes
      FROM daily_activity
      WHERE activity_date IS NOT NULL
    `;
    
    const params = [];
    
    if (startDate) {
      sql += ' AND activity_date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND activity_date <= ?';
      params.push(endDate);
    }
    
    sql += ' ORDER BY activity_date DESC LIMIT ?';
    params.push(limit);
    
    const results = await this.db.all(sql, params);
    
    return results;
  }

  async runPoleCapacityAnalysis() {
    const sql = `
      SELECT 
        pc.pole_number,
        pc.total_drops,
        pc.max_capacity,
        pc.max_capacity - pc.total_drops as available_capacity,
        ROUND(CAST(pc.total_drops AS REAL) / pc.max_capacity * 100, 2) as utilization_percent,
        ps.property_count,
        ps.last_update
      FROM pole_capacity pc
      LEFT JOIN pole_summary ps ON pc.pole_number = ps.pole_number
      WHERE pc.total_drops > 0
      ORDER BY utilization_percent DESC
    `;
    
    const results = await this.db.all(sql);
    
    return results;
  }

  async runDuplicateAnalysis() {
    const sql = `
      SELECT 
        pole_number,
        drop_number,
        status,
        COUNT(*) as duplicate_count,
        GROUP_CONCAT(DISTINCT agent) as agents,
        MIN(status_date) as first_date,
        MAX(status_date) as last_date
      FROM status_changes
      WHERE pole_number IS NOT NULL
      GROUP BY pole_number, drop_number, status
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
      LIMIT 100
    `;
    
    const results = await this.db.all(sql);
    
    return results;
  }

  async runCustomQuery(sql, params = []) {
    try {
      const results = await this.db.all(sql, params);
      return results;
    } catch (error) {
      throw new Error(`Query error: ${error.message}`);
    }
  }

  // Display methods
  displayTable(results, title) {
    console.log('\n' + chalk.cyan(title));
    
    if (!results || results.length === 0) {
      console.log(chalk.yellow('No results found'));
      return;
    }
    
    const headers = Object.keys(results[0]);
    const table = new Table({
      head: headers.map(h => chalk.white(h)),
      style: { 'padding-left': 1, 'padding-right': 1 }
    });
    
    results.forEach(row => {
      table.push(headers.map(h => {
        const value = row[h];
        if (value === null || value === undefined) return chalk.gray('NULL');
        if (typeof value === 'number') return chalk.green(value.toString());
        if (h.includes('date') || h.includes('time')) return chalk.blue(value);
        return value.toString();
      }));
    });
    
    console.log(table.toString());
    console.log(chalk.gray(`Total: ${results.length} rows`));
  }

  // Export methods
  async exportToExcel(results, filename, sheetName = 'Results') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    console.log(chalk.green(`✓ Exported to ${filename}`));
  }

  async exportToJSON(results, filename) {
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(chalk.green(`✓ Exported to ${filename}`));
  }

  async exportToCSV(results, filename) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(results);
    const csv = XLSX.utils.sheet_to_csv(ws);
    fs.writeFileSync(filename, csv);
    console.log(chalk.green(`✓ Exported to ${filename}`));
  }

  // Predefined reports
  async generateMonthlyReport(year, month) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    console.log(chalk.cyan(`\nGenerating report for ${year}-${month}...`));
    
    const report = {
      summary: await this.db.get(`
        SELECT 
          COUNT(DISTINCT pole_number) as total_poles,
          COUNT(DISTINCT drop_number) as total_drops,
          COUNT(DISTINCT agent) as active_agents,
          COUNT(*) as total_changes
        FROM status_changes
        WHERE status_date >= ? AND status_date <= ?
      `, [startDate, endDate]),
      
      firstApprovals: await this.runFirstApprovals({ startDate, endDate }),
      agentPerformance: await this.runAgentPerformance({ startDate, endDate }),
      dailyActivity: await this.runDailyActivity({ startDate, endDate })
    };
    
    // Export to Excel with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Poles', report.summary.total_poles],
      ['Total Drops', report.summary.total_drops],
      ['Active Agents', report.summary.active_agents],
      ['Total Status Changes', report.summary.total_changes]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Other sheets
    if (report.firstApprovals.length > 0) {
      const approvalSheet = XLSX.utils.json_to_sheet(report.firstApprovals);
      XLSX.utils.book_append_sheet(wb, approvalSheet, 'First Approvals');
    }
    
    if (report.agentPerformance.length > 0) {
      const agentSheet = XLSX.utils.json_to_sheet(report.agentPerformance);
      XLSX.utils.book_append_sheet(wb, agentSheet, 'Agent Performance');
    }
    
    if (report.dailyActivity.length > 0) {
      const activitySheet = XLSX.utils.json_to_sheet(report.dailyActivity);
      XLSX.utils.book_append_sheet(wb, activitySheet, 'Daily Activity');
    }
    
    const filename = `OneMap_Report_${year}_${month.toString().padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    console.log(chalk.green(`✓ Monthly report exported to ${filename}`));
    
    return report;
  }
}

module.exports = Analytics;