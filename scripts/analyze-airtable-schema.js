#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the schema
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'airtable-schema.json'), 'utf8'));

// Analyze relationships and field types
function analyzeSchema() {
  const analysis = {
    tables: {},
    relationships: [],
    fieldTypes: {},
    complexFields: []
  };

  // Process each table
  schema.tables.forEach(table => {
    analysis.tables[table.name] = {
      id: table.id,
      primaryField: table.fields.find(f => f.id === table.primaryFieldId)?.name,
      fieldCount: table.fields.length,
      fields: {},
      linkedTables: [],
      rollupFields: [],
      formulaFields: [],
      lookupFields: []
    };

    // Analyze each field
    table.fields.forEach(field => {
      // Track field types
      analysis.fieldTypes[field.type] = (analysis.fieldTypes[field.type] || 0) + 1;

      // Store field info
      analysis.tables[table.name].fields[field.name] = {
        id: field.id,
        type: field.type,
        options: field.options
      };

      // Track relationships
      if (field.type === 'multipleRecordLinks' && field.options?.linkedTableId) {
        const linkedTable = schema.tables.find(t => t.id === field.options.linkedTableId);
        if (linkedTable) {
          analysis.relationships.push({
            from: table.name,
            to: linkedTable.name,
            field: field.name,
            type: 'multipleRecordLinks'
          });
          analysis.tables[table.name].linkedTables.push({
            table: linkedTable.name,
            field: field.name
          });
        }
      }

      // Track complex fields
      if (field.type === 'rollup') {
        analysis.tables[table.name].rollupFields.push(field.name);
        analysis.complexFields.push({
          table: table.name,
          field: field.name,
          type: 'rollup'
        });
      } else if (field.type === 'formula') {
        analysis.tables[table.name].formulaFields.push(field.name);
        analysis.complexFields.push({
          table: table.name,
          field: field.name,
          type: 'formula',
          formula: field.options?.formula
        });
      } else if (field.type === 'multipleLookupValues') {
        analysis.tables[table.name].lookupFields.push(field.name);
      }
    });
  });

  return analysis;
}

// Generate migration insights
function generateMigrationInsights(analysis) {
  const insights = {
    migrationOrder: [],
    challenges: [],
    transformationNeeds: []
  };

  // Determine migration order based on dependencies
  const tableNames = Object.keys(analysis.tables);
  const dependencies = {};
  
  tableNames.forEach(table => {
    dependencies[table] = analysis.tables[table].linkedTables.map(lt => lt.table);
  });

  // Simple topological sort for migration order
  const visited = new Set();
  const migrationOrder = [];
  
  function visit(table) {
    if (visited.has(table)) return;
    visited.add(table);
    
    // Visit dependencies first
    const deps = dependencies[table] || [];
    deps.forEach(dep => {
      if (tableNames.includes(dep) && !visited.has(dep)) {
        visit(dep);
      }
    });
    
    migrationOrder.push(table);
  }
  
  // Start with tables that have no dependencies
  tableNames.forEach(table => {
    if (!dependencies[table] || dependencies[table].length === 0) {
      visit(table);
    }
  });
  
  // Add remaining tables
  tableNames.forEach(table => visit(table));
  
  insights.migrationOrder = migrationOrder;

  // Identify challenges
  if (analysis.complexFields.filter(f => f.type === 'rollup').length > 0) {
    insights.challenges.push('Rollup fields need to be recalculated in Firebase');
  }
  if (analysis.complexFields.filter(f => f.type === 'formula').length > 0) {
    insights.challenges.push('Formula fields need to be implemented as Cloud Functions');
  }

  return insights;
}

// Generate report
const analysis = analyzeSchema();
const insights = generateMigrationInsights(analysis);

// Create detailed report
let report = `# Airtable Schema Analysis Report\n\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;

report += `## Summary\n`;
report += `- Total Tables: ${Object.keys(analysis.tables).length}\n`;
report += `- Total Relationships: ${analysis.relationships.length}\n`;
report += `- Complex Fields: ${analysis.complexFields.length}\n\n`;

report += `## Field Type Distribution\n`;
Object.entries(analysis.fieldTypes).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  report += `- ${type}: ${count}\n`;
});

report += `\n## Table Dependencies\n`;
report += `\`\`\`mermaid\ngraph TD\n`;
analysis.relationships.forEach(rel => {
  report += `    ${rel.from} -->|${rel.field}| ${rel.to}\n`;
});
report += `\`\`\`\n`;

report += `\n## Migration Order\n`;
insights.migrationOrder.forEach((table, index) => {
  const tableInfo = analysis.tables[table];
  report += `${index + 1}. **${table}** (${tableInfo.fieldCount} fields)\n`;
});

report += `\n## Key Tables Analysis\n`;

// Analyze key tables
['Customers', 'Projects', 'Daily Tracker', 'Staff', 'Contractors'].forEach(tableName => {
  const table = analysis.tables[tableName];
  if (table) {
    report += `\n### ${tableName}\n`;
    report += `- Primary Field: ${table.primaryField}\n`;
    report += `- Total Fields: ${table.fieldCount}\n`;
    report += `- Linked Tables: ${table.linkedTables.map(lt => lt.table).join(', ') || 'None'}\n`;
    report += `- Rollup Fields: ${table.rollupFields.length}\n`;
    report += `- Formula Fields: ${table.formulaFields.length}\n`;
  }
});

report += `\n## Migration Challenges\n`;
insights.challenges.forEach(challenge => {
  report += `- ${challenge}\n`;
});

report += `\n## Complex Fields Requiring Transformation\n`;
analysis.complexFields.slice(0, 20).forEach(field => {
  report += `- ${field.table}.${field.field} (${field.type})\n`;
});

// Save report
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'AIRTABLE_SCHEMA_ANALYSIS.md'), report);
console.log('✅ Schema analysis complete: docs/AIRTABLE_SCHEMA_ANALYSIS.md');

// Also save JSON analysis
fs.writeFileSync(
  path.join(__dirname, '..', 'docs', 'airtable-schema-analysis.json'),
  JSON.stringify({ analysis, insights }, null, 2)
);
console.log('✅ JSON analysis saved: docs/airtable-schema-analysis.json');