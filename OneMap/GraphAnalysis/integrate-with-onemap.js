#!/usr/bin/env node

/**
 * Integration Example: Adding Graph Analysis to OneMap Processing
 * 
 * Shows how to enhance existing CSV processing with graph capabilities
 */

const { processCSV } = require('./processors/extract-relationships');
const { GraphBuilder } = require('./processors/build-graph');
const { DuplicateFinder } = require('./analyzers/find-duplicates');

/**
 * Enhanced OneMap processor with graph analysis
 */
class EnhancedOneMapProcessor {
  constructor() {
    this.graphBuilder = new GraphBuilder();
  }
  
  /**
   * Process CSV with graph analysis
   */
  async processWithGraphAnalysis(csvPath, options = {}) {
    console.log('🚀 Enhanced OneMap Processing with Graph Analysis\n');
    
    try {
      // Step 1: Regular CSV processing (your existing logic)
      console.log('1️⃣ Processing CSV data...');
      // Your existing CSV processing logic here
      // const records = await yourExistingCsvProcessor(csvPath);
      
      // Step 2: Extract relationships for graph
      console.log('2️⃣ Extracting relationships...');
      const relationships = await processCSV(csvPath);
      console.log(`   ✅ Extracted ${relationships.statistics.nodesExtracted} nodes, ${relationships.statistics.edgesExtracted} edges`);
      
      // Step 3: Build/update graph
      console.log('\n3️⃣ Building graph...');
      if (options.incremental) {
        await this.graphBuilder.loadExistingGraph('onemap_graph_latest');
      }
      await this.graphBuilder.mergeRelationshipFile(relationships.outputPath);
      const graph = await this.graphBuilder.buildGraph();
      console.log(`   ✅ Graph built with ${graph.statistics.totalNodes} nodes`);
      
      // Step 4: Run duplicate analysis
      console.log('\n4️⃣ Analyzing duplicates...');
      const graphData = require(graph.outputPath);
      const duplicateFinder = new DuplicateFinder(graphData);
      duplicateFinder.buildAdjacencyLists();
      const duplicates = duplicateFinder.findAllDuplicates();
      
      // Step 5: Validate data integrity
      console.log('\n5️⃣ Validating data integrity...');
      const validationResults = this.validateDataIntegrity(graphData);
      
      // Step 6: Generate enhanced reports
      console.log('\n6️⃣ Generating enhanced reports...');
      const report = await this.generateEnhancedReport({
        csvStats: relationships.statistics,
        graphStats: graph.statistics,
        duplicates,
        validationResults
      });
      
      return {
        success: true,
        csvPath,
        statistics: {
          ...relationships.statistics,
          ...graph.statistics,
          duplicatesFound: Object.values(duplicates).reduce((sum, groups) => sum + groups.length, 0),
          validationIssues: validationResults.issues.length
        },
        reportPath: report.path
      };
      
    } catch (error) {
      console.error('❌ Error in enhanced processing:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate data integrity using graph
   */
  validateDataIntegrity(graph) {
    const issues = [];
    const nodes = new Map(graph.nodes.map(n => [n.id, n]));
    const edges = new Map(graph.edges.map(e => [e.id, e]));
    
    // Check pole capacity (max 12 drops)
    const poleDropCounts = new Map();
    edges.forEach(edge => {
      if (edge.type === 'serves') {
        const count = poleDropCounts.get(edge.source) || 0;
        poleDropCounts.set(edge.source, count + 1);
      }
    });
    
    poleDropCounts.forEach((count, poleId) => {
      if (count > 12) {
        const pole = nodes.get(poleId);
        issues.push({
          type: 'capacity_exceeded',
          severity: 'high',
          entity: pole?.attributes?.poleNumber || poleId,
          message: `Pole has ${count} drops (max 12 allowed)`
        });
      }
    });
    
    // Check orphaned drops (no pole assignment)
    const dropsWithPoles = new Set();
    edges.forEach(edge => {
      if (edge.type === 'serves') {
        dropsWithPoles.add(edge.target);
      }
    });
    
    nodes.forEach(node => {
      if (node.type === 'drop' && !dropsWithPoles.has(node.id)) {
        issues.push({
          type: 'orphaned_drop',
          severity: 'medium',
          entity: node.attributes.dropNumber,
          message: 'Drop has no pole assignment'
        });
      }
    });
    
    return {
      valid: issues.length === 0,
      issues,
      summary: {
        totalPoles: Array.from(nodes.values()).filter(n => n.type === 'pole').length,
        totalDrops: Array.from(nodes.values()).filter(n => n.type === 'drop').length,
        maxDropsPerPole: Math.max(...Array.from(poleDropCounts.values()), 0),
        orphanedDrops: issues.filter(i => i.type === 'orphaned_drop').length
      }
    };
  }
  
  /**
   * Generate enhanced report with graph insights
   */
  async generateEnhancedReport(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./reports/enhanced_report_${timestamp}.json`;
    
    const report = {
      timestamp: new Date().toISOString(),
      csvProcessing: data.csvStats,
      graphAnalysis: data.graphStats,
      duplicateAnalysis: {
        summary: Object.entries(data.duplicates).map(([type, groups]) => ({
          type,
          groupsFound: groups.length,
          totalDuplicates: groups.reduce((sum, g) => sum + g.nodes.length - 1, 0)
        }))
      },
      dataIntegrity: data.validationResults,
      insights: this.generateInsights(data)
    };
    
    // Save report (simplified for example)
    console.log(`\n📊 Report Summary:`);
    console.log(`   - Nodes processed: ${data.graphStats.totalNodes}`);
    console.log(`   - Relationships found: ${data.graphStats.totalEdges}`);
    console.log(`   - Duplicate groups: ${report.duplicateAnalysis.summary.reduce((sum, t) => sum + t.groupsFound, 0)}`);
    console.log(`   - Data integrity issues: ${data.validationResults.issues.length}`);
    
    return { path: reportPath, report };
  }
  
  /**
   * Generate actionable insights from graph analysis
   */
  generateInsights(data) {
    const insights = [];
    
    // Duplicate insights
    const totalDuplicates = Object.values(data.duplicates)
      .reduce((sum, groups) => sum + groups.length, 0);
    
    if (totalDuplicates > 0) {
      insights.push({
        type: 'duplicates',
        priority: 'high',
        message: `Found ${totalDuplicates} duplicate groups. Merging these could improve data quality.`,
        action: 'Review and merge duplicate records'
      });
    }
    
    // Capacity insights
    const capacityIssues = data.validationResults.issues
      .filter(i => i.type === 'capacity_exceeded');
    
    if (capacityIssues.length > 0) {
      insights.push({
        type: 'capacity',
        priority: 'high',
        message: `${capacityIssues.length} poles exceed 12-drop limit`,
        action: 'Redistribute drops to nearby poles or install additional poles'
      });
    }
    
    // Orphaned drops
    const orphanedDrops = data.validationResults.issues
      .filter(i => i.type === 'orphaned_drop');
    
    if (orphanedDrops.length > 0) {
      insights.push({
        type: 'orphaned',
        priority: 'medium',
        message: `${orphanedDrops.length} drops have no pole assignment`,
        action: 'Assign drops to appropriate poles'
      });
    }
    
    return insights;
  }
}

// Example usage
async function example() {
  const processor = new EnhancedOneMapProcessor();
  
  // Process new CSV with graph analysis
  const result = await processor.processWithGraphAnalysis(
    './downloads/sample.csv',
    { incremental: true } // Build on existing graph
  );
  
  if (result.success) {
    console.log('\n✅ Enhanced processing complete!');
    console.log(`📊 Full report: ${result.reportPath}`);
  }
}

// Export for use in existing OneMap scripts
module.exports = {
  EnhancedOneMapProcessor,
  
  // Convenience functions for gradual integration
  async extractRelationships(csvPath) {
    return processCSV(csvPath);
  },
  
  async findDuplicatesInCSV(csvPath) {
    const relationships = await processCSV(csvPath);
    const builder = new GraphBuilder();
    await builder.mergeRelationshipFile(relationships.outputPath);
    const graph = await builder.buildGraph();
    
    const graphData = require(graph.outputPath);
    const finder = new DuplicateFinder(graphData);
    finder.buildAdjacencyLists();
    return finder.findAllDuplicates();
  }
};

// Run example if called directly
if (require.main === module) {
  console.log('📚 Integration Example: Graph Analysis + OneMap\n');
  console.log('This shows how to add graph analysis to your existing CSV processing.\n');
  console.log('Usage:');
  console.log('  const { EnhancedOneMapProcessor } = require("./integrate-with-onemap");');
  console.log('  const processor = new EnhancedOneMapProcessor();');
  console.log('  await processor.processWithGraphAnalysis("your.csv");\n');
  
  // Uncomment to run example:
  // example();
}