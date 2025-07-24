#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parse/sync');

async function findActivePoles() {
  console.log('Analyzing poles for activity levels...\n');

  // Read master CSV
  const content = fs.readFileSync('data/master/master_csv_latest_validated.csv', 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    relax_quotes: true,
    relax_column_count: true
  });

  // Group by pole and analyze activity
  const poleActivity = new Map();

  records.forEach(record => {
    const pole = record['Pole Number'];
    if (!pole) return;
    
    if (!poleActivity.has(pole)) {
      poleActivity.set(pole, {
        recordCount: 0,
        statuses: new Set(),
        drops: new Set(),
        addresses: new Set(),
        agents: new Set(),
        dates: new Set(),
        properties: new Set(),
        workflows: new Set()
      });
    }
    
    const activity = poleActivity.get(pole);
    activity.recordCount++;
    
    if (record.Status) activity.statuses.add(record.Status);
    if (record['Drop Number']) activity.drops.add(record['Drop Number']);
    if (record['Location Address']) activity.addresses.add(record['Location Address']);
    if (record._first_seen_date) activity.dates.add(record._first_seen_date);
    if (record.date_status_changed) activity.dates.add(record.date_status_changed);
    if (record['Property ID']) activity.properties.add(record['Property ID']);
    if (record['Flow Name Groups']) activity.workflows.add(record['Flow Name Groups']);
    
    // Collect agents from various fields
    const agentFields = [
      'Field Agent Name (pole permission)',
      'Field Agent Name (Home Sign Ups)',
      'Field Agent Name & Surname(sales)',
      'Installer Name'
    ];
    agentFields.forEach(field => {
      if (record[field] && record[field] !== 'Unknown') {
        activity.agents.add(record[field]);
      }
    });
  });

  // Score poles by activity level
  const scoredPoles = Array.from(poleActivity.entries()).map(([pole, activity]) => {
    const score = 
      activity.recordCount * 2 +           // More records = more activity
      activity.statuses.size * 10 +        // Different statuses = progression
      activity.drops.size * 5 +            // Multiple drops = complexity
      activity.agents.size * 3 +           // Multiple agents = interesting
      activity.addresses.size * 8 +        // Multiple addresses = potential issues
      activity.dates.size * 4 +            // Different dates = timeline
      activity.workflows.size * 6;         // Different workflows = progression
      
    return {
      pole,
      score,
      records: activity.recordCount,
      statuses: activity.statuses.size,
      statusList: Array.from(activity.statuses),
      drops: activity.drops.size,
      dropList: Array.from(activity.drops),
      addresses: activity.addresses.size,
      addressList: Array.from(activity.addresses),
      agents: activity.agents.size,
      agentList: Array.from(activity.agents),
      dates: activity.dates.size,
      properties: activity.properties.size,
      workflows: activity.workflows.size,
      workflowList: Array.from(activity.workflows)
    };
  });

  // Sort by activity score
  scoredPoles.sort((a, b) => b.score - a.score);

  console.log('🏆 TOP 15 MOST ACTIVE POLES:\n');
  console.log('Rank | Pole         | Score | Records | Statuses | Drops | Agents | Addresses | Workflows');
  console.log('-----|--------------|-------|---------|----------|-------|--------|-----------|----------');

  scoredPoles.slice(0, 15).forEach((pole, idx) => {
    console.log(`${(idx+1).toString().padStart(2)}   | ${pole.pole.padEnd(12)} | ${pole.score.toString().padStart(3)}   | ${pole.records.toString().padStart(5)}   | ${pole.statuses.toString().padStart(6)}   | ${pole.drops.toString().padStart(3)}   | ${pole.agents.toString().padStart(4)}   | ${pole.addresses.toString().padStart(7)}   | ${pole.workflows}`);
  });

  console.log('\n📋 DETAILED INFO FOR TOP 5 CANDIDATES:\n');

  scoredPoles.slice(0, 5).forEach((pole, idx) => {
    console.log(`${idx+1}. ${pole.pole} (Score: ${pole.score})`);
    console.log(`   📊 Activity: ${pole.records} records, ${pole.dates} different dates, ${pole.properties} properties`);
    console.log(`   📈 Status progression: ${pole.statusList.join(' → ')}`);
    console.log(`   💧 Drops (${pole.drops}): ${pole.dropList.slice(0, 4).join(', ')}${pole.drops > 4 ? ` (+${pole.drops-4} more)` : ''}`);
    console.log(`   👥 Agents (${pole.agents}): ${pole.agentList.slice(0, 3).join(', ')}${pole.agents > 3 ? ` (+${pole.agents-3} more)` : ''}`);
    
    if (pole.addresses > 1) {
      console.log(`   🚨 Multiple addresses (${pole.addresses}): ${pole.addressList.slice(0, 2).join(' | ')}${pole.addresses > 2 ? ` (+${pole.addresses-2} more)` : ''}`);
    }
    
    if (pole.workflows > 1) {
      console.log(`   🔄 Workflows (${pole.workflows}): ${pole.workflowList.slice(0, 2).join(' → ')}${pole.workflows > 2 ? ` (+${pole.workflows-2} more)` : ''}`);
    }
    
    console.log('');
  });

  console.log('💡 RECOMMENDATIONS FOR DETAILED REPORTS:\n');
  console.log('Based on activity analysis, these poles would show the most interesting timelines:');
  
  scoredPoles.slice(0, 3).forEach((pole, idx) => {
    const reasons = [];
    if (pole.statuses > 2) reasons.push(`${pole.statuses} different statuses`);
    if (pole.addresses > 1) reasons.push(`${pole.addresses} addresses (potential conflict)`);
    if (pole.drops > 3) reasons.push(`${pole.drops} connected drops`);
    if (pole.agents > 2) reasons.push(`${pole.agents} different agents`);
    if (pole.workflows > 2) reasons.push(`${pole.workflows} workflow stages`);
    
    console.log(`${idx+1}. ${pole.pole} - ${reasons.join(', ')}`);
  });

  return scoredPoles.slice(0, 5);
}

if (require.main === module) {
  findActivePoles();
}

module.exports = { findActivePoles };