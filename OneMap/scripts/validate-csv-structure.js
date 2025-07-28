/**
 * CSV Structure Validation Script
 * Prevents data corruption issues like those found in June 22 CSV
 * 
 * Features:
 * - Validates CSV structure before import
 * - Checks for field shifts and column misalignment
 * - Detects text in numeric fields
 * - Identifies unescaped delimiters
 * - Generates detailed validation report
 */

const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');

// Expected column structure (based on OneMap CSV format)
const EXPECTED_COLUMNS = {
  'Property ID': { type: 'number', required: true },
  'Site': { type: 'string', required: true },
  'Sections': { type: 'string', required: false },
  'PONs': { type: 'string', required: false },
  'Location Address': { type: 'string', required: true },
  'Latitude': { type: 'coordinate', required: true },
  'Longitude': { type: 'coordinate', required: true },
  'Pole Number': { type: 'pole', required: false },
  'Drop Number': { type: 'string', required: false },
  'Status': { type: 'string', required: true },
  'Flow Name Groups': { type: 'string', required: false },
  'Field Agent Name (pole permission)': { type: 'string', required: false },
  'date_status_changed': { type: 'datetime', required: false },
  'lst_mod_dt': { type: 'datetime', required: false },
  'lst_mod_by': { type: 'string', required: false }
};

// Validation rules for different field types
const VALIDATORS = {
  number: (value) => {
    if (!value) return { valid: true };
    return {
      valid: /^\d+$/.test(value.trim()),
      error: 'Must be a numeric value'
    };
  },
  
  string: (value) => {
    // Check for suspicious patterns that indicate field shifts
    const suspiciousPatterns = [
      /and prior to the transfer/i,
      /shall also notify/i,
      /terms and conditions/i,
      /property or any/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        return {
          valid: false,
          error: 'Contains legal text - possible field shift'
        };
      }
    }
    return { valid: true };
  },
  
  coordinate: (value) => {
    if (!value) return { valid: false, error: 'Coordinate required' };
    
    // Check if it's a valid number
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid coordinate format' };
    }
    
    // Check if it's within valid GPS range
    // Latitude: -90 to 90, Longitude: -180 to 180
    if (Math.abs(num) > 180) {
      return { valid: false, error: 'Coordinate out of valid range' };
    }
    
    // Check for text in coordinate fields (June 22 issue)
    if (value.length > 20 || /[a-zA-Z]{5,}/.test(value)) {
      return { valid: false, error: 'Text detected in coordinate field' };
    }
    
    return { valid: true };
  },
  
  pole: (value) => {
    if (!value) return { valid: true }; // Pole number is optional
    
    // Check for datetime in pole field (June 22 issue)
    if (/^\d{4}\/\d{2}\/\d{2}/.test(value)) {
      return { valid: false, error: 'Date/time detected in pole number field' };
    }
    
    // Valid pole patterns: LAW.P.B167, LAW.P.C234, etc.
    const validPattern = /^[A-Z]{3,4}\.[A-Z]\.[A-Z]\d+$/;
    if (!validPattern.test(value) && value.trim() !== '') {
      return { valid: false, error: 'Invalid pole number format' };
    }
    
    return { valid: true };
  },
  
  datetime: (value) => {
    if (!value) return { valid: true };
    
    // Check for various datetime formats
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/, // ISO date
      /^\d{4}\/\d{2}\/\d{2}/, // Slash format
      /^\d{2}\/\d{2}\/\d{4}/ // US format
    ];
    
    const hasValidFormat = datePatterns.some(pattern => pattern.test(value));
    return {
      valid: hasValidFormat,
      error: hasValidFormat ? null : 'Invalid datetime format'
    };
  }
};

async function validateCSV(filePath) {
  console.log(`\n🔍 Validating CSV structure: ${path.basename(filePath)}\n`);
  
  const validationReport = {
    file: path.basename(filePath),
    timestamp: new Date().toISOString(),
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errors: [],
    warnings: [],
    fieldShiftDetected: false,
    recommendations: []
  };
  
  return new Promise((resolve, reject) => {
    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true
    });
    
    let rowNumber = 0;
    const columnCounts = {};
    
    parser.on('readable', function() {
      let record;
      while ((record = parser.read()) !== null) {
        rowNumber++;
        validationReport.totalRows++;
        
        // Count columns per row to detect shifts
        const columnCount = Object.keys(record).length;
        columnCounts[columnCount] = (columnCounts[columnCount] || 0) + 1;
        
        const rowErrors = [];
        
        // Validate each expected column
        for (const [columnName, rules] of Object.entries(EXPECTED_COLUMNS)) {
          const value = record[columnName];
          
          // Check if required field is missing
          if (rules.required && (!value || value.trim() === '')) {
            rowErrors.push({
              column: columnName,
              error: 'Required field is empty',
              value: value
            });
            continue;
          }
          
          // Validate field type
          if (value && VALIDATORS[rules.type]) {
            const validation = VALIDATORS[rules.type](value);
            if (!validation.valid) {
              rowErrors.push({
                column: columnName,
                error: validation.error,
                value: value.substring(0, 50) + (value.length > 50 ? '...' : '')
              });
              
              // Detect field shift patterns
              if (validation.error.includes('field shift')) {
                validationReport.fieldShiftDetected = true;
              }
            }
          }
        }
        
        if (rowErrors.length > 0) {
          validationReport.invalidRows++;
          validationReport.errors.push({
            row: rowNumber,
            propertyId: record['Property ID'],
            errors: rowErrors
          });
        } else {
          validationReport.validRows++;
        }
      }
    });
    
    parser.on('error', (err) => {
      validationReport.parserError = err.message;
      reject(err);
    });
    
    parser.on('end', () => {
      // Check for inconsistent column counts (indicates structural issues)
      const columnCountVariations = Object.keys(columnCounts).length;
      if (columnCountVariations > 1) {
        validationReport.warnings.push({
          type: 'COLUMN_COUNT_VARIATION',
          message: 'Inconsistent number of columns detected across rows',
          details: columnCounts
        });
        validationReport.recommendations.push(
          'Re-export CSV with proper delimiter escaping'
        );
      }
      
      // Calculate validation statistics
      validationReport.validationRate = 
        (validationReport.validRows / validationReport.totalRows * 100).toFixed(2);
      
      // Add recommendations based on issues found
      if (validationReport.fieldShiftDetected) {
        validationReport.recommendations.push(
          'Field shift detected - check for unescaped commas in text fields',
          'Review terms and conditions text for proper CSV escaping'
        );
      }
      
      if (validationReport.validationRate < 90) {
        validationReport.recommendations.push(
          'High error rate detected - consider re-exporting data from source',
          'Review CSV export settings for proper formatting'
        );
      }
      
      resolve(validationReport);
    });
    
    // Create read stream and pipe to parser
    const stream = fs.createReadStream(filePath);
    stream.pipe(parser);
  });
}

// Generate validation report
function generateReport(validationReport, outputPath) {
  const reportContent = `# CSV Validation Report

**File**: ${validationReport.file}
**Date**: ${new Date(validationReport.timestamp).toLocaleString()}

## Summary Statistics
- **Total Rows**: ${validationReport.totalRows}
- **Valid Rows**: ${validationReport.validRows} (${validationReport.validationRate}%)
- **Invalid Rows**: ${validationReport.invalidRows}
- **Field Shift Detected**: ${validationReport.fieldShiftDetected ? '⚠️ YES' : '✅ NO'}

## Validation Issues

${validationReport.errors.length === 0 ? '✅ No validation errors found!' : 
  validationReport.errors.slice(0, 50).map(error => 
    `### Row ${error.row} (Property ID: ${error.propertyId})
${error.errors.map(e => `- **${e.column}**: ${e.error}
  Value: "${e.value}"`).join('\n')}`
  ).join('\n\n')}

${validationReport.errors.length > 50 ? 
  `\n... and ${validationReport.errors.length - 50} more errors` : ''}

## Warnings
${validationReport.warnings.length === 0 ? 'No warnings' :
  validationReport.warnings.map(w => 
    `- **${w.type}**: ${w.message}\n  Details: ${JSON.stringify(w.details, null, 2)}`
  ).join('\n')}

## Recommendations
${validationReport.recommendations.length === 0 ? 'No recommendations' :
  validationReport.recommendations.map(r => `- ${r}`).join('\n')}
`;

  fs.writeFileSync(outputPath, reportContent);
  console.log(`\n📄 Validation report saved to: ${outputPath}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-csv-structure.js <csv-file> [output-report-path]');
    console.log('Example: node validate-csv-structure.js data.csv validation-report.md');
    process.exit(1);
  }
  
  const csvPath = args[0];
  const reportPath = args[1] || `validation-report-${Date.now()}.md`;
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }
  
  try {
    const validationReport = await validateCSV(csvPath);
    
    // Console summary
    console.log(`\n📊 Validation Summary:`);
    console.log(`- Total Rows: ${validationReport.totalRows}`);
    console.log(`- Valid: ${validationReport.validRows} (${validationReport.validationRate}%)`);
    console.log(`- Invalid: ${validationReport.invalidRows}`);
    
    if (validationReport.fieldShiftDetected) {
      console.log(`\n⚠️  WARNING: Field shift detected! This indicates CSV structure corruption.`);
    }
    
    if (validationReport.validationRate < 60) {
      console.log(`\n❌ CRITICAL: Validation rate below 60%. Do not import this file!`);
    } else if (validationReport.validationRate < 90) {
      console.log(`\n⚠️  WARNING: Validation rate below 90%. Review errors before importing.`);
    } else {
      console.log(`\n✅ Validation rate acceptable for import.`);
    }
    
    // Generate report
    generateReport(validationReport, reportPath);
    
    // Exit with appropriate code
    process.exit(validationReport.validationRate < 60 ? 1 : 0);
    
  } catch (error) {
    console.error(`\n❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { validateCSV, generateReport };