#!/usr/bin/env node

/**
 * Data Quality Tracking System for 1map Files
 * 
 * This script analyzes CSV files and tracks data quality metrics over time,
 * creating an audit log to monitor improvements in photo coverage and data completeness.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

class DataQualityTracker {
    constructor() {
        this.auditLogPath = path.join(__dirname, '../reports/data-quality-audit.json');
        this.summaryPath = path.join(__dirname, '../reports/data-quality-summary.md');
        this.auditLog = this.loadAuditLog();
    }

    loadAuditLog() {
        try {
            if (fs.existsSync(this.auditLogPath)) {
                return JSON.parse(fs.readFileSync(this.auditLogPath, 'utf-8'));
            }
        } catch (error) {
            console.log('Creating new audit log...');
        }
        return {
            files: [],
            metrics: {},
            trends: {}
        };
    }

    saveAuditLog() {
        const dir = path.dirname(this.auditLogPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.auditLogPath, JSON.stringify(this.auditLog, null, 2));
    }

    analyzeFile(filePath) {
        console.log(`\nAnalyzing: ${path.basename(filePath)}...`);
        
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = csv.parse(fileContent, {
            delimiter: ';',
            relax_quotes: true,
            skip_empty_lines: true
        });

        const fileName = path.basename(filePath);
        const fileDate = this.extractDateFromFilename(fileName);
        
        // Initialize metrics
        const metrics = {
            fileName,
            fileDate,
            analyzedAt: new Date().toISOString(),
            totalRecords: records.length - 1,
            byStatus: {},
            photoMetrics: {
                overall: { total: 0, withPhoto: 0, percentage: 0 },
                byStatus: {}
            },
            dataCompleteness: {
                poleNumbers: { filled: 0, percentage: 0 },
                dropNumbers: { filled: 0, percentage: 0 },
                installerNames: { filled: 0, percentage: 0 },
                agentNames: { filled: 0, percentage: 0 },
                gpsCoordinates: { filled: 0, percentage: 0 }
            },
            qualityScore: 0
        };

        // Field indices
        const FIELDS = {
            status: 3,
            poleNumber: 16,
            dropNumber: 17,
            propertyPhoto: 67,
            latitude: 38,
            longitude: 39,
            poleAgentName: 35,
            homeAgentName: 70,
            installerName: 106
        };

        // Analyze each record
        records.forEach((record, index) => {
            if (index === 0) return; // Skip header

            const status = record[FIELDS.status] || 'No Status';
            
            // Count by status
            metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
            
            // Photo metrics by status
            if (!metrics.photoMetrics.byStatus[status]) {
                metrics.photoMetrics.byStatus[status] = { 
                    total: 0, 
                    withPhoto: 0, 
                    percentage: 0 
                };
            }
            metrics.photoMetrics.byStatus[status].total++;
            
            // Check photo
            const hasPhoto = record[FIELDS.propertyPhoto] && 
                           record[FIELDS.propertyPhoto].trim() !== '';
            if (hasPhoto) {
                metrics.photoMetrics.byStatus[status].withPhoto++;
                metrics.photoMetrics.overall.withPhoto++;
            }
            
            // Data completeness checks
            if (record[FIELDS.poleNumber]?.trim()) {
                metrics.dataCompleteness.poleNumbers.filled++;
            }
            if (record[FIELDS.dropNumber]?.trim()) {
                metrics.dataCompleteness.dropNumbers.filled++;
            }
            if (record[FIELDS.installerName]?.trim()) {
                metrics.dataCompleteness.installerNames.filled++;
            }
            if (record[FIELDS.poleAgentName]?.trim() || 
                record[FIELDS.homeAgentName]?.trim()) {
                metrics.dataCompleteness.agentNames.filled++;
            }
            if (record[FIELDS.latitude]?.trim() && 
                record[FIELDS.longitude]?.trim()) {
                metrics.dataCompleteness.gpsCoordinates.filled++;
            }
            
            metrics.photoMetrics.overall.total++;
        });

        // Calculate percentages
        this.calculatePercentages(metrics);
        
        // Calculate quality score
        metrics.qualityScore = this.calculateQualityScore(metrics);
        
        // Add to audit log
        this.addToAuditLog(metrics);
        
        return metrics;
    }

    calculatePercentages(metrics) {
        // Photo percentages
        metrics.photoMetrics.overall.percentage = 
            (metrics.photoMetrics.overall.withPhoto / 
             metrics.photoMetrics.overall.total * 100).toFixed(2);
        
        Object.keys(metrics.photoMetrics.byStatus).forEach(status => {
            const statusMetrics = metrics.photoMetrics.byStatus[status];
            statusMetrics.percentage = 
                (statusMetrics.withPhoto / statusMetrics.total * 100).toFixed(2);
        });
        
        // Data completeness percentages
        Object.keys(metrics.dataCompleteness).forEach(field => {
            metrics.dataCompleteness[field].percentage = 
                (metrics.dataCompleteness[field].filled / 
                 metrics.totalRecords * 100).toFixed(2);
        });
    }

    calculateQualityScore(metrics) {
        // Weighted scoring system
        const weights = {
            photoCompleteness: 0.25,
            poleNumbers: 0.15,
            dropNumbers: 0.15,
            agentNames: 0.15,
            installerNames: 0.15,
            gpsCoordinates: 0.15
        };
        
        let score = 0;
        
        // Photo score (weighted by status importance)
        const inProgressPhotos = metrics.photoMetrics.byStatus['Home Installation: In Progress'];
        const installedPhotos = metrics.photoMetrics.byStatus['Home Installation: Installed'];
        
        let photoScore = 0;
        if (inProgressPhotos) {
            photoScore += parseFloat(inProgressPhotos.percentage) * 0.3;
        }
        if (installedPhotos) {
            photoScore += parseFloat(installedPhotos.percentage) * 0.7;
        } else {
            photoScore += parseFloat(metrics.photoMetrics.overall.percentage) * 0.7;
        }
        score += (photoScore / 100) * weights.photoCompleteness * 100;
        
        // Data completeness scores
        score += parseFloat(metrics.dataCompleteness.poleNumbers.percentage) * weights.poleNumbers;
        score += parseFloat(metrics.dataCompleteness.dropNumbers.percentage) * weights.dropNumbers;
        score += parseFloat(metrics.dataCompleteness.agentNames.percentage) * weights.agentNames;
        score += parseFloat(metrics.dataCompleteness.installerNames.percentage) * weights.installerNames;
        score += parseFloat(metrics.dataCompleteness.gpsCoordinates.percentage) * weights.gpsCoordinates;
        
        return Math.round(score);
    }

    extractDateFromFilename(filename) {
        // Try to extract date from filename patterns
        const patterns = [
            /(\d{2})(\d{2})(\d{4})/,  // DDMMYYYY
            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            /Week (\d+) (\d{2})(\d{2})(\d{4})/ // Week N DDMMYYYY
        ];
        
        for (const pattern of patterns) {
            const match = filename.match(pattern);
            if (match) {
                if (match[0].includes('Week')) {
                    return `2025-${match[3]}-${match[2]}`; // Assuming 2025
                }
                return match[0];
            }
        }
        
        return new Date().toISOString().split('T')[0];
    }

    addToAuditLog(metrics) {
        // Check if file already analyzed
        const existingIndex = this.auditLog.files.findIndex(
            f => f.fileName === metrics.fileName
        );
        
        if (existingIndex >= 0) {
            this.auditLog.files[existingIndex] = metrics;
        } else {
            this.auditLog.files.push(metrics);
        }
        
        // Sort by date
        this.auditLog.files.sort((a, b) => 
            new Date(a.fileDate) - new Date(b.fileDate)
        );
        
        // Calculate trends
        this.calculateTrends();
    }

    calculateTrends() {
        if (this.auditLog.files.length < 2) return;
        
        const trends = {
            photoCompletion: [],
            qualityScore: [],
            dataCompleteness: {}
        };
        
        this.auditLog.files.forEach((file, index) => {
            trends.photoCompletion.push({
                date: file.fileDate,
                percentage: parseFloat(file.photoMetrics.overall.percentage)
            });
            
            trends.qualityScore.push({
                date: file.fileDate,
                score: file.qualityScore
            });
            
            // Track each completeness metric
            Object.keys(file.dataCompleteness).forEach(field => {
                if (!trends.dataCompleteness[field]) {
                    trends.dataCompleteness[field] = [];
                }
                trends.dataCompleteness[field].push({
                    date: file.fileDate,
                    percentage: parseFloat(file.dataCompleteness[field].percentage)
                });
            });
        });
        
        this.auditLog.trends = trends;
    }

    generateSummaryReport() {
        const report = [];
        
        report.push('# 1Map Data Quality Tracking Report');
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push(`Total Files Analyzed: ${this.auditLog.files.length}`);
        report.push('');
        
        if (this.auditLog.files.length === 0) {
            report.push('No files analyzed yet. Run the tracker on some CSV files first.');
            return report.join('\n');
        }
        
        // Latest metrics
        const latest = this.auditLog.files[this.auditLog.files.length - 1];
        report.push('## Latest File Analysis');
        report.push(`File: ${latest.fileName}`);
        report.push(`Date: ${latest.fileDate}`);
        report.push(`Quality Score: ${latest.qualityScore}/100`);
        report.push('');
        
        // Photo coverage
        report.push('### Photo Coverage');
        report.push(`Overall: ${latest.photoMetrics.overall.percentage}%`);
        report.push('');
        report.push('By Status:');
        Object.entries(latest.photoMetrics.byStatus)
            .filter(([status]) => status.includes('Install'))
            .forEach(([status, data]) => {
                report.push(`- ${status}: ${data.percentage}% (${data.withPhoto}/${data.total})`);
            });
        report.push('');
        
        // Data completeness
        report.push('### Data Completeness');
        Object.entries(latest.dataCompleteness).forEach(([field, data]) => {
            const fieldName = field.replace(/([A-Z])/g, ' $1').trim();
            report.push(`- ${fieldName}: ${data.percentage}%`);
        });
        report.push('');
        
        // Trends
        if (this.auditLog.files.length > 1) {
            report.push('## Quality Trends');
            report.push('');
            
            // Calculate improvements
            const first = this.auditLog.files[0];
            const improvements = {
                qualityScore: latest.qualityScore - first.qualityScore,
                photoCompletion: parseFloat(latest.photoMetrics.overall.percentage) - 
                                parseFloat(first.photoMetrics.overall.percentage)
            };
            
            report.push('### Overall Improvements');
            report.push(`- Quality Score: ${improvements.qualityScore >= 0 ? '+' : ''}${improvements.qualityScore} points`);
            report.push(`- Photo Completion: ${improvements.photoCompletion >= 0 ? '+' : ''}${improvements.photoCompletion.toFixed(2)}%`);
            report.push('');
            
            // Show timeline
            report.push('### Timeline');
            report.push('| Date | File | Quality Score | Photo % |');
            report.push('|------|------|---------------|---------|');
            this.auditLog.files.forEach(file => {
                report.push(`| ${file.fileDate} | ${file.fileName.substring(0, 30)} | ${file.qualityScore} | ${file.photoMetrics.overall.percentage}% |`);
            });
        }
        
        report.push('');
        report.push('## Recommendations');
        
        // Generate recommendations based on latest metrics
        const recs = [];
        
        if (latest.qualityScore < 50) {
            recs.push('- **Critical**: Data quality is below 50%. Urgent improvements needed.');
        }
        
        if (parseFloat(latest.photoMetrics.overall.percentage) < 60) {
            recs.push('- **Photos**: Less than 60% of installations have photos. Enforce photo requirements.');
        }
        
        if (parseFloat(latest.dataCompleteness.installerNames.percentage) < 80) {
            recs.push('- **Installer Tracking**: Many records missing installer names. Cannot track accountability.');
        }
        
        if (parseFloat(latest.dataCompleteness.gpsCoordinates.percentage) < 90) {
            recs.push('- **GPS Data**: Incomplete GPS coordinates will affect mapping and route planning.');
        }
        
        if (recs.length === 0) {
            recs.push('- Data quality is good! Continue monitoring for consistency.');
        }
        
        report.push(...recs);
        
        return report.join('\n');
    }

    runAnalysis(filePath) {
        const metrics = this.analyzeFile(filePath);
        this.saveAuditLog();
        
        const summary = this.generateSummaryReport();
        fs.writeFileSync(this.summaryPath, summary);
        
        console.log('\n' + '='.repeat(60));
        console.log('ANALYSIS COMPLETE');
        console.log('='.repeat(60));
        console.log(`Quality Score: ${metrics.qualityScore}/100`);
        console.log(`Photo Completion: ${metrics.photoMetrics.overall.percentage}%`);
        console.log('\nReports saved:');
        console.log(`- Audit Log: ${this.auditLogPath}`);
        console.log(`- Summary: ${this.summaryPath}`);
    }
}

// Main execution
if (require.main === module) {
    const filePath = process.argv[2];
    
    if (!filePath) {
        console.log('Usage: node track-data-quality.js <csv-file-path>');
        console.log('\nExample:');
        console.log('node track-data-quality.js downloads/Lawley_July_Week_4.csv');
        process.exit(1);
    }
    
    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
    }
    
    const tracker = new DataQualityTracker();
    tracker.runAnalysis(filePath);
}

module.exports = DataQualityTracker;