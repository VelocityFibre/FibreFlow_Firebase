#!/usr/bin/env node

/**
 * Daily Change Tracker for 1Map Data
 * Tracks day-to-day changes in:
 * - Pole installations
 * - Status changes
 * - Home signups
 * - Completions
 * - Agent productivity
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();

class DailyChangeTracker {
  constructor() {
    this.today = new Date().toISOString().split('T')[0];
    this.yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  }

  async trackDailyChanges() {
    console.log('📊 Daily Change Tracking System\n');
    console.log(`Comparing: ${this.yesterday} → ${this.today}\n`);
    
    try {
      // 1. Get current snapshot
      const currentSnapshot = await this.getCurrentSnapshot();
      
      // 2. Get yesterday's snapshot (if exists)
      const yesterdaySnapshot = await this.getYesterdaySnapshot();
      
      // 3. Calculate changes
      const changes = await this.calculateChanges(yesterdaySnapshot, currentSnapshot);
      
      // 4. Generate reports
      await this.generateReports(changes);
      
      // 5. Save today's snapshot for tomorrow
      await this.saveSnapshot(currentSnapshot);
      
      console.log('\n✅ Daily change tracking complete!');
      
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async getCurrentSnapshot() {
    console.log('📸 Taking current snapshot...');
    const snapshot = await db.collection('onemap-processing-staging').get();
    
    const data = {};
    const statusCounts = {};
    const agentStats = {};
    
    snapshot.forEach(doc => {
      const record = doc.data();
      data[record.propertyId] = {
        id: doc.id,
        propertyId: record.propertyId,
        status: record.status,
        poleNumber: record.poleNumber,
        fieldAgent: record.fieldAgentPolePermission,
        dateStatusChanged: record.dateStatusChanged,
        lastModified: record.lastModifiedDate
      };
      
      // Count by status
      statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
      
      // Count by agent
      if (record.fieldAgentPolePermission) {
        agentStats[record.fieldAgentPolePermission] = 
          (agentStats[record.fieldAgentPolePermission] || 0) + 1;
      }
    });
    
    return { data, statusCounts, agentStats, total: snapshot.size };
  }

  async getYesterdaySnapshot() {
    try {
      const snapshotPath = `snapshots/daily-snapshot-${this.yesterday}.json`;
      const content = await fs.readFile(snapshotPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.log('⚠️  No yesterday snapshot found (first run?)');
      return null;
    }
  }

  async calculateChanges(yesterday, today) {
    const changes = {
      summary: {
        date: this.today,
        totalRecordsYesterday: yesterday?.total || 0,
        totalRecordsToday: today.total,
        netChange: today.total - (yesterday?.total || 0)
      },
      statusChanges: {},
      newRecords: [],
      statusTransitions: [],
      agentProductivity: {}
    };
    
    // Calculate status changes
    Object.keys(today.statusCounts).forEach(status => {
      const yesterdayCount = yesterday?.statusCounts?.[status] || 0;
      const todayCount = today.statusCounts[status];
      changes.statusChanges[status] = {
        yesterday: yesterdayCount,
        today: todayCount,
        change: todayCount - yesterdayCount,
        percentChange: yesterdayCount > 0 ? 
          ((todayCount - yesterdayCount) / yesterdayCount * 100).toFixed(1) : 'New'
      };
    });
    
    // Track individual record changes
    if (yesterday) {
      Object.entries(today.data).forEach(([propId, record]) => {
        const yesterdayRecord = yesterday.data[propId];
        
        if (!yesterdayRecord) {
          // New record
          changes.newRecords.push(record);
        } else if (yesterdayRecord.status !== record.status) {
          // Status changed
          changes.statusTransitions.push({
            propertyId: propId,
            from: yesterdayRecord.status,
            to: record.status,
            poleNumber: record.poleNumber,
            agent: record.fieldAgent
          });
        }
      });
    }
    
    // Calculate agent productivity
    Object.keys(today.agentStats).forEach(agent => {
      const yesterdayCount = yesterday?.agentStats?.[agent] || 0;
      const todayCount = today.agentStats[agent];
      changes.agentProductivity[agent] = {
        totalAssigned: todayCount,
        newToday: todayCount - yesterdayCount
      };
    });
    
    return changes;
  }

  async generateReports(changes) {
    // Create reports directory
    const reportsDir = `reports/daily-changes`;
    await fs.mkdir(reportsDir, { recursive: true });
    
    // 1. Generate summary report
    const summaryReport = `# Daily Change Report - ${this.today}

## Summary
- **Total Records**: ${changes.summary.totalRecordsToday} (${changes.summary.netChange >= 0 ? '+' : ''}${changes.summary.netChange})
- **New Records Today**: ${changes.newRecords.length}
- **Status Changes**: ${changes.statusTransitions.length}

## Status Breakdown
${Object.entries(changes.statusChanges)
  .sort(([,a], [,b]) => b.today - a.today)
  .map(([status, data]) => 
    `- **${status}**: ${data.today} (${data.change >= 0 ? '+' : ''}${data.change})`
  ).join('\n')}

## Key Metrics

### Pole Installations
- **Poles Approved Today**: ${changes.statusChanges['Pole Permission: Approved']?.change || 0}
- **Total Poles Approved**: ${changes.statusChanges['Pole Permission: Approved']?.today || 0}

### Home Signups
- **New Signups Today**: ${changes.statusChanges['Home Sign Ups: Approved & Installation Scheduled']?.change || 0}
- **Total Signups**: ${changes.statusChanges['Home Sign Ups: Approved & Installation Scheduled']?.today || 0}

### Completions
- **Installed Today**: ${changes.statusChanges['Home Installation: Installed']?.change || 0}
- **Total Installed**: ${changes.statusChanges['Home Installation: Installed']?.today || 0}

## Agent Productivity (Top 10)
${Object.entries(changes.agentProductivity)
  .sort(([,a], [,b]) => b.newToday - a.newToday)
  .slice(0, 10)
  .map(([agent, data]) => 
    `- **${agent}**: ${data.newToday} new (${data.totalAssigned} total)`
  ).join('\n')}

## Status Transitions
${changes.statusTransitions.slice(0, 20).map(t => 
  `- ${t.propertyId}: ${t.from} → ${t.to} (${t.agent || 'No agent'})`
).join('\n')}
${changes.statusTransitions.length > 20 ? `\n... and ${changes.statusTransitions.length - 20} more transitions` : ''}

---
*Generated: ${new Date().toISOString()}*
`;
    
    await fs.writeFile(`${reportsDir}/daily-report-${this.today}.md`, summaryReport);
    
    // 2. Export changes to CSV
    if (changes.statusTransitions.length > 0) {
      const csvPath = `${reportsDir}/status-changes-${this.today}.csv`;
      const csvWriter = createCsvWriter({
        path: csvPath,
        header: [
          { id: 'propertyId', title: 'Property ID' },
          { id: 'from', title: 'Previous Status' },
          { id: 'to', title: 'New Status' },
          { id: 'poleNumber', title: 'Pole Number' },
          { id: 'agent', title: 'Field Agent' }
        ]
      });
      
      await csvWriter.writeRecords(changes.statusTransitions);
      console.log(`\n✅ Exported status changes to: ${csvPath}`);
    }
    
    // 3. Display summary
    console.log('\n📊 Daily Change Summary:');
    console.log(`- New Records: ${changes.newRecords.length}`);
    console.log(`- Status Changes: ${changes.statusTransitions.length}`);
    console.log(`- Poles Approved Today: ${changes.statusChanges['Pole Permission: Approved']?.change || 0}`);
    console.log(`- Home Signups Today: ${changes.statusChanges['Home Sign Ups: Approved & Installation Scheduled']?.change || 0}`);
    console.log(`- Completed Today: ${changes.statusChanges['Home Installation: Installed']?.change || 0}`);
    
    console.log(`\n📄 Full report saved to: ${reportsDir}/daily-report-${this.today}.md`);
  }

  async saveSnapshot(snapshot) {
    const snapshotsDir = 'snapshots';
    await fs.mkdir(snapshotsDir, { recursive: true });
    
    const snapshotPath = `${snapshotsDir}/daily-snapshot-${this.today}.json`;
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log(`\n💾 Snapshot saved for tomorrow's comparison`);
  }
}

// Run if called directly
if (require.main === module) {
  const tracker = new DailyChangeTracker();
  tracker.trackDailyChanges();
}

module.exports = DailyChangeTracker;