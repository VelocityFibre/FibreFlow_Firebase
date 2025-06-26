#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the fetched schema
const schemaPath = path.join(__dirname, '..', 'docs', 'airtable-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Process the schema and create comprehensive documentation
function generateComprehensiveSchema() {
  let markdown = `# Airtable Complete Schema Documentation\n\n`;
  markdown += `Generated on: ${new Date().toISOString()}\n\n`;
  markdown += `## Base Information\n`;
  markdown += `- **Base ID**: \`appkYMgaK0cHVu4Zg\`\n`;
  markdown += `- **Total Tables**: ${schema.tables.length}\n`;
  markdown += `- **Total Fields**: ${schema.tables.reduce((sum, table) => sum + table.fields.length, 0)}\n\n`;
  
  // Create table overview
  markdown += `## Tables Overview\n\n`;
  markdown += `| Table Name | Table ID | Field Count | Primary Field |\n`;
  markdown += `|------------|----------|-------------|---------------|\n`;
  
  schema.tables.forEach(table => {
    const primaryField = table.fields.find(f => f.id === table.primaryFieldId);
    markdown += `| ${table.name} | \`${table.id}\` | ${table.fields.length} | ${primaryField ? primaryField.name : 'N/A'} |\n`;
  });
  
  // Add detailed schemas for each table
  markdown += `\n## Detailed Table Schemas\n`;
  
  schema.tables.forEach(table => {
    markdown += `\n### ${table.name}\n`;
    markdown += `- **Table ID**: \`${table.id}\`\n`;
    markdown += `- **Primary Field**: ${table.fields.find(f => f.id === table.primaryFieldId)?.name || 'N/A'}\n`;
    if (table.description) {
      markdown += `- **Description**: ${table.description}\n`;
    }
    markdown += `\n#### Fields\n\n`;
    markdown += `| Field Name | Field ID | Type | Description |\n`;
    markdown += `|------------|----------|------|-------------|\n`;
    
    table.fields.forEach(field => {
      let typeInfo = field.type;
      
      // Add additional type information
      if (field.options) {
        if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
          if (field.options.choices) {
            const choices = field.options.choices.map(c => c.name).slice(0, 5).join(', ');
            typeInfo += ` (${choices}${field.options.choices.length > 5 ? '...' : ''})`;
          }
        } else if (field.type === 'multipleRecordLinks' && field.options.linkedTableId) {
          const linkedTable = schema.tables.find(t => t.id === field.options.linkedTableId);
          typeInfo += ` → ${linkedTable ? linkedTable.name : field.options.linkedTableId}`;
        }
      }
      
      markdown += `| ${field.name} | \`${field.id}\` | ${typeInfo} | ${field.description || ''} |\n`;
    });
    
    // Add views if available
    if (table.views && table.views.length > 0) {
      markdown += `\n#### Views\n\n`;
      table.views.forEach(view => {
        markdown += `- **${view.name}** (\`${view.id}\`) - ${view.type}\n`;
      });
    }
  });
  
  // Create relationship diagram
  markdown += `\n## Table Relationships\n\n`;
  markdown += `\`\`\`mermaid\ngraph TD\n`;
  
  const relationships = [];
  schema.tables.forEach(table => {
    table.fields.forEach(field => {
      if (field.type === 'multipleRecordLinks' && field.options && field.options.linkedTableId) {
        const linkedTable = schema.tables.find(t => t.id === field.options.linkedTableId);
        if (linkedTable) {
          relationships.push(`    ${table.name} -->|${field.name}| ${linkedTable.name}`);
        }
      }
    });
  });
  
  // Remove duplicates and add to markdown
  [...new Set(relationships)].forEach(rel => markdown += rel + '\n');
  
  markdown += `\`\`\`\n`;
  
  // Add migration-specific information
  markdown += `\n## Migration Priority Tables\n\n`;
  markdown += `### High Priority (Core Business Data)\n`;
  markdown += `1. **Customers** - Core client data\n`;
  markdown += `2. **Projects** - Project management\n`;
  markdown += `3. **Daily Tracker** - Progress tracking\n`;
  markdown += `4. **Staff** - Personnel management\n`;
  markdown += `5. **Contractors** - Contractor management\n\n`;
  
  markdown += `### Medium Priority (Supporting Data)\n`;
  markdown += `6. **SHEQ** - Safety and compliance\n`;
  markdown += `7. **Issues and Risks** - Risk management\n`;
  markdown += `8. **Contacts** - Contact management\n`;
  markdown += `9. **BOQ** - Bill of Quantities\n`;
  markdown += `10. **Task** - Task tracking\n\n`;
  
  markdown += `### Low Priority (Reference/Derived Data)\n`;
  markdown += `11. **Provinces** - Geographic reference\n`;
  markdown += `12. **Locations** - Location reference\n`;
  markdown += `13. **Weekly Reports** - Aggregated reports\n`;
  markdown += `14. **Meeting Summaries** - Meeting records\n\n`;
  
  return markdown;
}

// Generate and save the documentation
const documentation = generateComprehensiveSchema();
const outputPath = path.join(__dirname, '..', 'docs', 'AIRTABLE_COMPLETE_SCHEMA.md');
fs.writeFileSync(outputPath, documentation);

console.log(`✅ Schema documentation generated: ${outputPath}`);
console.log(`📊 Processed ${schema.tables.length} tables with ${schema.tables.reduce((sum, table) => sum + table.fields.length, 0)} total fields`);

// Also create a summary for the missing tables we identified
const criticalTables = ['Daily Tracker', 'Staff', 'Contractors', 'SHEQ', 'Issues and Risks'];
console.log('\n📋 Critical Tables Found:');
criticalTables.forEach(tableName => {
  const table = schema.tables.find(t => t.name === tableName);
  if (table) {
    console.log(`  ✅ ${tableName} - ${table.fields.length} fields`);
  } else {
    console.log(`  ❌ ${tableName} - NOT FOUND`);
  }
});