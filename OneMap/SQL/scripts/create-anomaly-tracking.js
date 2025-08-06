#!/usr/bin/env node

const Database = require('./src/database');
const chalk = require('chalk');

async function createAnomalyTracking() {
  const db = new Database();
  await db.initialize();
  
  console.log(chalk.cyan('=== SETTING UP ANOMALY TRACKING SYSTEM ===\n'));
  
  // Create anomalies table
  console.log(chalk.yellow('1. Creating anomalies tracking table...'));
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS status_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id TEXT NOT NULL,
      pole_number TEXT,
      drop_number TEXT,
      anomaly_type TEXT NOT NULL,
      old_status TEXT,
      new_status TEXT,
      status_change_date DATETIME,
      detected_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      import_file TEXT,
      import_batch_id TEXT,
      agent TEXT,
      address TEXT,
      severity TEXT DEFAULT 'medium',
      resolved BOOLEAN DEFAULT 0,
      resolution_notes TEXT,
      resolution_date DATETIME,
      
      CHECK(anomaly_type IN (
        'status_revert',           -- Going backwards in process
        'bypassed_approval',       -- Skipping required approval
        'impossible_transition',   -- Status change that shouldn't happen
        'rapid_status_change',     -- Too fast between statuses
        'missing_prerequisite'     -- Missing required prior status
      )),
      
      CHECK(severity IN ('low', 'medium', 'high', 'critical'))
    )
  `);
  
  // Create indexes
  await db.run(`
    CREATE INDEX IF NOT EXISTS idx_anomaly_property ON status_anomalies(property_id);
    CREATE INDEX IF NOT EXISTS idx_anomaly_type ON status_anomalies(anomaly_type);
    CREATE INDEX IF NOT EXISTS idx_anomaly_date ON status_anomalies(detected_date);
    CREATE INDEX IF NOT EXISTS idx_anomaly_resolved ON status_anomalies(resolved);
  `);
  
  // Create anomaly rules table
  console.log(chalk.yellow('2. Creating anomaly rules table...'));
  
  await db.run(`
    CREATE TABLE IF NOT EXISTS anomaly_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_name TEXT UNIQUE NOT NULL,
      anomaly_type TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      severity TEXT DEFAULT 'medium',
      description TEXT,
      active BOOLEAN DEFAULT 1
    )
  `);
  
  // Insert default anomaly rules
  console.log(chalk.yellow('3. Setting up default anomaly detection rules...'));
  
  const rules = [
    // Status Reverts (going backwards)
    {
      name: 'installed_to_progress',
      type: 'status_revert',
      from: 'Home Installation: Installed',
      to: 'Home Installation: In Progress',
      severity: 'high',
      desc: 'Completed installation reverting to in progress'
    },
    {
      name: 'approved_to_pending',
      type: 'status_revert',
      from: 'Pole Permission: Approved',
      to: 'Pole Permission: Pending',
      severity: 'medium',
      desc: 'Approved permission reverting to pending'
    },
    {
      name: 'scheduled_to_approved',
      type: 'status_revert',
      from: 'Home Sign Ups: Approved & Installation Scheduled',
      to: 'Home Sign Ups: Approved',
      severity: 'low',
      desc: 'Scheduled installation reverting to just approved'
    },
    
    // Bypassed Approvals
    {
      name: 'declined_to_progress',
      type: 'bypassed_approval',
      from: 'Home Sign Ups: Declined',
      to: 'Home Installation: In Progress',
      severity: 'critical',
      desc: 'Installation proceeding despite declined signup'
    },
    {
      name: 'declined_pole_to_install',
      type: 'bypassed_approval',
      from: 'Pole Permission: Declined',
      to: 'Home Installation: In Progress',
      severity: 'critical',
      desc: 'Installation without pole permission'
    },
    {
      name: 'no_signup_to_install',
      type: 'missing_prerequisite',
      from: '',
      to: 'Home Installation: In Progress',
      severity: 'high',
      desc: 'Installation without any signup record'
    },
    
    // Impossible Transitions
    {
      name: 'pending_to_installed',
      type: 'impossible_transition',
      from: 'Pole Permission: Pending',
      to: 'Home Installation: Installed',
      severity: 'high',
      desc: 'Jumping from pending permission to installed'
    },
    {
      name: 'declined_to_installed',
      type: 'impossible_transition',
      from: 'Home Sign Ups: Declined',
      to: 'Home Installation: Installed',
      severity: 'critical',
      desc: 'Installation completed despite declined signup'
    }
  ];
  
  for (const rule of rules) {
    await db.run(`
      INSERT OR IGNORE INTO anomaly_rules 
      (rule_name, anomaly_type, from_status, to_status, severity, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [rule.name, rule.type, rule.from, rule.to, rule.severity, rule.desc]);
  }
  
  console.log(`   Added ${rules.length} anomaly detection rules`);
  
  // Create detection function
  console.log(chalk.yellow('4. Creating anomaly detection view...'));
  
  await db.run(`
    CREATE VIEW IF NOT EXISTS anomaly_detection_view AS
    SELECT 
      sh.property_id,
      sh.pole_number,
      sh.drop_number,
      sh.old_status,
      sh.new_status,
      sh.status_change_date,
      sh.import_batch_id,
      sh.agent,
      sh.address,
      ar.anomaly_type,
      ar.severity,
      ar.description as anomaly_description,
      ar.rule_name
    FROM status_history sh
    JOIN anomaly_rules ar ON 
      (sh.old_status = ar.from_status AND sh.new_status = ar.to_status)
      OR (ar.from_status = '' AND sh.old_status IS NULL AND sh.new_status = ar.to_status)
    WHERE ar.active = 1
      AND NOT EXISTS (
        SELECT 1 FROM status_anomalies sa 
        WHERE sa.property_id = sh.property_id 
          AND sa.old_status = sh.old_status 
          AND sa.new_status = sh.new_status
          AND sa.status_change_date = sh.status_change_date
      )
  `);
  
  // Create summary views
  console.log(chalk.yellow('5. Creating anomaly summary views...'));
  
  await db.run(`
    CREATE VIEW IF NOT EXISTS anomaly_summary AS
    SELECT 
      anomaly_type,
      severity,
      COUNT(*) as count,
      COUNT(CASE WHEN resolved = 0 THEN 1 END) as unresolved_count,
      COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_count,
      MAX(detected_date) as last_detected
    FROM status_anomalies
    GROUP BY anomaly_type, severity
  `);
  
  await db.run(`
    CREATE VIEW IF NOT EXISTS recent_anomalies AS
    SELECT 
      sa.*,
      CASE 
        WHEN julianday('now') - julianday(detected_date) < 1 THEN 'Today'
        WHEN julianday('now') - julianday(detected_date) < 7 THEN 'This Week'
        WHEN julianday('now') - julianday(detected_date) < 30 THEN 'This Month'
        ELSE 'Older'
      END as time_period
    FROM status_anomalies sa
    WHERE resolved = 0
    ORDER BY detected_date DESC
    LIMIT 100
  `);
  
  console.log(chalk.green('\n✓ Anomaly tracking system created successfully!\n'));
  
  // Show current stats
  console.log(chalk.cyan('Current System Status:'));
  
  const ruleCount = await db.get('SELECT COUNT(*) as count FROM anomaly_rules WHERE active = 1');
  console.log(`  Active detection rules: ${ruleCount.count}`);
  
  const anomalyCount = await db.get('SELECT COUNT(*) as count FROM status_anomalies');
  console.log(`  Total anomalies detected: ${anomalyCount.count}`);
  
  await db.close();
}

// Run setup
createAnomalyTracking().catch(console.error);