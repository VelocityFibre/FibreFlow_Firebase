#!/usr/bin/env node

/**
 * Graph Builder for OneMap
 * 
 * Assembles relationship JSON files into a complete graph structure
 * Handles incremental updates and graph versioning
 */

const fs = require('fs').promises;
const path = require('path');

const RELATIONSHIPS_DIR = path.join(__dirname, '../data/relationships');
const GRAPHS_DIR = path.join(__dirname, '../data/graphs');

class GraphBuilder {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.metadata = {
      version: '1.0',
      created: new Date().toISOString(),
      sources: [],
      statistics: {}
    };
  }
  
  // Load existing graph if available
  async loadExistingGraph(graphId) {
    try {
      const graphPath = path.join(GRAPHS_DIR, `${graphId}.json`);
      const data = await fs.readFile(graphPath, 'utf8');
      const graph = JSON.parse(data);
      
      // Load nodes
      graph.nodes.forEach(node => {
        this.nodes.set(node.id, node);
      });
      
      // Load edges
      graph.edges.forEach(edge => {
        this.edges.set(edge.id, edge);
      });
      
      // Update metadata
      this.metadata = graph.metadata || this.metadata;
      this.metadata.version = (parseFloat(this.metadata.version) + 0.1).toFixed(1);
      
      console.log(`📊 Loaded existing graph: ${graphId}`);
      console.log(`   - Nodes: ${this.nodes.size}`);
      console.log(`   - Edges: ${this.edges.size}`);
      
      return true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      return false;
    }
  }
  
  // Merge relationship file into graph
  async mergeRelationshipFile(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    const relationships = JSON.parse(data);
    
    // Track source
    this.metadata.sources.push({
      file: path.basename(filePath),
      sessionId: relationships.sessionId,
      timestamp: relationships.timestamp,
      statistics: relationships.statistics
    });
    
    // Merge nodes
    relationships.nodes.forEach(node => {
      if (this.nodes.has(node.id)) {
        // Update existing node
        const existing = this.nodes.get(node.id);
        existing.metadata.lastUpdated = node.metadata.lastUpdated;
        existing.metadata.updateCount += node.metadata.updateCount;
        
        // Merge attributes, keeping history
        if (!existing.attributeHistory) {
          existing.attributeHistory = [];
        }
        existing.attributeHistory.push({
          timestamp: node.metadata.lastUpdated,
          attributes: { ...node.attributes }
        });
        
        // Update current attributes
        Object.assign(existing.attributes, node.attributes);
      } else {
        // Add new node
        this.nodes.set(node.id, node);
      }
    });
    
    // Merge edges
    relationships.edges.forEach(edge => {
      if (!this.edges.has(edge.id)) {
        this.edges.set(edge.id, edge);
      } else {
        // Update edge confidence if higher
        const existing = this.edges.get(edge.id);
        if (edge.attributes.confidence > existing.attributes.confidence) {
          existing.attributes.confidence = edge.attributes.confidence;
        }
        existing.attributes.lastConfirmed = edge.attributes.createdDate;
      }
    });
    
    console.log(`✅ Merged: ${path.basename(filePath)}`);
    console.log(`   - New/Updated nodes: ${relationships.nodes.length}`);
    console.log(`   - New/Updated edges: ${relationships.edges.length}`);
  }
  
  // Calculate graph statistics
  calculateStatistics() {
    const stats = {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.size,
      nodesByType: {},
      edgesByType: {},
      averageDegree: 0,
      components: 0,
      maxDropsPerPole: 0
    };
    
    // Count nodes by type
    this.nodes.forEach(node => {
      stats.nodesByType[node.type] = (stats.nodesByType[node.type] || 0) + 1;
    });
    
    // Count edges by type
    const adjacencyList = new Map();
    this.edges.forEach(edge => {
      stats.edgesByType[edge.type] = (stats.edgesByType[edge.type] || 0) + 1;
      
      // Build adjacency list
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, new Set());
      }
      if (!adjacencyList.has(edge.target)) {
        adjacencyList.set(edge.target, new Set());
      }
      adjacencyList.get(edge.source).add(edge.target);
      adjacencyList.get(edge.target).add(edge.source);
    });
    
    // Calculate average degree
    let totalDegree = 0;
    adjacencyList.forEach(neighbors => {
      totalDegree += neighbors.size;
    });
    stats.averageDegree = adjacencyList.size > 0 ? 
      (totalDegree / adjacencyList.size).toFixed(2) : 0;
    
    // Count connected components
    const visited = new Set();
    const dfs = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const neighbors = adjacencyList.get(nodeId) || new Set();
      neighbors.forEach(neighbor => dfs(neighbor));
    };
    
    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        stats.components++;
        dfs(node.id);
      }
    });
    
    // Calculate max drops per pole
    const poleDropCounts = new Map();
    this.edges.forEach(edge => {
      if (edge.type === 'serves') {
        const count = poleDropCounts.get(edge.source) || 0;
        poleDropCounts.set(edge.source, count + 1);
      }
    });
    
    stats.maxDropsPerPole = Math.max(...Array.from(poleDropCounts.values()), 0);
    
    // Find poles exceeding capacity
    stats.polesExceedingCapacity = [];
    poleDropCounts.forEach((count, poleId) => {
      if (count > 12) {
        const pole = this.nodes.get(poleId);
        stats.polesExceedingCapacity.push({
          poleId,
          poleNumber: pole?.attributes?.poleNumber || 'Unknown',
          dropCount: count
        });
      }
    });
    
    this.metadata.statistics = stats;
    return stats;
  }
  
  // Build complete graph
  async buildGraph(graphId = 'onemap_graph') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullGraphId = `${graphId}_${timestamp}`;
    
    // Calculate statistics
    const stats = this.calculateStatistics();
    
    // Create graph structure
    const graph = {
      graphId: fullGraphId,
      version: this.metadata.version,
      created: this.metadata.created,
      lastUpdated: new Date().toISOString(),
      metadata: this.metadata,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      statistics: stats
    };
    
    // Save graph
    const outputPath = path.join(GRAPHS_DIR, `${fullGraphId}.json`);
    await fs.writeFile(outputPath, JSON.stringify(graph, null, 2));
    
    // Save latest link
    const latestPath = path.join(GRAPHS_DIR, `${graphId}_latest.json`);
    await fs.writeFile(latestPath, JSON.stringify(graph, null, 2));
    
    return { fullGraphId, outputPath, statistics: stats };
  }
}

// Main execution
async function main() {
  const mode = process.argv[2] || 'incremental';
  const graphId = process.argv[3] || 'onemap_graph';
  
  try {
    const builder = new GraphBuilder();
    
    // Load existing graph for incremental mode
    if (mode === 'incremental') {
      await builder.loadExistingGraph(`${graphId}_latest`);
    }
    
    // Get all relationship files
    const files = await fs.readdir(RELATIONSHIPS_DIR);
    const jsonFiles = files
      .filter(f => f.endsWith('.json'))
      .sort(); // Process in order
    
    if (jsonFiles.length === 0) {
      console.log('⚠️  No relationship files found. Run extract-relationships.js first.');
      return;
    }
    
    console.log(`\n🔨 Building graph in ${mode} mode...`);
    console.log(`📁 Found ${jsonFiles.length} relationship files\n`);
    
    // Process each file
    for (const file of jsonFiles) {
      const filePath = path.join(RELATIONSHIPS_DIR, file);
      await builder.mergeRelationshipFile(filePath);
    }
    
    // Build and save graph
    console.log('\n📊 Calculating graph statistics...');
    const result = await builder.buildGraph(graphId);
    
    console.log('\n✅ Graph build complete!');
    console.log(`📈 Graph Statistics:`);
    console.log(`   - Total Nodes: ${result.statistics.totalNodes}`);
    console.log(`   - Total Edges: ${result.statistics.totalEdges}`);
    console.log(`   - Node Types:`, result.statistics.nodesByType);
    console.log(`   - Edge Types:`, result.statistics.edgesByType);
    console.log(`   - Connected Components: ${result.statistics.components}`);
    console.log(`   - Average Degree: ${result.statistics.averageDegree}`);
    console.log(`   - Max Drops per Pole: ${result.statistics.maxDropsPerPole}`);
    
    if (result.statistics.polesExceedingCapacity.length > 0) {
      console.log(`\n⚠️  WARNING: ${result.statistics.polesExceedingCapacity.length} poles exceed 12-drop capacity!`);
      result.statistics.polesExceedingCapacity.forEach(pole => {
        console.log(`   - ${pole.poleNumber}: ${pole.dropCount} drops`);
      });
    }
    
    console.log(`\n📁 Graph saved to: ${result.outputPath}`);
    console.log(`🔗 Latest link: ${graphId}_latest.json`);
    
  } catch (error) {
    console.error('❌ Error building graph:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { GraphBuilder };