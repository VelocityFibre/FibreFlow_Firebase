#!/usr/bin/env node

/**
 * Fetch complete Airtable schema using Metadata API
 * This script retrieves all tables and fields information
 * and generates a comprehensive schema documentation
 */

// Increase max listeners to prevent warnings with multiple requests
require('events').EventEmitter.defaultMaxListeners = 20;

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || 'YOUR_API_TOKEN';
const BASE_ID = 'appkYMgaK0cHVu4Zg';
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'AIRTABLE_COMPLETE_SCHEMA.md');

// API endpoints
const METADATA_BASE_URL = 'https://api.airtable.com/v0/meta/bases';

/**
 * Make HTTPS request to Airtable API
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Format field type information
 */
function formatFieldType(field) {
  let typeInfo = field.type;
  
  if (field.options) {
    switch (field.type) {
      case 'singleSelect':
      case 'multipleSelects':
        if (field.options.choices) {
          const choices = field.options.choices.map(c => c.name);
          typeInfo += `\nOptions: ${choices.join(', ')}`;
        }
        break;
      case 'linkedRecords':
        if (field.options.linkedTableId) {
          typeInfo += `\nLinked Table ID: ${field.options.linkedTableId}`;
        }
        break;
      case 'formula':
        if (field.options.formula) {
          typeInfo += `\nFormula: ${field.options.formula}`;
        }
        break;
      case 'rollup':
        if (field.options.fieldIdInLinkedTable && field.options.rollupFunction) {
          typeInfo += `\nRollup: ${field.options.rollupFunction}`;
        }
        break;
    }
  }
  
  return typeInfo;
}

/**
 * Generate markdown documentation for a table
 */
function generateTableMarkdown(table) {
  let markdown = `\n### ${table.name}\n`;
  markdown += `- **Table ID**: \`${table.id}\`\n`;
  markdown += `- **Description**: ${table.description || 'No description available'}\n`;
  markdown += `- **Primary Field ID**: \`${table.primaryFieldId}\`\n\n`;
  
  markdown += `#### Fields\n\n`;
  markdown += `| Field Name | Field ID | Type | Description | Details |\n`;
  markdown += `|------------|----------|------|-------------|---------|`;
  
  table.fields.forEach(field => {
    const fieldName = field.name.replace(/\|/g, '\\|');
    const description = (field.description || '').replace(/\|/g, '\\|');
    const typeInfo = formatFieldType(field).replace(/\n/g, '<br>');
    
    markdown += `\n| ${fieldName} | \`${field.id}\` | ${field.type} | ${description} | ${typeInfo} |`;
  });
  
  markdown += '\n';
  
  // Add views information if available
  if (table.views && table.views.length > 0) {
    markdown += `\n#### Views\n\n`;
    table.views.forEach(view => {
      markdown += `- **${view.name}** (\`${view.id}\`) - ${view.type}\n`;
    });
  }
  
  return markdown;
}

/**
 * Main function to fetch and document schema
 */
async function fetchAndDocumentSchema() {
  try {
    console.log('Fetching base schema...');
    
    // Fetch base information with tables
    const baseUrl = `${METADATA_BASE_URL}/${BASE_ID}/tables`;
    const baseData = await makeRequest(baseUrl);
    
    console.log(`Found ${baseData.tables.length} tables`);
    
    // Generate markdown documentation
    let markdown = `# Airtable Complete Schema Documentation\n\n`;
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += `## Base Information\n`;
    markdown += `- **Base ID**: \`${BASE_ID}\`\n`;
    markdown += `- **API Endpoint**: \`https://api.airtable.com/v0/${BASE_ID}\`\n\n`;
    
    markdown += `## Tables Overview\n\n`;
    markdown += `| Table Name | Table ID | Record Count | Field Count |\n`;
    markdown += `|------------|----------|--------------|-------------|`;
    
    // Sort tables alphabetically
    const sortedTables = baseData.tables.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedTables.forEach(table => {
      markdown += `\n| ${table.name} | \`${table.id}\` | - | ${table.fields.length} |`;
    });
    
    markdown += `\n\n## Detailed Table Schemas\n`;
    
    // Add detailed schema for each table
    sortedTables.forEach(table => {
      markdown += generateTableMarkdown(table);
    });
    
    // Add relationships section
    markdown += `\n## Table Relationships\n\n`;
    markdown += `### Relationship Map\n`;
    markdown += `\`\`\`mermaid\ngraph TD\n`;
    
    // Find all linked record relationships
    sortedTables.forEach(table => {
      table.fields.forEach(field => {
        if (field.type === 'linkedRecords' && field.options && field.options.linkedTableId) {
          const linkedTable = sortedTables.find(t => t.id === field.options.linkedTableId);
          if (linkedTable) {
            markdown += `    ${table.name} -->|${field.name}| ${linkedTable.name}\n`;
          }
        }
      });
    });
    
    markdown += `\`\`\`\n`;
    
    // Write to file
    await fs.writeFile(OUTPUT_FILE, markdown);
    console.log(`Schema documentation written to ${OUTPUT_FILE}`);
    
    // Also create a JSON version for programmatic use
    const jsonOutput = path.join(__dirname, '..', 'docs', 'airtable-schema.json');
    await fs.writeFile(jsonOutput, JSON.stringify(baseData, null, 2));
    console.log(`JSON schema written to ${jsonOutput}`);
    
  } catch (error) {
    console.error('Error fetching schema:', error);
    process.exit(1);
  }
}

// Check for API token
if (AIRTABLE_API_TOKEN === 'YOUR_API_TOKEN') {
  console.error('Please set AIRTABLE_API_TOKEN environment variable');
  console.error('Usage: AIRTABLE_API_TOKEN=your_token node fetch-airtable-schema.js');
  process.exit(1);
}

// Run the script
fetchAndDocumentSchema();