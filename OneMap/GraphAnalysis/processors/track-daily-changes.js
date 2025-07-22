#!/usr/bin/env node

/**
 * Daily Change Tracker using Graph Analysis
 * 
 * Compares CSV files from different days to identify what changed
 * Uses graph relationships to track entity evolution over time
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream } = require('fs');
const crypto = require('crypto');

const RELATIONSHIPS_DIR = path.join(__dirname, '../data/relationships');
const CHANGES_DIR = path.join(__dirname, '../data/changes');
const REPORTS_DIR = path.join(__dirname, '../reports');

// Ensure directories exist
async function ensureDirectories() {
  await fs.mkdir(CHANGES_DIR, { recursive: true });
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

// Generate stable ID for entities
function generateId(type, value) {
  if (!value) return null;
  const normalized = value.toString().trim().toUpperCase();
  return `${type}_${crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8)}`;
}

// Extract key from record for comparison
function extractEntityKey(row) {
  // Priority: Pole > Drop > Address > Property
  if (row.pole_number && row.pole_number.trim()) {
    return {
      type: 'pole',
      value: row.pole_number.trim(),
      id: generateId('pole', row.pole_number)
    };
  }
  if (row.drop_number && row.drop_number.trim()) {
    return {
      type: 'drop',
      value: row.drop_number.trim(),
      id: generateId('drop', row.drop_number)
    };
  }
  if (row.address && row.address.trim()) {
    return {
      type: 'address',
      value: row.address.trim(),
      id: generateId('address', row.address)
    };
  }
  if (row.property_id && row.property_id.trim()) {
    return {
      type: 'property',
      value: row.property_id.trim(),
      id: generateId('property', row.property_id)
    };
  }
  return null;
}

// Process CSV and build entity map
async function buildEntityMap(csvPath, dateLabel) {
  const entities = new Map();
  const sourceFile = path.basename(csvPath);
  
  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv.parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true,
        relax_column_count: true,
        relax_quotes: true,
        skip_records_with_error: true
      }))
      .on('data', (row) => {
        // Normalize column names
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          normalizedRow[normalizedKey] = value;
        }
        
        // Extract primary entity
        const entityKey = extractEntityKey(normalizedRow);
        if (!entityKey) return;
        
        // Store entity data
        const entityData = {
          id: entityKey.id,
          type: entityKey.type,
          value: entityKey.value,
          status: normalizedRow.status || 'Unknown',
          flowNameGroups: normalizedRow.flow_name_groups || '',
          agent: normalizedRow.field_agent_name || 
                 normalizedRow['field_agent_name_(pole_permission)'] || 
                 'Unknown',
          date: normalizedRow.date_status_changed || 
                normalizedRow.lst_mod_dt || 
                dateLabel,
          propertyId: normalizedRow.property_id,
          address: normalizedRow.address || normalizedRow.location_address,
          latitude: normalizedRow.latitude || normalizedRow.actual_device_location_latitude,
          longitude: normalizedRow.longitude || normalizedRow.actual_device_location_longitude,
          source: sourceFile,
          raw: normalizedRow
        };
        
        // Store by entity ID
        if (!entities.has(entityKey.id)) {
          entities.set(entityKey.id, []);
        }
        entities.get(entityKey.id).push(entityData);
      })
      .on('error', reject)
      .on('end', () => {
        resolve(entities);
      });
  });
}

// Compare two entity maps and find changes
function compareEntityMaps(day1Map, day2Map, day1Label, day2Label) {
  const changes = {
    new: [],          // Entities only in day2
    removed: [],      // Entities only in day1
    modified: [],     // Entities in both but changed
    unchanged: [],    // Entities in both, no changes
    duplicates: []    // Multiple records for same entity in one day
  };
  
  // Check for new and modified entities
  for (const [entityId, day2Records] of day2Map) {
    const day1Records = day1Map.get(entityId);
    
    // Handle duplicates within day2
    if (day2Records.length > 1) {
      changes.duplicates.push({
        entityId,
        day: day2Label,
        count: day2Records.length,
        records: day2Records
      });
    }
    
    if (!day1Records) {
      // New entity
      changes.new.push({
        entity: day2Records[0],
        firstSeen: day2Label
      });
    } else {
      // Compare for modifications
      const day1Latest = day1Records[day1Records.length - 1];
      const day2Latest = day2Records[day2Records.length - 1];
      
      const statusChanged = day1Latest.status !== day2Latest.status;
      const flowChanged = day1Latest.flowNameGroups !== day2Latest.flowNameGroups;
      const agentChanged = day1Latest.agent !== day2Latest.agent;
      const locationChanged = (
        day1Latest.latitude !== day2Latest.latitude ||
        day1Latest.longitude !== day2Latest.longitude
      );
      
      if (statusChanged || flowChanged || agentChanged || locationChanged) {
        changes.modified.push({
          entityId,
          type: day1Latest.type,
          value: day1Latest.value,
          changes: {
            status: statusChanged ? {
              from: day1Latest.status,
              to: day2Latest.status
            } : null,
            flow: flowChanged ? {
              from: day1Latest.flowNameGroups,
              to: day2Latest.flowNameGroups
            } : null,
            agent: agentChanged ? {
              from: day1Latest.agent,
              to: day2Latest.agent
            } : null,
            location: locationChanged ? {
              from: `${day1Latest.latitude},${day1Latest.longitude}`,
              to: `${day2Latest.latitude},${day2Latest.longitude}`
            } : null
          },
          day1: day1Latest,
          day2: day2Latest
        });
      } else {
        changes.unchanged.push({
          entityId,
          type: day1Latest.type,
          value: day1Latest.value
        });
      }
    }
  }
  
  // Check for removed entities
  for (const [entityId, day1Records] of day1Map) {
    if (!day2Map.has(entityId)) {
      changes.removed.push({
        entity: day1Records[0],
        lastSeen: day1Label
      });
    }
    
    // Handle duplicates within day1
    if (day1Records.length > 1) {
      changes.duplicates.push({
        entityId,
        day: day1Label,
        count: day1Records.length,
        records: day1Records
      });
    }
  }
  
  return changes;
}

// Generate change report
async function generateChangeReport(changes, day1Label, day2Label) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `daily_changes_${day1Label}_to_${day2Label}_${timestamp}.json`);
  const summaryPath = path.join(REPORTS_DIR, `daily_changes_summary_${day1Label}_to_${day2Label}_${timestamp}.md`);
  
  // Save detailed JSON report
  await fs.writeFile(reportPath, JSON.stringify(changes, null, 2));
  
  // Generate markdown summary
  let md = `# Daily Change Report: ${day1Label} → ${day2Label}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  
  md += `## Summary\n\n`;
  md += `- **New Entities**: ${changes.new.length}\n`;
  md += `- **Removed Entities**: ${changes.removed.length}\n`;
  md += `- **Modified Entities**: ${changes.modified.length}\n`;
  md += `- **Unchanged Entities**: ${changes.unchanged.length}\n`;
  md += `- **Duplicate Issues**: ${changes.duplicates.length}\n\n`;
  
  // New entities
  if (changes.new.length > 0) {
    md += `## New Entities (${changes.new.length})\n\n`;
    md += `| Type | Value | Status | Agent |\n`;
    md += `|------|-------|--------|-------|\n`;
    changes.new.slice(0, 20).forEach(item => {
      md += `| ${item.entity.type} | ${item.entity.value} | ${item.entity.status} | ${item.entity.agent} |\n`;
    });
    if (changes.new.length > 20) {
      md += `\n*... and ${changes.new.length - 20} more*\n`;
    }
    md += `\n`;
  }
  
  // Modified entities
  if (changes.modified.length > 0) {
    md += `## Modified Entities (${changes.modified.length})\n\n`;
    md += `### Top Changes\n\n`;
    
    changes.modified.slice(0, 10).forEach(item => {
      md += `**${item.type}: ${item.value}**\n`;
      if (item.changes.status) {
        md += `- Status: ${item.changes.status.from} → ${item.changes.status.to}\n`;
      }
      if (item.changes.flow) {
        md += `- Flow: ${item.changes.flow.from} → ${item.changes.flow.to}\n`;
      }
      if (item.changes.agent) {
        md += `- Agent: ${item.changes.agent.from} → ${item.changes.agent.to}\n`;
      }
      if (item.changes.location) {
        md += `- Location changed\n`;
      }
      md += `\n`;
    });
    
    if (changes.modified.length > 10) {
      md += `*... and ${changes.modified.length - 10} more modifications*\n\n`;
    }
  }
  
  // Removed entities
  if (changes.removed.length > 0) {
    md += `## Removed Entities (${changes.removed.length})\n\n`;
    md += `| Type | Value | Last Status | Last Agent |\n`;
    md += `|------|-------|-------------|------------|\n`;
    changes.removed.slice(0, 20).forEach(item => {
      md += `| ${item.entity.type} | ${item.entity.value} | ${item.entity.status} | ${item.entity.agent} |\n`;
    });
    if (changes.removed.length > 20) {
      md += `\n*... and ${changes.removed.length - 20} more*\n`;
    }
    md += `\n`;
  }
  
  // Duplicate warnings
  if (changes.duplicates.length > 0) {
    md += `## ⚠️ Duplicate Warnings\n\n`;
    md += `Found entities with multiple records in single day:\n\n`;
    
    const byDay = {};
    changes.duplicates.forEach(dup => {
      if (!byDay[dup.day]) byDay[dup.day] = [];
      byDay[dup.day].push(dup);
    });
    
    for (const [day, dups] of Object.entries(byDay)) {
      md += `### ${day}\n`;
      dups.slice(0, 5).forEach(dup => {
        const sample = dup.records[0];
        md += `- ${sample.type}: ${sample.value} (${dup.count} records)\n`;
      });
      if (dups.length > 5) {
        md += `- ... and ${dups.length - 5} more\n`;
      }
      md += `\n`;
    }
  }
  
  // Key insights
  md += `## Key Insights\n\n`;
  
  // Status progression
  const statusProgression = {};
  changes.modified.forEach(item => {
    if (item.changes.status) {
      const key = `${item.changes.status.from} → ${item.changes.status.to}`;
      statusProgression[key] = (statusProgression[key] || 0) + 1;
    }
  });
  
  if (Object.keys(statusProgression).length > 0) {
    md += `### Status Progressions\n`;
    Object.entries(statusProgression)
      .sort(([,a], [,b]) => b - a)
      .forEach(([progression, count]) => {
        md += `- ${progression}: ${count} entities\n`;
      });
    md += `\n`;
  }
  
  // Save summary
  await fs.writeFile(summaryPath, md);
  
  return { reportPath, summaryPath };
}

// Main execution
async function main() {
  const day1Path = process.argv[2];
  const day2Path = process.argv[3];
  
  if (!day1Path || !day2Path) {
    console.error('Usage: node track-daily-changes.js <day1.csv> <day2.csv>');
    console.error('\nExample:');
    console.error('  node track-daily-changes.js "../downloads/june3.csv" "../downloads/june5.csv"');
    process.exit(1);
  }
  
  try {
    await ensureDirectories();
    
    // Extract date labels from filenames
    const day1Label = path.basename(day1Path).replace('.csv', '').replace(/[^\w]/g, '_');
    const day2Label = path.basename(day2Path).replace('.csv', '').replace(/[^\w]/g, '_');
    
    console.log(`\n📊 Tracking Changes: ${day1Label} → ${day2Label}\n`);
    
    // Build entity maps for both days
    console.log(`1️⃣ Processing ${day1Label}...`);
    const day1Map = await buildEntityMap(day1Path, day1Label);
    console.log(`   ✅ Found ${day1Map.size} unique entities`);
    
    console.log(`\n2️⃣ Processing ${day2Label}...`);
    const day2Map = await buildEntityMap(day2Path, day2Label);
    console.log(`   ✅ Found ${day2Map.size} unique entities`);
    
    // Compare the maps
    console.log(`\n3️⃣ Comparing changes...`);
    const changes = compareEntityMaps(day1Map, day2Map, day1Label, day2Label);
    
    console.log(`\n📈 Change Summary:`);
    console.log(`   - New entities: ${changes.new.length}`);
    console.log(`   - Removed entities: ${changes.removed.length}`);
    console.log(`   - Modified entities: ${changes.modified.length}`);
    console.log(`   - Unchanged entities: ${changes.unchanged.length}`);
    console.log(`   - Duplicate warnings: ${changes.duplicates.length}`);
    
    // Generate reports
    console.log(`\n4️⃣ Generating reports...`);
    const { reportPath, summaryPath } = await generateChangeReport(changes, day1Label, day2Label);
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`📊 Detailed report: ${reportPath}`);
    console.log(`📄 Summary report: ${summaryPath}`);
    
    // Quick insights
    console.log(`\n💡 Quick Insights:`);
    if (changes.new.length > 0) {
      console.log(`   - ${changes.new.length} new ${changes.new.length === 1 ? 'entity' : 'entities'} appeared`);
    }
    if (changes.removed.length > 0) {
      console.log(`   - ${changes.removed.length} ${changes.removed.length === 1 ? 'entity' : 'entities'} disappeared`);
    }
    if (changes.modified.length > 0) {
      const statusChanges = changes.modified.filter(m => m.changes.status).length;
      if (statusChanges > 0) {
        console.log(`   - ${statusChanges} entities changed status`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error tracking changes:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { buildEntityMap, compareEntityMaps, generateChangeReport };