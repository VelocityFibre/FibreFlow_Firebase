#!/usr/bin/env node

/**
 * Duplicate Finder using Graph Analysis
 * 
 * Uses relationship patterns to identify duplicate entities
 * that simple string matching might miss
 */

const fs = require('fs').promises;
const path = require('path');

const GRAPHS_DIR = path.join(__dirname, '../data/graphs');
const REPORTS_DIR = path.join(__dirname, '../reports');

class DuplicateFinder {
  constructor(graph) {
    this.graph = graph;
    this.nodes = new Map(graph.nodes.map(n => [n.id, n]));
    this.edges = new Map(graph.edges.map(e => [e.id, e]));
    this.duplicates = {
      poles: [],
      drops: [],
      addresses: [],
      properties: []
    };
  }
  
  // Build adjacency lists for graph traversal
  buildAdjacencyLists() {
    this.adjacencyOut = new Map();
    this.adjacencyIn = new Map();
    
    this.edges.forEach(edge => {
      // Outgoing edges
      if (!this.adjacencyOut.has(edge.source)) {
        this.adjacencyOut.set(edge.source, []);
      }
      this.adjacencyOut.get(edge.source).push({
        target: edge.target,
        type: edge.type,
        edge
      });
      
      // Incoming edges
      if (!this.adjacencyIn.has(edge.target)) {
        this.adjacencyIn.set(edge.target, []);
      }
      this.adjacencyIn.get(edge.target).push({
        source: edge.source,
        type: edge.type,
        edge
      });
    });
  }
  
  // Get connected nodes of specific type
  getConnectedNodes(nodeId, edgeType, direction = 'out') {
    const adjacency = direction === 'out' ? this.adjacencyOut : this.adjacencyIn;
    const connections = adjacency.get(nodeId) || [];
    
    return connections
      .filter(conn => conn.type === edgeType)
      .map(conn => direction === 'out' ? conn.target : conn.source)
      .map(id => this.nodes.get(id))
      .filter(node => node);
  }
  
  // Calculate similarity between two nodes based on connections
  calculateSimilarity(node1, node2) {
    if (node1.type !== node2.type) return 0;
    
    let score = 0;
    
    // Direct attribute matching
    const attrs1 = node1.attributes;
    const attrs2 = node2.attributes;
    
    switch (node1.type) {
      case 'pole':
        if (attrs1.poleNumber === attrs2.poleNumber) score += 1.0;
        if (attrs1.project === attrs2.project) score += 0.3;
        if (attrs1.contractor === attrs2.contractor) score += 0.2;
        break;
        
      case 'drop':
        if (attrs1.dropNumber === attrs2.dropNumber) score += 1.0;
        if (attrs1.dropName === attrs2.dropName) score += 0.3;
        break;
        
      case 'address':
        if (attrs1.address === attrs2.address) score += 1.0;
        if (attrs1.area === attrs2.area) score += 0.3;
        break;
        
      case 'property':
        if (attrs1.propertyId === attrs2.propertyId) score += 1.0;
        if (attrs1.clientName === attrs2.clientName) score += 0.3;
        break;
    }
    
    // Connection-based similarity
    const connections1 = new Set();
    const connections2 = new Set();
    
    // Get all connected nodes
    ['serves', 'located_at', 'assigned_to'].forEach(edgeType => {
      this.getConnectedNodes(node1.id, edgeType).forEach(n => {
        connections1.add(`${edgeType}:${n.id}`);
      });
      this.getConnectedNodes(node2.id, edgeType).forEach(n => {
        connections2.add(`${edgeType}:${n.id}`);
      });
      
      // Also check incoming connections
      this.getConnectedNodes(node1.id, edgeType, 'in').forEach(n => {
        connections1.add(`${edgeType}_from:${n.id}`);
      });
      this.getConnectedNodes(node2.id, edgeType, 'in').forEach(n => {
        connections2.add(`${edgeType}_from:${n.id}`);
      });
    });
    
    // Calculate Jaccard similarity of connections
    const intersection = new Set([...connections1].filter(x => connections2.has(x)));
    const union = new Set([...connections1, ...connections2]);
    
    if (union.size > 0) {
      const jaccardScore = intersection.size / union.size;
      score += jaccardScore * 0.5; // Weight connection similarity
    }
    
    return score;
  }
  
  // Find duplicates by type
  findDuplicatesByType(nodeType) {
    const nodesByType = Array.from(this.nodes.values())
      .filter(n => n.type === nodeType);
    
    const duplicateGroups = [];
    const processed = new Set();
    
    nodesByType.forEach((node1, i) => {
      if (processed.has(node1.id)) return;
      
      const group = {
        type: nodeType,
        nodes: [node1],
        confidence: 1.0,
        reasons: []
      };
      
      nodesByType.slice(i + 1).forEach(node2 => {
        if (processed.has(node2.id)) return;
        
        const similarity = this.calculateSimilarity(node1, node2);
        
        if (similarity >= 0.7) { // Threshold for considering as duplicate
          group.nodes.push(node2);
          processed.add(node2.id);
          
          // Add reasons for duplicate detection
          if (node1.attributes[this.getKeyAttribute(nodeType)] === 
              node2.attributes[this.getKeyAttribute(nodeType)]) {
            group.reasons.push('Exact key match');
          }
          
          // Check shared connections
          const sharedDrops = this.findSharedConnections(node1, node2, 'serves');
          if (sharedDrops.length > 0) {
            group.reasons.push(`Share ${sharedDrops.length} drops`);
          }
          
          const sharedAddresses = this.findSharedConnections(node1, node2, 'located_at');
          if (sharedAddresses.length > 0) {
            group.reasons.push(`Share ${sharedAddresses.length} addresses`);
          }
        }
      });
      
      if (group.nodes.length > 1) {
        processed.add(node1.id);
        duplicateGroups.push(group);
      }
    });
    
    return duplicateGroups;
  }
  
  // Find shared connections between two nodes
  findSharedConnections(node1, node2, edgeType) {
    const connections1 = new Set(
      this.getConnectedNodes(node1.id, edgeType).map(n => n.id)
    );
    const connections2 = new Set(
      this.getConnectedNodes(node2.id, edgeType).map(n => n.id)
    );
    
    return [...connections1].filter(id => connections2.has(id));
  }
  
  // Get key attribute for node type
  getKeyAttribute(nodeType) {
    const keyMap = {
      'pole': 'poleNumber',
      'drop': 'dropNumber',
      'address': 'address',
      'property': 'propertyId'
    };
    return keyMap[nodeType];
  }
  
  // Find all duplicates
  findAllDuplicates() {
    console.log('🔍 Searching for duplicates using graph analysis...\n');
    
    ['pole', 'drop', 'address', 'property'].forEach(nodeType => {
      const duplicates = this.findDuplicatesByType(nodeType);
      this.duplicates[`${nodeType}s`] = duplicates;
      
      console.log(`📊 ${nodeType.toUpperCase()} duplicates: ${duplicates.length} groups`);
      
      duplicates.slice(0, 5).forEach((group, i) => {
        console.log(`   Group ${i + 1}: ${group.nodes.length} duplicates`);
        group.nodes.forEach(node => {
          const key = node.attributes[this.getKeyAttribute(nodeType)];
          console.log(`     - ${key} (${node.metadata.updateCount} updates)`);
        });
        console.log(`     Reasons: ${group.reasons.join(', ')}`);
      });
      
      if (duplicates.length > 5) {
        console.log(`   ... and ${duplicates.length - 5} more groups`);
      }
      console.log('');
    });
    
    return this.duplicates;
  }
  
  // Generate detailed report
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORTS_DIR, `duplicate_analysis_${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      graphId: this.graph.graphId,
      summary: {
        totalNodes: this.graph.nodes.length,
        totalEdges: this.graph.edges.length,
        duplicateGroups: {
          poles: this.duplicates.poles.length,
          drops: this.duplicates.drops.length,
          addresses: this.duplicates.addresses.length,
          properties: this.duplicates.properties.length
        },
        totalDuplicateNodes: 0
      },
      duplicates: this.duplicates,
      recommendations: []
    };
    
    // Calculate total duplicate nodes
    Object.values(this.duplicates).forEach(typeGroups => {
      typeGroups.forEach(group => {
        report.summary.totalDuplicateNodes += group.nodes.length - 1; // -1 for the original
      });
    });
    
    // Add recommendations
    if (this.duplicates.poles.length > 0) {
      report.recommendations.push({
        type: 'pole',
        action: 'merge',
        description: 'Merge duplicate pole records, keeping earliest entry and consolidating drops'
      });
    }
    
    // Find poles with too many drops
    const overloadedPoles = [];
    this.nodes.forEach(node => {
      if (node.type === 'pole') {
        const drops = this.getConnectedNodes(node.id, 'serves');
        if (drops.length > 12) {
          overloadedPoles.push({
            poleNumber: node.attributes.poleNumber,
            dropCount: drops.length,
            drops: drops.map(d => d.attributes.dropNumber)
          });
        }
      }
    });
    
    if (overloadedPoles.length > 0) {
      report.violations = {
        polesExceedingCapacity: overloadedPoles
      };
      report.recommendations.push({
        type: 'capacity',
        action: 'redistribute',
        description: `${overloadedPoles.length} poles exceed 12-drop limit. Redistribute drops to nearby poles.`
      });
    }
    
    // Save report
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summaryPath = path.join(REPORTS_DIR, `duplicate_summary_${timestamp}.md`);
    const summary = this.generateMarkdownSummary(report);
    await fs.writeFile(summaryPath, summary);
    
    return { reportPath, summaryPath };
  }
  
  // Generate markdown summary
  generateMarkdownSummary(report) {
    let md = `# Duplicate Analysis Report\n\n`;
    md += `Generated: ${report.timestamp}\n`;
    md += `Graph ID: ${report.graphId}\n\n`;
    
    md += `## Summary\n\n`;
    md += `- Total Nodes: ${report.summary.totalNodes}\n`;
    md += `- Total Edges: ${report.summary.totalEdges}\n`;
    md += `- Duplicate Groups Found:\n`;
    md += `  - Poles: ${report.summary.duplicateGroups.poles}\n`;
    md += `  - Drops: ${report.summary.duplicateGroups.drops}\n`;
    md += `  - Addresses: ${report.summary.duplicateGroups.addresses}\n`;
    md += `  - Properties: ${report.summary.duplicateGroups.properties}\n`;
    md += `- Total Duplicate Nodes: ${report.summary.totalDuplicateNodes}\n\n`;
    
    if (report.violations) {
      md += `## ⚠️ Violations\n\n`;
      if (report.violations.polesExceedingCapacity) {
        md += `### Poles Exceeding 12-Drop Capacity\n\n`;
        report.violations.polesExceedingCapacity.forEach(pole => {
          md += `- **${pole.poleNumber}**: ${pole.dropCount} drops\n`;
        });
        md += `\n`;
      }
    }
    
    md += `## Recommendations\n\n`;
    report.recommendations.forEach(rec => {
      md += `- **${rec.type}**: ${rec.description}\n`;
    });
    
    md += `\n## Duplicate Details\n\n`;
    
    ['poles', 'drops', 'addresses', 'properties'].forEach(type => {
      const groups = report.duplicates[type];
      if (groups.length > 0) {
        md += `### ${type.charAt(0).toUpperCase() + type.slice(1)}\n\n`;
        groups.slice(0, 10).forEach((group, i) => {
          md += `**Group ${i + 1}** (${group.nodes.length} duplicates)\n`;
          md += `Reasons: ${group.reasons.join(', ')}\n`;
          md += `Nodes:\n`;
          group.nodes.forEach(node => {
            const keyAttr = this.getKeyAttribute(node.type);
            md += `- ${node.attributes[keyAttr]} (${node.metadata.updateCount} updates)\n`;
          });
          md += `\n`;
        });
        
        if (groups.length > 10) {
          md += `*... and ${groups.length - 10} more groups*\n\n`;
        }
      }
    });
    
    return md;
  }
}

// Main execution
async function main() {
  const graphFile = process.argv[2] || 'onemap_graph_latest.json';
  
  try {
    // Load graph
    console.log(`📂 Loading graph: ${graphFile}`);
    const graphPath = path.join(GRAPHS_DIR, graphFile);
    const graphData = await fs.readFile(graphPath, 'utf8');
    const graph = JSON.parse(graphData);
    
    console.log(`✅ Graph loaded: ${graph.nodes.length} nodes, ${graph.edges.length} edges\n`);
    
    // Find duplicates
    const finder = new DuplicateFinder(graph);
    finder.buildAdjacencyLists();
    finder.findAllDuplicates();
    
    // Generate report
    console.log('📝 Generating report...');
    const { reportPath, summaryPath } = await finder.generateReport();
    
    console.log('\n✅ Analysis complete!');
    console.log(`📊 Detailed report: ${reportPath}`);
    console.log(`📄 Summary report: ${summaryPath}`);
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DuplicateFinder };