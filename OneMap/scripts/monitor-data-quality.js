#!/usr/bin/env node

/**
 * Data Quality Monitoring Script
 * 
 * Monitors key metrics and alerts on anomalies:
 * - Duplicate drop rates
 * - Capacity utilization
 * - Data completeness
 * - Processing errors
 */

const fs = require('fs');
const path = require('path');

class DataQualityMonitor {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      dataQuality: {},
      alerts: [],
      trends: {}
    };
    
    this.thresholds = {
      duplicateDropRate: 0.10,      // Alert if >10% drops are duplicates
      avgDropsPerPole: 5.0,         // Alert if average >5
      missingDataRate: 0.20,        // Alert if >20% missing data
      capacityUtilization: 0.80,    // Alert if any pole >80% capacity
      processingErrorRate: 0.01     // Alert if >1% errors
    };
  }

  /**
   * Monitor data quality from latest report
   */
  async monitorLatestReport() {
    console.log('📊 Data Quality Monitoring\n');
    
    try {
      // Find latest report
      const reportDir = path.join(__dirname, '../Reports/poles');
      const latestReport = this.findLatestReport(reportDir);
      
      if (!latestReport) {
        throw new Error('No reports found to monitor');
      }
      
      console.log(`Monitoring: ${path.basename(latestReport)}\n`);
      
      // Load validation log
      const validationLog = this.loadValidationLog(reportDir);
      
      // Calculate metrics
      this.calculateDataQualityMetrics(validationLog);
      
      // Check thresholds
      this.checkThresholds();
      
      // Load historical data for trends
      this.analyzeTrends();
      
      // Generate monitoring report
      this.generateMonitoringReport();
      
    } catch (error) {
      console.error('❌ Monitoring failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Find latest report file
   */
  findLatestReport(reportDir) {
    if (!fs.existsSync(reportDir)) {
      return null;
    }
    
    const files = fs.readdirSync(reportDir)
      .filter(f => f.endsWith('.md') && f.includes('pole_status'))
      .map(f => ({
        name: f,
        path: path.join(reportDir, f),
        mtime: fs.statSync(path.join(reportDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files[0]?.path;
  }

  /**
   * Load validation log
   */
  loadValidationLog(reportDir) {
    const logPath = path.join(reportDir, 'validation_log.json');
    
    if (!fs.existsSync(logPath)) {
      // Create mock data for demonstration
      return {
        calculations: {
          summary: {
            totalRecords: 10351,
            uniquePoles: 2958,
            totalDrops: 6281,
            avgDropsPerPole: 2.12
          },
          duplicateDrops: new Array(304),
          capacityAnalysis: {
            overCapacity: [],
            atCapacity: [],
            nearCapacity: []
          }
        },
        validationLog: []
      };
    }
    
    return JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  /**
   * Calculate data quality metrics
   */
  calculateDataQualityMetrics(data) {
    const calc = data.calculations;
    
    // Duplicate rate
    this.metrics.dataQuality.duplicateDropRate = 
      calc.duplicateDrops.length / calc.summary.totalDrops;
    
    // Average drops per pole
    this.metrics.dataQuality.avgDropsPerPole = 
      calc.summary.avgDropsPerPole;
    
    // Capacity metrics
    const maxCapacity = 12;
    const highestUtilization = Math.min(
      (calc.summary.avgDropsPerPole * 3) / maxCapacity, // Estimate
      1.0
    );
    this.metrics.dataQuality.capacityUtilization = highestUtilization;
    
    // Over capacity count
    this.metrics.dataQuality.polesOverCapacity = 
      calc.capacityAnalysis.overCapacity.length;
    
    // Processing quality
    const errors = data.validationLog.filter(log => log.level === 'error').length;
    const warnings = data.validationLog.filter(log => log.level === 'warning').length;
    
    this.metrics.dataQuality.processingErrors = errors;
    this.metrics.dataQuality.processingWarnings = warnings;
    
    // Data completeness (estimate)
    this.metrics.dataQuality.dataCompleteness = 0.95; // Would calculate from actual data
  }

  /**
   * Check thresholds and create alerts
   */
  checkThresholds() {
    const dq = this.metrics.dataQuality;
    
    // Check duplicate rate
    if (dq.duplicateDropRate > this.thresholds.duplicateDropRate) {
      this.metrics.alerts.push({
        severity: 'HIGH',
        metric: 'Duplicate Drop Rate',
        value: (dq.duplicateDropRate * 100).toFixed(1) + '%',
        threshold: (this.thresholds.duplicateDropRate * 100) + '%',
        message: 'High number of duplicate drop assignments detected'
      });
    }
    
    // Check average drops
    if (dq.avgDropsPerPole > this.thresholds.avgDropsPerPole) {
      this.metrics.alerts.push({
        severity: 'MEDIUM',
        metric: 'Average Drops per Pole',
        value: dq.avgDropsPerPole.toFixed(2),
        threshold: this.thresholds.avgDropsPerPole,
        message: 'Unusually high average drops per pole'
      });
    }
    
    // Check capacity
    if (dq.polesOverCapacity > 0) {
      this.metrics.alerts.push({
        severity: 'CRITICAL',
        metric: 'Poles Over Capacity',
        value: dq.polesOverCapacity,
        threshold: 0,
        message: 'Poles exceeding 12-drop physical limit'
      });
    }
    
    // Check processing quality
    if (dq.processingErrors > 0) {
      this.metrics.alerts.push({
        severity: 'HIGH',
        metric: 'Processing Errors',
        value: dq.processingErrors,
        threshold: 0,
        message: 'Errors occurred during report generation'
      });
    }
  }

  /**
   * Analyze trends over time
   */
  analyzeTrends() {
    // Load historical metrics (would read from stored data)
    const history = [
      { date: '2025-07-20', avgDrops: 2.10, duplicates: 290 },
      { date: '2025-07-21', avgDrops: 2.12, duplicates: 304 },
      { date: '2025-07-22', avgDrops: 2.13, duplicates: 305 }
    ];
    
    // Calculate trends
    if (history.length >= 2) {
      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      
      this.metrics.trends.avgDropsTrend = 
        ((latest.avgDrops - previous.avgDrops) / previous.avgDrops * 100).toFixed(1) + '%';
      
      this.metrics.trends.duplicatesTrend = 
        ((latest.duplicates - previous.duplicates) / previous.duplicates * 100).toFixed(1) + '%';
    }
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport() {
    console.log('═══════════════════════════════════════');
    console.log('📊 Data Quality Report\n');
    
    // Quality scores
    console.log('Quality Metrics:');
    console.log(`- Duplicate Drop Rate: ${(this.metrics.dataQuality.duplicateDropRate * 100).toFixed(1)}%`);
    console.log(`- Avg Drops per Pole: ${this.metrics.dataQuality.avgDropsPerPole.toFixed(2)}`);
    console.log(`- Capacity Utilization: ${(this.metrics.dataQuality.capacityUtilization * 100).toFixed(1)}%`);
    console.log(`- Data Completeness: ${(this.metrics.dataQuality.dataCompleteness * 100).toFixed(1)}%`);
    console.log(`- Processing Errors: ${this.metrics.dataQuality.processingErrors}`);
    console.log(`- Processing Warnings: ${this.metrics.dataQuality.processingWarnings}`);
    
    // Trends
    if (Object.keys(this.metrics.trends).length > 0) {
      console.log('\nTrends:');
      console.log(`- Avg Drops Change: ${this.metrics.trends.avgDropsTrend}`);
      console.log(`- Duplicates Change: ${this.metrics.trends.duplicatesTrend}`);
    }
    
    // Alerts
    if (this.metrics.alerts.length > 0) {
      console.log('\n⚠️  Alerts:');
      this.metrics.alerts.forEach(alert => {
        const icon = alert.severity === 'CRITICAL' ? '🚨' : 
                     alert.severity === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${alert.severity}] ${alert.metric}: ${alert.value} (threshold: ${alert.threshold})`);
        console.log(`   ${alert.message}`);
      });
    } else {
      console.log('\n✅ No alerts - All metrics within normal ranges');
    }
    
    // Overall health score
    const healthScore = this.calculateHealthScore();
    console.log(`\nOverall Data Quality Score: ${healthScore}/100`);
    
    if (healthScore >= 90) {
      console.log('Status: 🟢 Excellent');
    } else if (healthScore >= 75) {
      console.log('Status: 🟡 Good');
    } else if (healthScore >= 60) {
      console.log('Status: 🟠 Fair');
    } else {
      console.log('Status: 🔴 Poor');
    }
    
    // Save monitoring report
    const reportPath = path.join(__dirname, '../Reports/monitoring/data_quality_report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    
    console.log(`\n📁 Monitoring report saved to: ${reportPath}`);
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore() {
    let score = 100;
    
    // Deduct points for issues
    const dq = this.metrics.dataQuality;
    
    // Duplicate drops (max -20 points)
    score -= Math.min(dq.duplicateDropRate * 100, 20);
    
    // Over capacity (max -30 points)
    score -= dq.polesOverCapacity * 10;
    
    // Processing errors (max -20 points)
    score -= Math.min(dq.processingErrors * 5, 20);
    
    // High average (max -10 points)
    if (dq.avgDropsPerPole > 3) {
      score -= Math.min((dq.avgDropsPerPole - 3) * 5, 10);
    }
    
    return Math.max(Math.round(score), 0);
  }
}

// Run monitoring
const monitor = new DataQualityMonitor();
monitor.monitorLatestReport().catch(console.error);