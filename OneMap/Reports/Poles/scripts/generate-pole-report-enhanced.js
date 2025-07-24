#!/usr/bin/env node

/**
 * Enhanced Pole Report Generation
 * 
 * This module provides enhanced report generation with:
 * - Structured JSON output
 * - Timeline analysis
 * - Drop connection tracking
 * - Agent activity summary
 * - Data quality metrics
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

/**
 * Generate comprehensive pole report data
 * @param {string} poleNumber - The pole number to generate report for
 * @param {Array} records - Optional array of records (if not provided, reads from CSV)
 * @returns {Object} Complete pole report data structure
 */
async function generatePoleReportData(poleNumber, records = null) {
  try {
    // If records not provided, read from CSV
    if (!records) {
      const masterCsvPath = path.join(__dirname, '../../../GraphAnalysis/data/master/master_csv_latest_validated.csv');
      const csvContent = await fs.readFile(masterCsvPath, 'utf-8');
      
      const allRecords = csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        relax_quotes: true,
        relax_column_count: true
      });
      
      records = allRecords.filter(r => r['Pole Number'] === poleNumber);
    }
    
    if (records.length === 0) {
      throw new Error(`No records found for pole number: ${poleNumber}`);
    }
    
    // Build comprehensive report structure
    const report = {
      poleNumber,
      generatedAt: new Date().toISOString(),
      dataSource: 'CSV',
      version: 'current',
      metadata: {
        recordCount: records.length,
        dataQualityScore: 0,
        processingNotes: []
      },
      summary: buildSummary(records),
      timeline: buildTimeline(records),
      drops: buildDropsData(records),
      agents: buildAgentData(records),
      locations: buildLocationData(records),
      dataQuality: assessDataQuality(records),
      rawData: {
        firstRecord: records[0],
        lastRecord: records[records.length - 1],
        sampleSize: Math.min(5, records.length)
      }
    };
    
    // Calculate overall data quality score
    report.metadata.dataQualityScore = calculateQualityScore(report.dataQuality);
    
    return report;
    
  } catch (error) {
    console.error(`Error generating report for pole ${poleNumber}:`, error.message);
    throw error;
  }
}

/**
 * Build summary statistics
 */
function buildSummary(records) {
  const addresses = [...new Set(records.map(r => r['Location Address']))];
  const drops = [...new Set(records.map(r => r['Drop Number']).filter(d => d))];
  const agents = [...new Set(records.map(r => r['Field Agent']).filter(a => a))];
  const statuses = [...new Set(records.map(r => r['Status']))];
  
  // Find date range
  const dates = records
    .map(r => r['_first_seen_date'] || r['_import_timestamp'])
    .filter(d => d)
    .map(d => new Date(d))
    .filter(d => !isNaN(d.getTime()));
  
  const firstDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
  const lastDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
  const timeSpan = firstDate && lastDate ? 
    Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) : 0;
  
  return {
    totalRecords: records.length,
    firstAppearance: firstDate ? firstDate.toISOString() : null,
    lastUpdate: lastDate ? lastDate.toISOString() : null,
    timeSpan,
    addresses,
    totalDrops: drops.length,
    totalAgents: agents.length,
    uniqueStatuses: statuses.length,
    currentStatus: records[records.length - 1]['Status'] || 'Unknown'
  };
}

/**
 * Build detailed timeline
 */
function buildTimeline(records) {
  const timeline = [];
  
  records.forEach((record, index) => {
    const date = record['_first_seen_date'] || record['_import_timestamp'];
    if (!date) return;
    
    // Extract time if available
    const dateTime = new Date(date);
    const dateStr = dateTime.toISOString().split('T')[0];
    const timeStr = dateTime.toISOString().split('T')[1];
    
    const event = {
      date: dateStr,
      time: timeStr,
      status: record['Status'] || 'Unknown',
      previousStatus: null,
      drop: record['Drop Number'] || null,
      agent: record['Field Agent'] || null,
      workflow: record['Flow Name Groups'] || null,
      address: record['Location Address'],
      propertyId: record['Property ID'],
      source: record['_source_file'] || 'Unknown',
      changeType: 'status_update'
    };
    
    // Determine previous status
    if (index > 0) {
      const prevStatus = records[index - 1]['Status'];
      if (prevStatus !== event.status) {
        event.previousStatus = prevStatus;
        event.changeType = 'status_change';
      }
    } else {
      event.changeType = 'first_appearance';
    }
    
    timeline.push(event);
  });
  
  // Sort by date/time
  timeline.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA - dateB;
  });
  
  return timeline;
}

/**
 * Build connected drops data
 */
function buildDropsData(records) {
  const dropMap = new Map();
  
  records.forEach(record => {
    const dropNumber = record['Drop Number'];
    if (!dropNumber) return;
    
    if (!dropMap.has(dropNumber)) {
      dropMap.set(dropNumber, {
        dropNumber,
        address: record['Location Address'],
        status: record['Status'],
        agent: record['Field Agent'] || null,
        firstSeen: record['_first_seen_date'] || record['_import_timestamp'],
        lastUpdate: record['_first_seen_date'] || record['_import_timestamp'],
        updateCount: 0,
        statusHistory: []
      });
    }
    
    const drop = dropMap.get(dropNumber);
    drop.updateCount++;
    
    // Update last seen
    const currentDate = record['_first_seen_date'] || record['_import_timestamp'];
    if (currentDate && new Date(currentDate) > new Date(drop.lastUpdate)) {
      drop.lastUpdate = currentDate;
      drop.status = record['Status'];
      drop.agent = record['Field Agent'] || drop.agent;
    }
    
    // Track status history
    if (!drop.statusHistory.find(s => s.status === record['Status'])) {
      drop.statusHistory.push({
        status: record['Status'],
        date: currentDate,
        agent: record['Field Agent']
      });
    }
  });
  
  return Array.from(dropMap.values());
}

/**
 * Build agent activity data
 */
function buildAgentData(records) {
  const agentMap = new Map();
  
  records.forEach(record => {
    const agent = record['Field Agent'];
    if (!agent) return;
    
    if (!agentMap.has(agent)) {
      agentMap.set(agent, {
        name: agent,
        totalActions: 0,
        firstActivity: null,
        lastActivity: null,
        statusBreakdown: new Map(),
        dropsHandled: new Set(),
        addressesVisited: new Set()
      });
    }
    
    const agentData = agentMap.get(agent);
    agentData.totalActions++;
    
    // Update activity dates
    const date = record['_first_seen_date'] || record['_import_timestamp'];
    if (date) {
      if (!agentData.firstActivity || new Date(date) < new Date(agentData.firstActivity)) {
        agentData.firstActivity = date;
      }
      if (!agentData.lastActivity || new Date(date) > new Date(agentData.lastActivity)) {
        agentData.lastActivity = date;
      }
    }
    
    // Track status breakdown
    const status = record['Status'] || 'Unknown';
    agentData.statusBreakdown.set(status, (agentData.statusBreakdown.get(status) || 0) + 1);
    
    // Track drops and addresses
    if (record['Drop Number']) {
      agentData.dropsHandled.add(record['Drop Number']);
    }
    if (record['Location Address']) {
      agentData.addressesVisited.add(record['Location Address']);
    }
  });
  
  // Convert to array format
  return Array.from(agentMap.values()).map(agent => ({
    name: agent.name,
    totalActions: agent.totalActions,
    firstActivity: agent.firstActivity,
    lastActivity: agent.lastActivity,
    statusBreakdown: Array.from(agent.statusBreakdown.entries()).map(([status, count]) => ({
      status,
      count
    })),
    dropsHandled: agent.dropsHandled.size,
    addressesVisited: agent.addressesVisited.size
  }));
}

/**
 * Build location data
 */
function buildLocationData(records) {
  const locationMap = new Map();
  
  records.forEach(record => {
    const address = record['Location Address'];
    if (!address) return;
    
    if (!locationMap.has(address)) {
      locationMap.set(address, {
        address,
        recordCount: 0,
        drops: new Set(),
        agents: new Set(),
        statuses: new Set(),
        firstSeen: record['_first_seen_date'] || record['_import_timestamp'],
        lastUpdate: record['_first_seen_date'] || record['_import_timestamp']
      });
    }
    
    const location = locationMap.get(address);
    location.recordCount++;
    
    if (record['Drop Number']) location.drops.add(record['Drop Number']);
    if (record['Field Agent']) location.agents.add(record['Field Agent']);
    if (record['Status']) location.statuses.add(record['Status']);
    
    // Update dates
    const currentDate = record['_first_seen_date'] || record['_import_timestamp'];
    if (currentDate && new Date(currentDate) > new Date(location.lastUpdate)) {
      location.lastUpdate = currentDate;
    }
  });
  
  return Array.from(locationMap.values()).map(loc => ({
    address: loc.address,
    recordCount: loc.recordCount,
    dropCount: loc.drops.size,
    agentCount: loc.agents.size,
    statusCount: loc.statuses.size,
    firstSeen: loc.firstSeen,
    lastUpdate: loc.lastUpdate
  }));
}

/**
 * Assess data quality
 */
function assessDataQuality(records) {
  const issues = [];
  const totalRecords = records.length;
  
  // Check for missing field agents
  const missingAgents = records.filter(r => !r['Field Agent']).length;
  if (missingAgents > 0) {
    issues.push({
      type: 'missing_data',
      severity: missingAgents > totalRecords * 0.5 ? 'high' : 'medium',
      field: 'Field Agent',
      count: missingAgents,
      percentage: Math.round((missingAgents / totalRecords) * 100),
      impact: 'Cannot track agent performance'
    });
  }
  
  // Check for missing drops
  const missingDrops = records.filter(r => !r['Drop Number']).length;
  if (missingDrops > 0) {
    issues.push({
      type: 'missing_data',
      severity: 'low',
      field: 'Drop Number',
      count: missingDrops,
      percentage: Math.round((missingDrops / totalRecords) * 100),
      impact: 'Incomplete drop tracking'
    });
  }
  
  // Check for multiple addresses (potential conflict)
  const addresses = [...new Set(records.map(r => r['Location Address']))];
  if (addresses.length > 1) {
    issues.push({
      type: 'data_conflict',
      severity: 'high',
      field: 'Location Address',
      count: addresses.length,
      details: addresses,
      impact: 'Pole appears at multiple locations'
    });
  }
  
  // Check for duplicate timestamps (bulk imports)
  const timestamps = records.map(r => r['_import_timestamp']).filter(t => t);
  const duplicateTimestamps = timestamps.filter((t, i) => timestamps.indexOf(t) !== i);
  if (duplicateTimestamps.length > 0) {
    issues.push({
      type: 'bulk_import',
      severity: 'info',
      field: '_import_timestamp',
      count: duplicateTimestamps.length,
      impact: 'Records imported in bulk, may affect timeline accuracy'
    });
  }
  
  // Check for status progression anomalies
  const statusProgression = records.map(r => r['Status']);
  const anomalies = detectStatusAnomalies(statusProgression);
  if (anomalies.length > 0) {
    issues.push({
      type: 'workflow_anomaly',
      severity: 'medium',
      field: 'Status',
      count: anomalies.length,
      details: anomalies,
      impact: 'Unexpected workflow progression'
    });
  }
  
  return issues;
}

/**
 * Detect status progression anomalies
 */
function detectStatusAnomalies(statuses) {
  const anomalies = [];
  const expectedFlow = [
    'Pole Permission: Approved',
    'Home Sign Ups: Approved & Installation Scheduled',
    'Home Installation: In Progress',
    'Home Installation: Installed'
  ];
  
  // Check for backwards progression
  for (let i = 1; i < statuses.length; i++) {
    const prevIndex = expectedFlow.indexOf(statuses[i - 1]);
    const currIndex = expectedFlow.indexOf(statuses[i]);
    
    if (prevIndex >= 0 && currIndex >= 0 && currIndex < prevIndex) {
      anomalies.push({
        type: 'backwards_progression',
        from: statuses[i - 1],
        to: statuses[i],
        position: i
      });
    }
  }
  
  return anomalies;
}

/**
 * Calculate overall data quality score
 */
function calculateQualityScore(issues) {
  if (issues.length === 0) return 100;
  
  let score = 100;
  
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
      case 'info':
        score -= 2;
        break;
    }
  });
  
  return Math.max(0, score);
}

/**
 * Generate markdown report (legacy format)
 */
async function generateMarkdownReport(poleNumber, reportData) {
  const { summary, timeline, drops, agents, dataQuality } = reportData;
  
  let markdown = `# Pole ${poleNumber} - Complete Timeline Report\n\n`;
  markdown += `**Generated**: ${new Date().toLocaleDateString('en-ZA')}\n\n`;
  
  // Summary
  markdown += `## Summary\n`;
  markdown += `- **First Appearance**: ${summary.firstAppearance || 'N/A'}\n`;
  markdown += `- **Last Update**: ${summary.lastUpdate || 'N/A'}\n`;
  markdown += `- **Time Span**: ${summary.timeSpan} days\n`;
  markdown += `- **Total Records**: ${summary.totalRecords}\n`;
  markdown += `- **Addresses**: ${summary.addresses.length}\n`;
  markdown += `- **Connected Drops**: ${summary.totalDrops}\n`;
  markdown += `- **Agents Involved**: ${summary.totalAgents}\n\n`;
  
  // Addresses
  if (summary.addresses.length > 0) {
    markdown += `## Addresses\n`;
    summary.addresses.forEach(addr => {
      markdown += `- ${addr}\n`;
    });
    markdown += '\n';
  }
  
  // Timeline
  markdown += `## Status Timeline\n\n`;
  markdown += `| Date | Status | Drop | Agent |\n`;
  markdown += `|------|--------|------|-------|\n`;
  
  timeline.forEach(event => {
    markdown += `| ${event.date} | ${event.status} | ${event.drop || '-'} | ${event.agent || '-'} |\n`;
  });
  
  // Data Quality
  if (dataQuality.length > 0) {
    markdown += `\n## Data Quality Issues\n\n`;
    dataQuality.forEach(issue => {
      markdown += `- **${issue.type}**: ${issue.field} - ${issue.count} records (${issue.percentage || 0}%)\n`;
    });
  }
  
  return markdown;
}

// Export functions
module.exports = {
  generatePoleReportData,
  generateMarkdownReport
};

// Run if called directly
if (require.main === module) {
  const poleNumber = process.argv[2];
  if (!poleNumber) {
    console.error('Usage: node generate-pole-report-enhanced.js <pole-number>');
    process.exit(1);
  }
  
  generatePoleReportData(poleNumber)
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch(console.error);
}