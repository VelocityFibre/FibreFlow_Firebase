#!/usr/bin/env node

/**
 * Data Quality Dashboard
 * 
 * Shows quality trends and generates actionable insights
 */

const fs = require('fs');
const path = require('path');

const auditLogPath = path.join(__dirname, '../reports/data-quality-audit.json');
const dashboardPath = path.join(__dirname, '../reports/quality-dashboard.html');

if (!fs.existsSync(auditLogPath)) {
    console.error('No audit log found. Run track-data-quality.js first.');
    process.exit(1);
}

const auditLog = JSON.parse(fs.readFileSync(auditLogPath, 'utf-8'));

// Generate HTML dashboard
const html = `
<!DOCTYPE html>
<html>
<head>
    <title>1Map Data Quality Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        .metric-card {
            display: inline-block;
            background: #f8f9fa;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            min-width: 200px;
            text-align: center;
        }
        .metric-value {
            font-size: 36px;
            font-weight: bold;
            color: #0066cc;
        }
        .metric-label {
            color: #666;
            margin-top: 10px;
        }
        .score-good { color: #28a745; }
        .score-warning { color: #ffc107; }
        .score-bad { color: #dc3545; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .chart {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            min-height: 200px;
        }
        .alert {
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
        }
        .alert-danger {
            background-color: #f8d7da;
            border: 1px solid #f5c2c7;
            color: #721c24;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background-color: #0066cc;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 1Map Data Quality Dashboard</h1>
        <p>Last Updated: ${new Date().toLocaleString()}</p>
        
        ${generateCurrentMetrics()}
        ${generateAlerts()}
        ${generateHistoryTable()}
        ${generateRecommendations()}
    </div>
    
    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => location.reload(), 300000);
    </script>
</body>
</html>`;

function generateCurrentMetrics() {
    if (auditLog.files.length === 0) {
        return '<p>No data available yet.</p>';
    }
    
    const latest = auditLog.files[auditLog.files.length - 1];
    const scoreClass = latest.qualityScore >= 70 ? 'score-good' : 
                      latest.qualityScore >= 50 ? 'score-warning' : 'score-bad';
    
    return `
        <h2>Current Status</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value ${scoreClass}">${latest.qualityScore}</div>
                <div class="metric-label">Quality Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${latest.photoMetrics.overall.percentage}%</div>
                <div class="metric-label">Photo Coverage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${latest.totalRecords.toLocaleString()}</div>
                <div class="metric-label">Total Records</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${latest.dataCompleteness.installerNames.percentage}%</div>
                <div class="metric-label">Installer Tracking</div>
            </div>
        </div>
        
        <h3>Photo Coverage by Status</h3>
        ${Object.entries(latest.photoMetrics.byStatus)
            .filter(([status]) => status.includes('Install'))
            .map(([status, data]) => `
                <div style="margin: 10px 0;">
                    <strong>${status}</strong>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${data.percentage}%"></div>
                    </div>
                    <span>${data.percentage}% (${data.withPhoto} of ${data.total})</span>
                </div>
            `).join('')}
    `;
}

function generateAlerts() {
    if (auditLog.files.length === 0) return '';
    
    const latest = auditLog.files[auditLog.files.length - 1];
    const alerts = [];
    
    // Check for critical issues
    if (latest.photoMetrics.byStatus['Home Installation: Installed'] && 
        latest.photoMetrics.byStatus['Home Installation: Installed'].percentage === '0.00') {
        alerts.push({
            type: 'danger',
            message: '⚠️ <strong>Critical:</strong> Completed installations have NO photos!'
        });
    }
    
    if (parseFloat(latest.dataCompleteness.installerNames.percentage) < 20) {
        alerts.push({
            type: 'danger',
            message: '⚠️ <strong>Critical:</strong> Less than 20% of records have installer names. Cannot track accountability.'
        });
    }
    
    if (latest.qualityScore < 50) {
        alerts.push({
            type: 'warning',
            message: '⚠️ <strong>Warning:</strong> Overall data quality below 50%. Urgent improvements needed.'
        });
    }
    
    if (alerts.length === 0) {
        return '<div class="alert alert-success">✅ No critical issues detected.</div>';
    }
    
    return alerts.map(alert => 
        \`<div class="alert alert-\${alert.type}">\${alert.message}</div>\`
    ).join('');
}

function generateHistoryTable() {
    if (auditLog.files.length < 2) {
        return '<h2>History</h2><p>Need at least 2 files to show trends.</p>';
    }
    
    return `
        <h2>History & Trends</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>File</th>
                    <th>Quality Score</th>
                    <th>Photo Coverage</th>
                    <th>Records</th>
                    <th>Trend</th>
                </tr>
            </thead>
            <tbody>
                ${auditLog.files.map((file, index) => {
                    const prev = index > 0 ? auditLog.files[index - 1] : null;
                    const scoreTrend = prev ? file.qualityScore - prev.qualityScore : 0;
                    const photoTrend = prev ? 
                        parseFloat(file.photoMetrics.overall.percentage) - 
                        parseFloat(prev.photoMetrics.overall.percentage) : 0;
                    
                    return `
                        <tr>
                            <td>${file.fileDate}</td>
                            <td>${file.fileName.length > 30 ? 
                                file.fileName.substring(0, 30) + '...' : 
                                file.fileName}</td>
                            <td>${file.qualityScore}</td>
                            <td>${file.photoMetrics.overall.percentage}%</td>
                            <td>${file.totalRecords.toLocaleString()}</td>
                            <td>
                                ${scoreTrend > 0 ? '<span class="trend-up">↑</span>' : 
                                  scoreTrend < 0 ? '<span class="trend-down">↓</span>' : '—'}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function generateRecommendations() {
    if (auditLog.files.length === 0) return '';
    
    const latest = auditLog.files[auditLog.files.length - 1];
    const recs = [];
    
    // Priority 1: Photos for completed work
    if (latest.photoMetrics.byStatus['Home Installation: Installed'] && 
        parseFloat(latest.photoMetrics.byStatus['Home Installation: Installed'].percentage) < 100) {
        recs.push({
            priority: 'HIGH',
            action: 'Enforce photo capture for ALL completed installations',
            impact: 'Cannot verify work quality without photos'
        });
    }
    
    // Priority 2: Installer tracking
    if (parseFloat(latest.dataCompleteness.installerNames.percentage) < 50) {
        recs.push({
            priority: 'HIGH',
            action: 'Make installer name mandatory in 1map app',
            impact: 'Cannot track performance or assign responsibility'
        });
    }
    
    // Priority 3: In-progress photos
    const inProgress = latest.photoMetrics.byStatus['Home Installation: In Progress'];
    if (inProgress && parseFloat(inProgress.percentage) < 80) {
        recs.push({
            priority: 'MEDIUM',
            action: 'Require initial property photo before starting work',
            impact: 'Missing before/after comparison for quality checks'
        });
    }
    
    // Priority 4: Agent tracking
    if (parseFloat(latest.dataCompleteness.agentNames.percentage) < 80) {
        recs.push({
            priority: 'MEDIUM',
            action: 'Improve agent name capture in field app',
            impact: 'Difficult to calculate accurate agent payments'
        });
    }
    
    return `
        <h2>Actionable Recommendations</h2>
        <table>
            <thead>
                <tr>
                    <th>Priority</th>
                    <th>Action Required</th>
                    <th>Business Impact</th>
                </tr>
            </thead>
            <tbody>
                ${recs.map(rec => `
                    <tr>
                        <td><strong>${rec.priority}</strong></td>
                        <td>${rec.action}</td>
                        <td>${rec.impact}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Save dashboard
fs.writeFileSync(dashboardPath, html);

console.log('Dashboard generated successfully!');
console.log(`Open: ${dashboardPath}`);

// Try to open in browser (works on most systems)
const open = process.platform === 'darwin' ? 'open' : 
             process.platform === 'win32' ? 'start' : 'xdg-open';

require('child_process').exec(`${open} "${dashboardPath}"`, (err) => {
    if (err) console.log('Please open the dashboard manually.');
});