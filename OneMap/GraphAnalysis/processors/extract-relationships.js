#!/usr/bin/env node

/**
 * Relationship Extractor for OneMap CSV Data
 * 
 * Extracts graph relationships from CSV data during processing
 * Creates JSON files representing nodes and edges for graph analysis
 */

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse');
const { createReadStream } = require('fs');
const crypto = require('crypto');

// Output directories
const RELATIONSHIPS_DIR = path.join(__dirname, '../data/relationships');
const GRAPHS_DIR = path.join(__dirname, '../data/graphs');
const INDICES_DIR = path.join(__dirname, '../data/indices');

// Ensure output directories exist
async function ensureDirectories() {
  await fs.mkdir(RELATIONSHIPS_DIR, { recursive: true });
  await fs.mkdir(GRAPHS_DIR, { recursive: true });
  await fs.mkdir(INDICES_DIR, { recursive: true });
}

// Generate stable ID for entities
function generateId(type, value) {
  if (!value) return null;
  const normalized = value.toString().trim().toUpperCase();
  return `${type}_${crypto.createHash('md5').update(normalized).digest('hex').substring(0, 8)}`;
}

// Extract node from CSV row
function extractNodes(row, sourceFile) {
  const nodes = [];
  const timestamp = new Date().toISOString();
  
  // Extract Pole node
  if (row.pole_number && row.pole_number.trim()) {
    nodes.push({
      id: generateId('pole', row.pole_number),
      type: 'pole',
      attributes: {
        poleNumber: row.pole_number.trim(),
        project: row.project,
        contractor: row.contractor,
        status: row.status,
        timestamp,
        source: sourceFile
      },
      metadata: {
        firstSeen: timestamp,
        lastUpdated: timestamp,
        updateCount: 1
      }
    });
  }
  
  // Extract Drop node
  if (row.drop_number && row.drop_number.trim()) {
    nodes.push({
      id: generateId('drop', row.drop_number),
      type: 'drop',
      attributes: {
        dropNumber: row.drop_number.trim(),
        dropName: row.drop_name,
        timestamp,
        source: sourceFile
      },
      metadata: {
        firstSeen: timestamp,
        lastUpdated: timestamp,
        updateCount: 1
      }
    });
  }
  
  // Extract Address node
  if (row.address && row.address.trim()) {
    nodes.push({
      id: generateId('address', row.address),
      type: 'address',
      attributes: {
        address: row.address.trim(),
        area: row.area,
        timestamp,
        source: sourceFile
      },
      metadata: {
        firstSeen: timestamp,
        lastUpdated: timestamp,
        updateCount: 1
      }
    });
  }
  
  // Extract Property node
  if (row.property_id && row.property_id.trim()) {
    nodes.push({
      id: generateId('property', row.property_id),
      type: 'property',
      attributes: {
        propertyId: row.property_id.trim(),
        clientName: row.client_name,
        timestamp,
        source: sourceFile
      },
      metadata: {
        firstSeen: timestamp,
        lastUpdated: timestamp,
        updateCount: 1
      }
    });
  }
  
  return nodes;
}

// Extract edges (relationships) from CSV row
function extractEdges(row, sourceFile) {
  const edges = [];
  const timestamp = new Date().toISOString();
  
  // Pole serves Drop relationship
  if (row.pole_number && row.drop_number) {
    edges.push({
      id: generateId('edge', `${row.pole_number}-serves-${row.drop_number}`),
      type: 'serves',
      source: generateId('pole', row.pole_number),
      target: generateId('drop', row.drop_number),
      attributes: {
        createdDate: timestamp,
        confidence: 1.0,
        source: sourceFile
      }
    });
  }
  
  // Drop located at Address
  if (row.drop_number && row.address) {
    edges.push({
      id: generateId('edge', `${row.drop_number}-located_at-${row.address}`),
      type: 'located_at',
      source: generateId('drop', row.drop_number),
      target: generateId('address', row.address),
      attributes: {
        createdDate: timestamp,
        confidence: 0.95,
        source: sourceFile
      }
    });
  }
  
  // Property located at Address
  if (row.property_id && row.address) {
    edges.push({
      id: generateId('edge', `${row.property_id}-located_at-${row.address}`),
      type: 'located_at',
      source: generateId('property', row.property_id),
      target: generateId('address', row.address),
      attributes: {
        createdDate: timestamp,
        confidence: 0.95,
        source: sourceFile
      }
    });
  }
  
  // Drop assigned to Property
  if (row.drop_number && row.property_id) {
    edges.push({
      id: generateId('edge', `${row.drop_number}-assigned_to-${row.property_id}`),
      type: 'assigned_to',
      source: generateId('drop', row.drop_number),
      target: generateId('property', row.property_id),
      attributes: {
        createdDate: timestamp,
        confidence: 0.9,
        source: sourceFile
      }
    });
  }
  
  return edges;
}

// Process CSV file and extract relationships
async function processCSV(csvPath) {
  const sourceFile = path.basename(csvPath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionId = `import_${timestamp}`;
  
  const nodes = new Map(); // Use Map to handle duplicates
  const edges = new Map();
  
  let rowCount = 0;
  
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
        rowCount++;
        
        // Normalize column names
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
          normalizedRow[normalizedKey] = value;
        }
        
        // Extract nodes
        const rowNodes = extractNodes(normalizedRow, sourceFile);
        rowNodes.forEach(node => {
          // Merge with existing node if duplicate
          if (nodes.has(node.id)) {
            const existing = nodes.get(node.id);
            existing.metadata.updateCount++;
            existing.metadata.lastUpdated = node.metadata.lastUpdated;
            // Merge attributes, keeping most recent
            Object.assign(existing.attributes, node.attributes);
          } else {
            nodes.set(node.id, node);
          }
        });
        
        // Extract edges
        const rowEdges = extractEdges(normalizedRow, sourceFile);
        rowEdges.forEach(edge => {
          if (!edges.has(edge.id)) {
            edges.set(edge.id, edge);
          }
        });
      })
      .on('error', reject)
      .on('end', async () => {
        try {
          // Save relationships
          const relationshipData = {
            sessionId,
            sourceFile,
            timestamp,
            statistics: {
              rowsProcessed: rowCount,
              nodesExtracted: nodes.size,
              edgesExtracted: edges.size
            },
            nodes: Array.from(nodes.values()),
            edges: Array.from(edges.values())
          };
          
          // Save to file
          const outputPath = path.join(RELATIONSHIPS_DIR, `${sessionId}.json`);
          await fs.writeFile(
            outputPath,
            JSON.stringify(relationshipData, null, 2)
          );
          
          // Create indices for quick lookup
          const nodeIndex = {};
          const edgeIndex = {};
          
          // Index nodes by type
          nodes.forEach(node => {
            if (!nodeIndex[node.type]) {
              nodeIndex[node.type] = [];
            }
            nodeIndex[node.type].push({
              id: node.id,
              key: node.attributes.poleNumber || 
                   node.attributes.dropNumber || 
                   node.attributes.address || 
                   node.attributes.propertyId
            });
          });
          
          // Index edges by type
          edges.forEach(edge => {
            if (!edgeIndex[edge.type]) {
              edgeIndex[edge.type] = [];
            }
            edgeIndex[edge.type].push({
              id: edge.id,
              source: edge.source,
              target: edge.target
            });
          });
          
          // Save indices
          await fs.writeFile(
            path.join(INDICES_DIR, `${sessionId}_nodes.json`),
            JSON.stringify(nodeIndex, null, 2)
          );
          
          await fs.writeFile(
            path.join(INDICES_DIR, `${sessionId}_edges.json`),
            JSON.stringify(edgeIndex, null, 2)
          );
          
          resolve({
            sessionId,
            outputPath,
            statistics: relationshipData.statistics
          });
        } catch (error) {
          reject(error);
        }
      });
  });
}

// Main execution
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('Usage: node extract-relationships.js <csv-file-path>');
    process.exit(1);
  }
  
  try {
    await ensureDirectories();
    
    console.log(`Processing CSV: ${csvPath}`);
    const result = await processCSV(csvPath);
    
    console.log('\n✅ Relationship extraction complete!');
    console.log(`📊 Statistics:`);
    console.log(`   - Rows processed: ${result.statistics.rowsProcessed}`);
    console.log(`   - Nodes extracted: ${result.statistics.nodesExtracted}`);
    console.log(`   - Edges extracted: ${result.statistics.edgesExtracted}`);
    console.log(`📁 Output saved to: ${result.outputPath}`);
    console.log(`🔍 Session ID: ${result.sessionId}`);
    
  } catch (error) {
    console.error('❌ Error processing CSV:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processCSV, extractNodes, extractEdges };