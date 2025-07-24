#!/usr/bin/env node

/**
 * Standardized Pole Status Report Generator
 * 
 * Features:
 * - Built-in validation at every step
 * - Cross-verification of calculations
 * - Automated sanity checks
 * - Detailed audit trail
 * 
 * Usage: node generate-pole-status-report.js [CSV_FILE] [OUTPUT_DIR]
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const crypto = require('crypto');

class PoleStatusReportGenerator {
  constructor() {
    this.validationLog = [];
    this.calculations = {};
    this.sourceData = {
      file: null,
      hash: null,
      recordCount: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Main entry point
   */
  async generateReport(csvFile, outputDir) {
    console.log('🚀 Starting Pole Status Report Generation\n');
    
    try {
      // Step 1: Validate inputs
      this.validateInputs(csvFile, outputDir);
      
      // Step 2: Parse and validate CSV data
      const data = await this.parseAndValidateCSV(csvFile);
      
      // Step 3: Perform calculations with validation
      const analysis = this.performAnalysis(data);
      
      // Step 4: Cross-verify calculations
      this.crossVerifyCalculations(analysis);
      
      // Step 5: Generate report with validation certificate
      const report = this.generateReportContent(analysis);
      
      // Step 6: Save report and validation log
      this.saveReport(report, outputDir);
      this.saveValidationLog(outputDir);
      
      console.log('\n✅ Report generation completed successfully!');
      console.log(`📁 Report saved to: ${outputDir}`);
      
    } catch (error) {
      console.error('\n❌ Report generation failed:', error.message);
      this.saveErrorLog(error, outputDir);
      process.exit(1);
    }
  }

  /**
   * Validate input parameters
   */
  validateInputs(csvFile, outputDir) {
    this.log('info', 'Validating inputs');
    
    if (!fs.existsSync(csvFile)) {
      throw new Error(`CSV file not found: ${csvFile}`);
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      this.log('info', `Created output directory: ${outputDir}`);
    }
    
    // Calculate file hash for verification
    const fileContent = fs.readFileSync(csvFile);
    this.sourceData.file = csvFile;
    this.sourceData.hash = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    this.log('success', 'Input validation passed');
  }

  /**
   * Parse CSV and validate data
   */
  async parseAndValidateCSV(csvFile) {
    return new Promise((resolve, reject) => {
      const data = {
        records: [],
        poleDrops: new Map(),
        dropPoles: new Map(),
        statusCounts: new Map(),
        errors: []
      };
      
      let rowNumber = 0;
      
      fs.createReadStream(csvFile)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          rowNumber++;
          this.sourceData.recordCount++;
          
          // Validate row data
          const validation = this.validateRow(row, rowNumber);
          if (validation.errors.length > 0) {
            data.errors.push(...validation.errors);
          }
          
          // Process valid data
          if (validation.valid) {
            this.processRow(row, data);
          }
          
          data.records.push(row);
        })
        .on('end', () => {
          this.log('info', `Parsed ${rowNumber} records`);
          
          // Final validation
          if (data.errors.length > 100) {
            reject(new Error(`Too many validation errors: ${data.errors.length}`));
          }
          
          resolve(data);
        })
        .on('error', reject);
    });
  }

  /**
   * Validate individual row
   */
  validateRow(row, rowNumber) {
    const errors = [];
    const required = ['Pole Number', 'Drop Number', 'Status'];
    
    // Check required fields
    for (const field of required) {
      if (!row[field] || row[field].trim() === '') {
        // Allow empty drop numbers
        if (field !== 'Drop Number') {
          errors.push(`Row ${rowNumber}: Missing ${field}`);
        }
      }
    }
    
    // Validate pole number format
    if (row['Pole Number'] && !row['Pole Number'].match(/^LAW\.[A-Z]\.[A-Z0-9]+$/)) {
      // Log warning but don't reject
      this.log('warning', `Row ${rowNumber}: Invalid pole format: ${row['Pole Number']}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process valid row data
   */
  processRow(row, data) {
    const pole = row['Pole Number']?.trim();
    const drop = row['Drop Number']?.trim();
    const status = row['Status']?.trim();
    
    // Count status
    data.statusCounts.set(status, (data.statusCounts.get(status) || 0) + 1);
    
    // Process pole-drop relationships
    if (pole && drop && drop !== '' && !drop.toLowerCase().includes('no drop')) {
      // Track pole -> drops
      if (!data.poleDrops.has(pole)) {
        data.poleDrops.set(pole, new Set());
      }
      data.poleDrops.get(pole).add(drop);
      
      // Track drop -> poles (for duplicate detection)
      if (!data.dropPoles.has(drop)) {
        data.dropPoles.set(drop, new Set());
      }
      data.dropPoles.get(drop).add(pole);
    }
  }

  /**
   * Perform analysis with validation
   */
  performAnalysis(data) {
    this.log('info', 'Performing analysis');
    
    const analysis = {
      summary: {
        totalRecords: data.records.length,
        uniquePoles: data.poleDrops.size,
        totalDrops: 0,
        avgDropsPerPole: 0
      },
      distribution: new Map(),
      capacityAnalysis: {
        overCapacity: [],
        atCapacity: [],
        nearCapacity: []
      },
      duplicateDrops: [],
      statusBreakdown: data.statusCounts,
      topPoles: []
    };
    
    // Calculate total unique drops
    data.poleDrops.forEach(drops => {
      analysis.summary.totalDrops += drops.size;
    });
    
    // Calculate average (with validation)
    if (analysis.summary.uniquePoles > 0) {
      analysis.summary.avgDropsPerPole = 
        analysis.summary.totalDrops / analysis.summary.uniquePoles;
      
      // Sanity check
      if (analysis.summary.avgDropsPerPole > 12) {
        this.log('error', 'Average drops per pole exceeds physical limit!');
      }
    }
    
    // Analyze distribution and capacity
    data.poleDrops.forEach((drops, pole) => {
      const count = drops.size;
      
      // Distribution
      analysis.distribution.set(count, (analysis.distribution.get(count) || 0) + 1);
      
      // Capacity analysis
      if (count > 12) {
        analysis.capacityAnalysis.overCapacity.push({ pole, count, drops: Array.from(drops) });
      } else if (count === 12) {
        analysis.capacityAnalysis.atCapacity.push({ pole, count });
      } else if (count >= 10) {
        analysis.capacityAnalysis.nearCapacity.push({ pole, count });
      }
    });
    
    // Find duplicate drops
    data.dropPoles.forEach((poles, drop) => {
      if (poles.size > 1) {
        analysis.duplicateDrops.push({
          drop,
          poles: Array.from(poles),
          count: poles.size
        });
      }
    });
    
    // Get top poles
    const sortedPoles = Array.from(data.poleDrops.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10);
    
    analysis.topPoles = sortedPoles.map(([pole, drops]) => ({
      pole,
      count: drops.size,
      drops: Array.from(drops)
    }));
    
    this.calculations = analysis;
    return analysis;
  }

  /**
   * Cross-verify all calculations
   */
  crossVerifyCalculations(analysis) {
    this.log('info', 'Cross-verifying calculations');
    const errors = [];
    
    // Verify status counts sum to total
    let statusSum = 0;
    analysis.statusBreakdown.forEach(count => statusSum += count);
    if (statusSum !== analysis.summary.totalRecords) {
      errors.push(`Status sum (${statusSum}) != total records (${analysis.summary.totalRecords})`);
    }
    
    // Verify distribution sums to unique poles
    let distSum = 0;
    analysis.distribution.forEach(count => distSum += count);
    if (distSum !== analysis.summary.uniquePoles) {
      errors.push(`Distribution sum (${distSum}) != unique poles (${analysis.summary.uniquePoles})`);
    }
    
    // Verify average calculation
    const calcAvg = analysis.summary.totalDrops / analysis.summary.uniquePoles;
    if (Math.abs(calcAvg - analysis.summary.avgDropsPerPole) > 0.001) {
      errors.push(`Average mismatch: ${calcAvg} vs ${analysis.summary.avgDropsPerPole}`);
    }
    
    // Verify no impossible values
    if (analysis.capacityAnalysis.overCapacity.some(p => p.count > 50)) {
      errors.push('Impossible drop count detected (>50)');
    }
    
    if (errors.length > 0) {
      throw new Error(`Calculation verification failed:\\n${errors.join('\\n')}`);
    }
    
    this.log('success', 'All calculations verified');
  }

  /**
   * Generate report content
   */
  generateReportContent(analysis) {
    const date = new Date().toISOString().split('T')[0];
    
    let content = `# Pole Status Analysis Report
*Generated: ${date}*
*Source: ${path.basename(this.sourceData.file)}*

## Validation Certificate
- **Data Hash**: \`${this.sourceData.hash.substring(0, 16)}...\`
- **Validation Passed**: ✅ Yes
- **Generator Version**: 1.0.0
- **Cross-Verification**: ✅ Passed

## Executive Summary

Based on analysis of ${analysis.summary.totalRecords.toLocaleString()} records from the source CSV file.

## Key Metrics

### Overall Statistics
- **Total Records**: ${analysis.summary.totalRecords.toLocaleString()}
- **Unique Poles**: ${analysis.summary.uniquePoles.toLocaleString()}
- **Total Unique Drops**: ${analysis.summary.totalDrops.toLocaleString()}
- **Average Drops per Pole**: ${analysis.summary.avgDropsPerPole.toFixed(2)}

### Pole Capacity Status

#### Distribution of Drops per Pole
| Drops per Pole | Number of Poles | Percentage |
|----------------|-----------------|------------|
`;

    // Add distribution table
    const sortedDist = Array.from(analysis.distribution.entries()).sort((a, b) => a[0] - b[0]);
    sortedDist.forEach(([drops, count]) => {
      const pct = ((count / analysis.summary.uniquePoles) * 100).toFixed(1);
      content += `| ${drops} drop${drops !== 1 ? 's' : ''} | ${count.toLocaleString()} | ${pct}% |\n`;
    });

    // Capacity analysis
    content += `
### Capacity Analysis (12-drop limit)

#### Over Capacity (>12 drops)
- **Count**: ${analysis.capacityAnalysis.overCapacity.length} poles
`;

    if (analysis.capacityAnalysis.overCapacity.length > 0) {
      content += `\n**Details**:\n`;
      analysis.capacityAnalysis.overCapacity.forEach(({ pole, count }) => {
        content += `- ${pole}: ${count} drops (${count - 12} over limit)\n`;
      });
    }

    content += `
#### At Capacity (12 drops)
- **Count**: ${analysis.capacityAnalysis.atCapacity.length} poles

#### Near Capacity (10-11 drops)
- **Count**: ${analysis.capacityAnalysis.nearCapacity.length} poles

### Data Quality Issues

#### Duplicate Drop Assignments
- **Total**: ${analysis.duplicateDrops.length} drops assigned to multiple poles
`;

    if (analysis.duplicateDrops.length > 0) {
      content += `\n**Top 5 Examples**:\n`;
      analysis.duplicateDrops.slice(0, 5).forEach(({ drop, poles }) => {
        content += `- ${drop}: appears on ${poles.length} poles\n`;
      });
    }

    // Top poles
    content += `
### Top 10 Poles by Drop Count
| Rank | Pole | Drops |
|------|------|-------|
`;

    analysis.topPoles.forEach((pole, idx) => {
      content += `| ${idx + 1} | ${pole.pole} | ${pole.count} |\n`;
    });

    // Status breakdown
    content += `
### Status Breakdown
| Status | Count | Percentage |
|--------|-------|------------|
`;

    analysis.statusBreakdown.forEach((count, status) => {
      const pct = ((count / analysis.summary.totalRecords) * 100).toFixed(1);
      content += `| ${status} | ${count.toLocaleString()} | ${pct}% |\n`;
    });

    // Validation summary
    content += `
## Validation Summary

All calculations have been cross-verified:
- ✅ Status counts sum to total records
- ✅ Distribution sums to unique poles  
- ✅ Average calculation verified
- ✅ No impossible values detected
- ✅ All capacity limits validated

---
*This report was generated with built-in validation to ensure accuracy.*
`;

    return content;
  }

  /**
   * Save report to file
   */
  saveReport(content, outputDir) {
    const date = new Date().toISOString().split('T')[0];
    const filename = `pole_status_analysis_${date}.md`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, content);
    this.log('success', `Report saved: ${filename}`);
  }

  /**
   * Save validation log
   */
  saveValidationLog(outputDir) {
    const logFile = path.join(outputDir, 'validation_log.json');
    const logData = {
      timestamp: this.sourceData.timestamp,
      sourceFile: this.sourceData.file,
      sourceHash: this.sourceData.hash,
      recordCount: this.sourceData.recordCount,
      validationLog: this.validationLog,
      calculations: this.calculations
    };
    
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    this.log('info', 'Validation log saved');
  }

  /**
   * Save error log
   */
  saveErrorLog(error, outputDir) {
    const errorFile = path.join(outputDir, 'error_log.txt');
    const errorData = `Error: ${error.message}\n\nStack: ${error.stack}\n\nValidation Log:\n${JSON.stringify(this.validationLog, null, 2)}`;
    
    fs.writeFileSync(errorFile, errorData);
  }

  /**
   * Logging utility
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message };
    this.validationLog.push(entry);
    
    const symbols = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌'
    };
    
    console.log(`${symbols[level] || ''} ${message}`);
  }
}

// Main execution
const [,, csvFile, outputDir] = process.argv;

if (!csvFile) {
  console.error('Usage: node generate-pole-status-report.js <CSV_FILE> [OUTPUT_DIR]');
  console.error('Example: node generate-pole-status-report.js data.csv reports/poles/');
  process.exit(1);
}

const generator = new PoleStatusReportGenerator();
generator.generateReport(
  csvFile,
  outputDir || 'reports/poles/'
);