#!/usr/bin/env node

/**
 * Performance Monitor for Pole Reports System
 * 
 * Tracks and analyzes:
 * - Processing times
 * - Success rates
 * - Memory usage
 * - Database performance
 * - System health
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit as firestoreLimit, getDocs, Timestamp } = require('firebase/firestore');

// Configuration
const CONFIG = {
  METADATA_PATH: path.join(__dirname, '../metadata/processing-log.json'),
  DAILY_LOG_PATH: path.join(__dirname, '../metadata/daily-processed.json'),
  PERFORMANCE_REPORT_PATH: path.join(__dirname, '../reports/performance'),
  METRICS_RETENTION_DAYS: 30,
  WARNING_THRESHOLDS: {
    processingTime: 10000, // 10 seconds per pole
    failureRate: 0.1, // 10% failure rate
    memoryUsage: 0.8, // 80% of available memory
    diskSpace: 0.9 // 90% disk usage
  }
};

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBbaRXEkiVGHC5S_lLH8SWvgTJZDF6iTzQ",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.appspot.com",
  messagingSenderId: "146498268846",
  appId: "1:146498268846:web:34fda96797dcec30dc6c74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Collect system metrics
 */
function collectSystemMetrics() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = usedMemory / totalMemory;
  
  return {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentage: memoryUsage
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown'
    }
  };
}

/**
 * Load processing logs
 */
async function loadProcessingLogs() {
  const logs = {
    processing: null,
    daily: null
  };
  
  try {
    const processingData = await fs.readFile(CONFIG.METADATA_PATH, 'utf-8');
    logs.processing = JSON.parse(processingData);
  } catch (error) {
    console.log('No processing log found');
  }
  
  try {
    const dailyData = await fs.readFile(CONFIG.DAILY_LOG_PATH, 'utf-8');
    logs.daily = JSON.parse(dailyData);
  } catch (error) {
    console.log('No daily log found');
  }
  
  return logs;
}

/**
 * Analyze processing performance
 */
function analyzeProcessingPerformance(logs) {
  const analysis = {
    summary: {
      totalRuns: 0,
      totalPoles: 0,
      totalSuccess: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      successRate: 0
    },
    trends: {
      daily: [],
      weekly: []
    },
    issues: []
  };
  
  if (!logs.processing || !logs.processing.performanceStats) {
    return analysis;
  }
  
  const stats = logs.processing.performanceStats;
  analysis.summary.totalRuns = stats.length;
  
  // Calculate totals
  stats.forEach(stat => {
    analysis.summary.totalPoles += stat.polesProcessed || 0;
    analysis.summary.totalSuccess += stat.successful || 0;
    analysis.summary.totalFailed += stat.failed || 0;
  });
  
  // Calculate averages
  if (analysis.summary.totalRuns > 0) {
    const totalDuration = stats.reduce((sum, stat) => sum + (stat.duration || 0), 0);
    analysis.summary.averageProcessingTime = totalDuration / analysis.summary.totalPoles;
    analysis.summary.successRate = analysis.summary.totalSuccess / analysis.summary.totalPoles;
  }
  
  // Check for issues
  if (analysis.summary.successRate < (1 - CONFIG.WARNING_THRESHOLDS.failureRate)) {
    analysis.issues.push({
      type: 'high_failure_rate',
      severity: 'warning',
      message: `Success rate ${(analysis.summary.successRate * 100).toFixed(1)}% is below threshold`,
      threshold: `${((1 - CONFIG.WARNING_THRESHOLDS.failureRate) * 100)}%`
    });
  }
  
  if (analysis.summary.averageProcessingTime > CONFIG.WARNING_THRESHOLDS.processingTime) {
    analysis.issues.push({
      type: 'slow_processing',
      severity: 'warning',
      message: `Average processing time ${(analysis.summary.averageProcessingTime / 1000).toFixed(2)}s exceeds threshold`,
      threshold: `${CONFIG.WARNING_THRESHOLDS.processingTime / 1000}s`
    });
  }
  
  // Daily trends (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentStats = stats.filter(stat => new Date(stat.timestamp) > sevenDaysAgo);
  
  // Group by day
  const dailyGroups = {};
  recentStats.forEach(stat => {
    const date = new Date(stat.timestamp).toISOString().split('T')[0];
    if (!dailyGroups[date]) {
      dailyGroups[date] = {
        date,
        runs: 0,
        poles: 0,
        successful: 0,
        failed: 0,
        totalDuration: 0
      };
    }
    
    dailyGroups[date].runs++;
    dailyGroups[date].poles += stat.polesProcessed || 0;
    dailyGroups[date].successful += stat.successful || 0;
    dailyGroups[date].failed += stat.failed || 0;
    dailyGroups[date].totalDuration += stat.duration || 0;
  });
  
  analysis.trends.daily = Object.values(dailyGroups).map(day => ({
    ...day,
    successRate: day.poles > 0 ? day.successful / day.poles : 0,
    averageTime: day.poles > 0 ? day.totalDuration / day.poles : 0
  }));
  
  return analysis;
}

/**
 * Query Firebase performance metrics
 */
async function queryFirebaseMetrics() {
  const metrics = {
    recentReports: 0,
    averageReportSize: 0,
    storageUsed: 0,
    queryPerformance: []
  };
  
  try {
    // Count recent reports
    const reportsRef = collection(db, 'analytics/pole-reports-summary');
    const recentQuery = query(
      reportsRef,
      where('updatedAt', '>', Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
      orderBy('updatedAt', 'desc')
    );
    
    const startTime = Date.now();
    const snapshot = await getDocs(recentQuery);
    const queryTime = Date.now() - startTime;
    
    metrics.recentReports = snapshot.size;
    metrics.queryPerformance.push({
      query: 'recent_reports',
      time: queryTime,
      documents: snapshot.size
    });
    
    // Sample report sizes
    let totalSize = 0;
    let sampleCount = 0;
    
    for (const doc of snapshot.docs) {
      if (sampleCount >= 10) break; // Sample first 10
      
      const data = doc.data();
      const size = JSON.stringify(data).length;
      totalSize += size;
      sampleCount++;
    }
    
    if (sampleCount > 0) {
      metrics.averageReportSize = totalSize / sampleCount;
    }
    
    // Estimate storage
    metrics.storageUsed = metrics.recentReports * metrics.averageReportSize;
    
  } catch (error) {
    console.error('Error querying Firebase metrics:', error.message);
  }
  
  return metrics;
}

/**
 * Generate performance report
 */
async function generatePerformanceReport(analysis, systemMetrics, firebaseMetrics) {
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.PERFORMANCE_REPORT_PATH, `performance-report-${reportDate}.md`);
  
  let markdown = `# Pole Reports Performance Report\n\n`;
  markdown += `**Generated**: ${new Date().toLocaleString('en-ZA')}\n\n`;
  
  // System Status
  markdown += `## System Status\n\n`;
  markdown += `- **Platform**: ${systemMetrics.system.platform}\n`;
  markdown += `- **Node Version**: ${systemMetrics.system.nodeVersion}\n`;
  markdown += `- **CPU Cores**: ${systemMetrics.cpu.cores}\n`;
  markdown += `- **Memory Usage**: ${(systemMetrics.memory.percentage * 100).toFixed(1)}% (${(systemMetrics.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(systemMetrics.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB)\n`;
  markdown += `- **System Uptime**: ${(systemMetrics.system.uptime / 3600).toFixed(1)} hours\n`;
  markdown += `- **Load Average**: ${systemMetrics.system.loadAverage.map(l => l.toFixed(2)).join(', ')}\n\n`;
  
  // Processing Performance
  markdown += `## Processing Performance\n\n`;
  markdown += `### Summary\n`;
  markdown += `- **Total Runs**: ${analysis.summary.totalRuns}\n`;
  markdown += `- **Total Poles Processed**: ${analysis.summary.totalPoles}\n`;
  markdown += `- **Success Rate**: ${(analysis.summary.successRate * 100).toFixed(1)}%\n`;
  markdown += `- **Average Processing Time**: ${(analysis.summary.averageProcessingTime / 1000).toFixed(2)}s per pole\n\n`;
  
  // Daily Trends
  if (analysis.trends.daily.length > 0) {
    markdown += `### Daily Trends (Last 7 Days)\n\n`;
    markdown += `| Date | Runs | Poles | Success Rate | Avg Time |\n`;
    markdown += `|------|------|-------|--------------|----------|\n`;
    
    analysis.trends.daily.forEach(day => {
      markdown += `| ${day.date} | ${day.runs} | ${day.poles} | ${(day.successRate * 100).toFixed(1)}% | ${(day.averageTime / 1000).toFixed(2)}s |\n`;
    });
    markdown += '\n';
  }
  
  // Firebase Metrics
  markdown += `## Firebase Performance\n\n`;
  markdown += `- **Recent Reports**: ${firebaseMetrics.recentReports} (last 7 days)\n`;
  markdown += `- **Average Report Size**: ${(firebaseMetrics.averageReportSize / 1024).toFixed(2)} KB\n`;
  markdown += `- **Estimated Storage**: ${(firebaseMetrics.storageUsed / 1024 / 1024).toFixed(2)} MB\n\n`;
  
  if (firebaseMetrics.queryPerformance.length > 0) {
    markdown += `### Query Performance\n\n`;
    markdown += `| Query | Time | Documents |\n`;
    markdown += `|-------|------|----------|\n`;
    
    firebaseMetrics.queryPerformance.forEach(q => {
      markdown += `| ${q.query} | ${q.time}ms | ${q.documents} |\n`;
    });
    markdown += '\n';
  }
  
  // Issues and Warnings
  if (analysis.issues.length > 0) {
    markdown += `## ⚠️ Issues Detected\n\n`;
    analysis.issues.forEach(issue => {
      markdown += `- **${issue.type}** (${issue.severity}): ${issue.message}\n`;
      if (issue.threshold) {
        markdown += `  - Threshold: ${issue.threshold}\n`;
      }
    });
    markdown += '\n';
  }
  
  // Recommendations
  markdown += `## Recommendations\n\n`;
  
  if (systemMetrics.memory.percentage > CONFIG.WARNING_THRESHOLDS.memoryUsage) {
    markdown += `- ⚠️ **High Memory Usage**: Consider increasing system memory or optimizing batch sizes\n`;
  }
  
  if (analysis.summary.successRate < 0.95) {
    markdown += `- ⚠️ **Low Success Rate**: Review failed pole reports and check data quality\n`;
  }
  
  if (analysis.summary.averageProcessingTime > 5000) {
    markdown += `- ⚠️ **Slow Processing**: Consider optimizing report generation or reducing batch sizes\n`;
  }
  
  markdown += `\n---\n`;
  markdown += `*Generated by FibreFlow Performance Monitor*\n`;
  
  // Save report
  await fs.mkdir(CONFIG.PERFORMANCE_REPORT_PATH, { recursive: true });
  await fs.writeFile(reportPath, markdown);
  
  console.log(`\n📊 Performance report saved to: ${reportPath}`);
  
  return reportPath;
}

/**
 * Monitor real-time performance
 */
async function monitorRealTime() {
  console.log('\n📊 Real-Time Performance Monitor');
  console.log('='.repeat(60));
  console.log('Press Ctrl+C to stop\n');
  
  const interval = 5000; // 5 seconds
  
  const monitor = async () => {
    const metrics = collectSystemMetrics();
    
    console.clear();
    console.log('📊 Real-Time Performance Monitor');
    console.log('='.repeat(60));
    console.log(`Time: ${new Date().toLocaleTimeString('en-ZA')}\n`);
    
    // Memory
    const memBar = '█'.repeat(Math.floor(metrics.memory.percentage * 20));
    const memEmpty = '░'.repeat(20 - memBar.length);
    console.log(`Memory: [${memBar}${memEmpty}] ${(metrics.memory.percentage * 100).toFixed(1)}%`);
    console.log(`        ${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(metrics.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
    
    // CPU Load
    const load = metrics.system.loadAverage[0];
    const loadBar = '█'.repeat(Math.min(20, Math.floor(load * 20 / metrics.cpu.cores)));
    const loadEmpty = '░'.repeat(20 - loadBar.length);
    console.log(`CPU Load: [${loadBar}${loadEmpty}] ${load.toFixed(2)} / ${metrics.cpu.cores}`);
    console.log(`          1m: ${metrics.system.loadAverage[0].toFixed(2)}, 5m: ${metrics.system.loadAverage[1].toFixed(2)}, 15m: ${metrics.system.loadAverage[2].toFixed(2)}\n`);
    
    // Warnings
    if (metrics.memory.percentage > CONFIG.WARNING_THRESHOLDS.memoryUsage) {
      console.log('⚠️  WARNING: High memory usage detected!');
    }
    
    if (load > metrics.cpu.cores * 0.8) {
      console.log('⚠️  WARNING: High CPU load detected!');
    }
  };
  
  // Initial display
  await monitor();
  
  // Update every interval
  const intervalId = setInterval(monitor, interval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log('\n\nMonitoring stopped.');
    process.exit(0);
  });
}

/**
 * Main performance analysis
 */
async function analyzePerformance() {
  console.log('\n🔍 Analyzing Pole Reports Performance');
  console.log('='.repeat(60));
  
  try {
    // Collect system metrics
    console.log('\n📊 Collecting system metrics...');
    const systemMetrics = collectSystemMetrics();
    
    // Load processing logs
    console.log('📂 Loading processing logs...');
    const logs = await loadProcessingLogs();
    
    // Analyze performance
    console.log('🧮 Analyzing processing performance...');
    const analysis = analyzeProcessingPerformance(logs);
    
    // Query Firebase metrics
    console.log('🔥 Querying Firebase metrics...');
    const firebaseMetrics = await queryFirebaseMetrics();
    
    // Generate report
    console.log('📝 Generating performance report...');
    const reportPath = await generatePerformanceReport(analysis, systemMetrics, firebaseMetrics);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Performance Analysis Complete');
    console.log(`   Total Runs: ${analysis.summary.totalRuns}`);
    console.log(`   Success Rate: ${(analysis.summary.successRate * 100).toFixed(1)}%`);
    console.log(`   Avg Processing: ${(analysis.summary.averageProcessingTime / 1000).toFixed(2)}s`);
    console.log(`   System Memory: ${(systemMetrics.memory.percentage * 100).toFixed(1)}%`);
    
    if (analysis.issues.length > 0) {
      console.log(`\n⚠️  ${analysis.issues.length} issues detected - see report for details`);
    }
    
  } catch (error) {
    console.error('\n❌ Error analyzing performance:', error);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'monitor':
    case 'realtime':
      monitorRealTime().catch(console.error);
      break;
    case 'report':
    default:
      analyzePerformance().catch(console.error);
  }
}

module.exports = {
  collectSystemMetrics,
  analyzeProcessingPerformance,
  queryFirebaseMetrics
};