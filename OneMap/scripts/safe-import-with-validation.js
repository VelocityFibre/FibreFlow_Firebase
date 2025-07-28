/**
 * Safe Import with Validation
 * Wraps existing import scripts with comprehensive validation
 */

const fs = require('fs');
const path = require('path');
const { validateCSV } = require('./validate-csv-structure');
const validationRules = require('./field-validation-rules');

// Color console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

/**
 * Enhanced validation with field-level rules
 */
async function enhancedValidation(csvPath) {
  log('\n🔍 Running Enhanced CSV Validation...', 'blue');
  
  try {
    // Step 1: Basic structure validation
    log('1. Checking CSV structure...', 'blue');
    const basicReport = await validateCSV(csvPath);
    
    // Step 2: Apply quality thresholds
    log('2. Applying quality thresholds...', 'blue');
    const thresholds = validationRules.qualityThresholds;
    
    const validationRate = parseFloat(basicReport.validationRate);
    
    // Critical validation check
    if (validationRate < thresholds.criticalValidationRate) {
      log(`❌ CRITICAL: Validation rate ${validationRate}% is below critical threshold ${thresholds.criticalValidationRate}%`, 'red');
      log('This file should NOT be imported!', 'red');
      return {
        canImport: false,
        reason: 'CRITICAL_VALIDATION_FAILURE',
        validationRate,
        report: basicReport
      };
    }
    
    // Warning validation check
    if (validationRate < thresholds.minValidationRate) {
      log(`⚠️  WARNING: Validation rate ${validationRate}% is below recommended threshold ${thresholds.minValidationRate}%`, 'yellow');
      log('Consider reviewing errors before importing', 'yellow');
      return {
        canImport: true,
        warning: true,
        reason: 'LOW_VALIDATION_RATE',
        validationRate,
        report: basicReport
      };
    }
    
    // Success
    log(`✅ Validation rate ${validationRate}% - File ready for import`, 'green');
    return {
      canImport: true,
      validationRate,
      report: basicReport
    };
    
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, 'red');
    return {
      canImport: false,
      reason: 'VALIDATION_ERROR',
      error: error.message
    };
  }
}

/**
 * Interactive import decision
 */
async function getImportDecision(validationResult) {
  if (validationResult.canImport && !validationResult.warning) {
    return true; // Auto-proceed for clean files
  }
  
  if (!validationResult.canImport) {
    log('\n🚫 Import blocked due to validation failures', 'red');
    return false;
  }
  
  // For warning cases, ask for confirmation
  log('\n⚠️  Import requires manual approval due to data quality issues', 'yellow');
  log('Issues found:', 'yellow');
  
  if (validationResult.report.fieldShiftDetected) {
    log('- Field shift detected (data corruption)', 'yellow');
  }
  
  if (validationResult.report.invalidRows > 0) {
    log(`- ${validationResult.report.invalidRows} invalid rows found`, 'yellow');
  }
  
  // In a real environment, you could add readline for interactive input
  // For now, default to requiring manual review
  log('\n📋 Please review the validation report before proceeding', 'blue');
  log('Run with --force to override warnings (not recommended)', 'blue');
  
  return false;
}

/**
 * Generate comprehensive report
 */
function generateComprehensiveReport(csvPath, validationResult) {
  const reportPath = path.join(
    path.dirname(csvPath),
    `validation-report-${path.basename(csvPath, '.csv')}-${Date.now()}.md`
  );
  
  const report = validationResult.report;
  
  const content = `# Comprehensive Validation Report

## File Information
- **File**: ${path.basename(csvPath)}
- **Date**: ${new Date().toLocaleString()}
- **Size**: ${fs.statSync(csvPath).size} bytes

## Validation Summary
- **Total Rows**: ${report.totalRows}
- **Valid Rows**: ${report.validRows} (${report.validationRate}%)
- **Invalid Rows**: ${report.invalidRows}
- **Can Import**: ${validationResult.canImport ? '✅ YES' : '❌ NO'}
- **Field Shift Detected**: ${report.fieldShiftDetected ? '⚠️ YES' : '✅ NO'}

## Quality Assessment
${validationResult.canImport ? 
  (validationResult.warning ? 
    '⚠️ **WARNING**: File has quality issues but can be imported with caution' :
    '✅ **PASS**: File meets quality standards for import'
  ) :
  '❌ **FAIL**: File does not meet minimum quality standards'
}

## Validation Issues
${report.errors.length === 0 ? '✅ No validation errors found!' : 
  `${report.errors.length} validation errors found (showing first 10):\n\n` +
  report.errors.slice(0, 10).map((error, i) => 
    `### ${i + 1}. Row ${error.row} (Property ID: ${error.propertyId})
${error.errors.map(e => `- **${e.column}**: ${e.error}
  Value: "${e.value}"`).join('\n')}
`).join('\n')}

## Recommendations
${report.recommendations.length === 0 ? 'No specific recommendations' :
  report.recommendations.map(r => `- ${r}`).join('\n')}

## Next Steps
${validationResult.canImport ? 
  (validationResult.warning ? 
    '1. Review validation errors above\n2. Consider re-exporting CSV from source\n3. If issues are acceptable, proceed with import using --force flag' :
    '1. Proceed with import\n2. Monitor import process for any runtime errors'
  ) :
  '1. **DO NOT IMPORT** - Fix data quality issues first\n2. Re-export CSV from source system\n3. Re-run validation on corrected file'
}

---
*Generated by OneMap Safe Import Validation System*
`;

  fs.writeFileSync(reportPath, content);
  log(`\n📄 Comprehensive report saved: ${reportPath}`, 'green');
  
  return reportPath;
}

/**
 * Main safe import function
 */
async function safeImport(csvPath, options = {}) {
  log('🛡️  OneMap Safe Import with Validation', 'blue');
  log('=====================================', 'blue');
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    log(`❌ File not found: ${csvPath}`, 'red');
    process.exit(1);
  }
  
  // Run validation
  const validationResult = await enhancedValidation(csvPath);
  
  // Generate comprehensive report
  const reportPath = generateComprehensiveReport(csvPath, validationResult);
  
  // Decide whether to proceed
  const shouldImport = options.force || await getImportDecision(validationResult);
  
  if (!shouldImport) {
    log('\n🚫 Import cancelled due to validation failures', 'red');
    log(`📄 Review the report: ${reportPath}`, 'blue');
    process.exit(1);
  }
  
  // If we reach here, validation passed or was overridden
  log('\n✅ Validation complete - proceeding with import', 'green');
  
  // Here you would call the actual import script
  // For example:
  if (options.importScript) {
    log(`\n🚀 Starting import using: ${options.importScript}`, 'blue');
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
      exec(`node ${options.importScript} "${csvPath}"`, (error, stdout, stderr) => {
        if (error) {
          log(`❌ Import failed: ${error.message}`, 'red');
          reject(error);
        } else {
          log('✅ Import completed successfully', 'green');
          log(stdout, 'reset');
          resolve(stdout);
        }
      });
    });
  } else {
    log('ℹ️  No import script specified - validation only mode', 'blue');
    return validationResult;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node safe-import-with-validation.js <csv-file> [options]

Options:
  --force              Override validation warnings (use with caution)
  --import-script=<path>  Specify import script to run after validation
  --validation-only    Run validation without importing

Examples:
  # Validation only
  node safe-import-with-validation.js data.csv
  
  # Validation with import
  node safe-import-with-validation.js data.csv --import-script=bulk-import-history-fast.js
  
  # Force import despite warnings
  node safe-import-with-validation.js data.csv --force --import-script=bulk-import-history-fast.js
`);
    process.exit(1);
  }
  
  const csvPath = args[0];
  const options = {
    force: args.includes('--force'),
    validationOnly: args.includes('--validation-only'),
    importScript: args.find(arg => arg.startsWith('--import-script='))?.split('=')[1]
  };
  
  try {
    await safeImport(csvPath, options);
  } catch (error) {
    log(`❌ Safe import failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { safeImport, enhancedValidation };