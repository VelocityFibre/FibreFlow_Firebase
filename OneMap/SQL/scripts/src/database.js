const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor(dbPath = './onemap.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Connected to SQLite database: ${this.dbPath}`);
          resolve();
        }
      });
    });
  }

  async initialize() {
    await this.connect();
    await this.createTables();
    await this.createIndexes();
    await this.createViews();
  }

  async createTables() {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS status_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id TEXT,
        pole_number TEXT,
        drop_number TEXT,
        status TEXT,
        status_date DATETIME,
        agent TEXT,
        address TEXT,
        location_lat REAL,
        location_lng REAL,
        zone TEXT,
        feeder TEXT,
        distribution TEXT,
        pon TEXT,
        project TEXT,
        contractor TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        import_batch_id TEXT,
        source_row INTEGER,
        raw_data TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        filename TEXT,
        sheet_name TEXT,
        import_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_rows INTEGER,
        processed_rows INTEGER,
        error_rows INTEGER,
        duplicate_rows INTEGER,
        status TEXT,
        column_mapping TEXT,
        errors TEXT
      )`,
      
      `CREATE TABLE IF NOT EXISTS pole_capacity (
        pole_number TEXT PRIMARY KEY,
        total_drops INTEGER DEFAULT 0,
        max_capacity INTEGER DEFAULT 12,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const schema of schemas) {
      await this.run(schema);
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_pole_number ON status_changes(pole_number)',
      'CREATE INDEX IF NOT EXISTS idx_drop_number ON status_changes(drop_number)',
      'CREATE INDEX IF NOT EXISTS idx_status_date ON status_changes(status_date)',
      'CREATE INDEX IF NOT EXISTS idx_status ON status_changes(status)',
      'CREATE INDEX IF NOT EXISTS idx_agent ON status_changes(agent)',
      'CREATE INDEX IF NOT EXISTS idx_property_id ON status_changes(property_id)',
      'CREATE INDEX IF NOT EXISTS idx_import_batch ON status_changes(import_batch_id)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }
  }

  async createViews() {
    const views = [
      `CREATE VIEW IF NOT EXISTS first_approvals AS
       SELECT 
         pole_number,
         MIN(status_date) as first_approval_date,
         agent as first_approval_agent,
         COUNT(*) as total_statuses
       FROM status_changes
       WHERE status LIKE '%Approved%'
         AND pole_number IS NOT NULL
         AND pole_number != ''
       GROUP BY pole_number`,
      
      `CREATE VIEW IF NOT EXISTS pole_summary AS
       SELECT 
         pole_number,
         COUNT(DISTINCT drop_number) as drop_count,
         COUNT(DISTINCT property_id) as property_count,
         MAX(status_date) as last_update,
         COUNT(*) as total_status_changes,
         COUNT(DISTINCT agent) as unique_agents
       FROM status_changes
       WHERE pole_number IS NOT NULL
         AND pole_number != ''
       GROUP BY pole_number`,
      
      `CREATE VIEW IF NOT EXISTS agent_performance AS
       SELECT 
         agent,
         COUNT(DISTINCT pole_number) as poles_handled,
         COUNT(DISTINCT drop_number) as drops_handled,
         COUNT(*) as total_actions,
         DATE(MIN(status_date)) as first_action,
         DATE(MAX(status_date)) as last_action,
         CAST((julianday(MAX(status_date)) - julianday(MIN(status_date))) AS INTEGER) as days_active
       FROM status_changes
       WHERE agent IS NOT NULL
         AND agent != ''
       GROUP BY agent`,
       
      `CREATE VIEW IF NOT EXISTS daily_activity AS
       SELECT 
         DATE(status_date) as activity_date,
         COUNT(DISTINCT pole_number) as poles_touched,
         COUNT(DISTINCT drop_number) as drops_touched,
         COUNT(DISTINCT agent) as active_agents,
         COUNT(*) as total_changes
       FROM status_changes
       WHERE status_date IS NOT NULL
       GROUP BY DATE(status_date)`
    ];

    for (const view of views) {
      await this.run(`DROP VIEW IF EXISTS ${view.match(/CREATE VIEW IF NOT EXISTS (\w+)/)[1]}`);
      await this.run(view);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
  }

  async commit() {
    await this.run('COMMIT');
  }

  async rollback() {
    await this.run('ROLLBACK');
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Utility methods for analytics
  async getTableInfo(tableName) {
    return await this.all(`PRAGMA table_info(${tableName})`);
  }

  async getStats() {
    const stats = {};
    stats.totalRecords = await this.get('SELECT COUNT(*) as count FROM status_changes');
    stats.uniquePoles = await this.get('SELECT COUNT(DISTINCT pole_number) as count FROM status_changes WHERE pole_number IS NOT NULL');
    stats.uniqueDrops = await this.get('SELECT COUNT(DISTINCT drop_number) as count FROM status_changes WHERE drop_number IS NOT NULL');
    stats.uniqueAgents = await this.get('SELECT COUNT(DISTINCT agent) as count FROM status_changes WHERE agent IS NOT NULL');
    stats.dateRange = await this.get('SELECT MIN(status_date) as min_date, MAX(status_date) as max_date FROM status_changes');
    
    return stats;
  }
}

module.exports = Database;