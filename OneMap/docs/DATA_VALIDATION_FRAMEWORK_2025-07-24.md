# OneMap Data Validation Framework
*Version 1.0 - 2025-07-24*

## Executive Summary

This framework prevents data integrity issues and reporting errors through systematic validation at every stage of the data pipeline.

## Core Principles

1. **Validate Early, Validate Often** - Check data integrity at each transformation
2. **Fail Fast** - Stop processing when validation fails
3. **Clear Error Reporting** - Provide actionable error messages
4. **Automated Verification** - No manual calculations without verification
5. **Audit Everything** - Maintain complete validation logs

## Validation Layers

### Layer 1: Input Validation (CSV Import)

```javascript
const InputValidation = {
  // File integrity
  checkFileIntegrity: {
    encoding: 'UTF-8',
    delimiter: ';',
    hasHeader: true,
    minColumns: 17,
    requiredColumns: ['Property ID', 'Pole Number', 'Drop Number']
  },
  
  // Data type validation
  fieldValidation: {
    propertyId: /^[0-9]+$/,
    poleNumber: /^LAW\.[A-Z]\.[A-Z0-9]+$/,
    dropNumber: /^(DR[0-9]+|no drop allocated)?$/,
    gps: { lat: [-90, 90], lng: [-180, 180] }
  },
  
  // Duplicate detection
  duplicateChecks: {
    propertyId: 'unique per import',
    dropNumber: 'unique across system',
    poleDropCombo: 'track for analysis'
  }
};
```

### Layer 2: Business Rule Validation

```javascript
const BusinessRules = {
  // Capacity rules
  poleCapacity: {
    maxDropsPerPole: 12,
    warningThreshold: 10,
    action: 'reject if exceeded'
  },
  
  // Drop assignment rules
  dropAssignment: {
    uniqueness: 'one drop per pole only',
    reassignment: 'requires approval',
    validation: 'check existing assignments'
  },
  
  // Status progression
  statusFlow: {
    allowed: [
      'Pole Permission: Approved',
      'Home Sign Ups: Approved & Installation Scheduled',
      'Home Installation: In Progress',
      'Home Installation: Installed'
    ],
    validation: 'must follow sequence'
  }
};
```

### Layer 3: Calculation Validation

```javascript
const CalculationValidation = {
  // Always count unique values
  uniqueCounting: {
    poles: 'COUNT(DISTINCT pole_number)',
    drops: 'COUNT(DISTINCT drop_number)',
    never: 'COUNT(*) for unique metrics'
  },
  
  // Cross-verification
  crossChecks: {
    totalRecords: 'sum of all status counts',
    avgCalculation: 'total_drops / unique_poles',
    percentages: 'must sum to 100%'
  },
  
  // Sanity checks
  sanityLimits: {
    maxDropsPerPole: 12,
    minDropsPerPole: 0,
    avgDropsRange: [0, 12]
  }
};
```

### Layer 4: Report Generation Validation

```javascript
const ReportValidation = {
  // Pre-generation checks
  preChecks: {
    dataCompleteness: 'all required fields present',
    calculationVerification: 'run independent verification',
    historicalComparison: 'check against previous reports'
  },
  
  // Report content validation
  contentChecks: {
    mandatoryFields: ['total records', 'unique poles', 'capacity analysis'],
    calculations: 'show formulas used',
    dataSource: 'include file path and timestamp'
  },
  
  // Post-generation verification
  postChecks: {
    spotCheck: 'verify 10 random records',
    extremeValues: 'verify highest/lowest values',
    crossReference: 'check against source data'
  }
};
```

## Implementation Components

### 1. Validation Service

```javascript
class DataValidationService {
  constructor() {
    this.validationLog = [];
    this.errorThreshold = 0.01; // 1% error tolerance
  }
  
  validateCSVImport(file) {
    const results = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    // Check file integrity
    if (!this.checkEncoding(file)) {
      results.failed.push('Invalid file encoding');
    }
    
    // Validate headers
    const headers = this.extractHeaders(file);
    const missingHeaders = this.checkRequiredHeaders(headers);
    if (missingHeaders.length > 0) {
      results.failed.push(`Missing headers: ${missingHeaders.join(', ')}`);
    }
    
    // Process records
    const records = this.parseRecords(file);
    const validation = this.validateRecords(records);
    
    return {
      valid: results.failed.length === 0,
      results,
      summary: this.generateSummary(validation)
    };
  }
  
  validatePoleCapacity(poleDropMap) {
    const violations = [];
    
    for (const [pole, drops] of poleDropMap.entries()) {
      const dropCount = drops.size;
      
      if (dropCount > 12) {
        violations.push({
          pole,
          drops: dropCount,
          excess: dropCount - 12,
          severity: 'critical'
        });
      } else if (dropCount >= 10) {
        violations.push({
          pole,
          drops: dropCount,
          remaining: 12 - dropCount,
          severity: 'warning'
        });
      }
    }
    
    return violations;
  }
  
  validateDropUniqueness(dropPoleMap) {
    const duplicates = [];
    
    for (const [drop, poles] of dropPoleMap.entries()) {
      if (poles.size > 1) {
        duplicates.push({
          drop,
          poles: Array.from(poles),
          count: poles.size
        });
      }
    }
    
    return duplicates;
  }
  
  validateCalculations(report) {
    const errors = [];
    
    // Check total records
    const statusSum = Object.values(report.statusCounts).reduce((a, b) => a + b, 0);
    if (statusSum !== report.totalRecords) {
      errors.push(`Status sum (${statusSum}) doesn't match total records (${report.totalRecords})`);
    }
    
    // Check average calculation
    const calculatedAvg = report.totalDrops / report.uniquePoles;
    if (Math.abs(calculatedAvg - report.avgDropsPerPole) > 0.01) {
      errors.push(`Average calculation error: ${calculatedAvg} vs ${report.avgDropsPerPole}`);
    }
    
    // Check percentage sum
    const percentSum = Object.values(report.distribution)
      .reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(percentSum - 100) > 0.1) {
      errors.push(`Percentages sum to ${percentSum}%, not 100%`);
    }
    
    return errors;
  }
}
```

### 2. Report Generator with Validation

```javascript
class ValidatedReportGenerator {
  constructor(validationService) {
    this.validator = validationService;
  }
  
  generateReport(data, outputPath) {
    // Step 1: Validate input data
    const dataValidation = this.validator.validateCSVImport(data);
    if (!dataValidation.valid) {
      throw new Error(`Data validation failed: ${dataValidation.results.failed.join(', ')}`);
    }
    
    // Step 2: Process and calculate
    const calculations = this.performCalculations(data);
    
    // Step 3: Validate calculations
    const calcErrors = this.validator.validateCalculations(calculations);
    if (calcErrors.length > 0) {
      throw new Error(`Calculation errors: ${calcErrors.join(', ')}`);
    }
    
    // Step 4: Generate report with verification
    const report = this.createReport(calculations);
    
    // Step 5: Post-generation verification
    const verification = this.verifyReport(report, data);
    if (!verification.passed) {
      throw new Error(`Report verification failed: ${verification.errors.join(', ')}`);
    }
    
    // Step 6: Add validation certificate
    report.validation = {
      timestamp: new Date().toISOString(),
      dataHash: this.hashData(data),
      validationPassed: true,
      validator: 'DataValidationService v1.0'
    };
    
    return report;
  }
  
  verifyReport(report, sourceData) {
    const verification = {
      passed: true,
      errors: [],
      warnings: []
    };
    
    // Spot check specific values
    const spotChecks = [
      { pole: 'LAW.P.A788', field: 'drops' },
      { pole: 'LAW.P.A013', field: 'drops' }
    ];
    
    for (const check of spotChecks) {
      const reportValue = report.poleData[check.pole]?.[check.field];
      const actualValue = this.getActualValue(sourceData, check.pole, check.field);
      
      if (reportValue !== actualValue) {
        verification.passed = false;
        verification.errors.push(
          `${check.pole} ${check.field}: report says ${reportValue}, actual is ${actualValue}`
        );
      }
    }
    
    return verification;
  }
}
```

### 3. Automated Testing Suite

```javascript
const ValidationTests = {
  // Test duplicate drop detection
  testDuplicateDropDetection: () => {
    const testData = [
      { pole: 'LAW.P.A001', drop: 'DR001' },
      { pole: 'LAW.P.A002', drop: 'DR001' }, // Duplicate
      { pole: 'LAW.P.A003', drop: 'DR002' }
    ];
    
    const validator = new DataValidationService();
    const duplicates = validator.validateDropUniqueness(testData);
    
    assert(duplicates.length === 1, 'Should detect 1 duplicate');
    assert(duplicates[0].drop === 'DR001', 'Should identify DR001 as duplicate');
  },
  
  // Test capacity validation
  testCapacityValidation: () => {
    const testPole = 'LAW.P.A999';
    const drops = new Set();
    
    // Add 13 drops (over capacity)
    for (let i = 1; i <= 13; i++) {
      drops.add(`DR${i.toString().padStart(3, '0')}`);
    }
    
    const validator = new DataValidationService();
    const violations = validator.validatePoleCapacity(new Map([[testPole, drops]]));
    
    assert(violations.length === 1, 'Should detect capacity violation');
    assert(violations[0].severity === 'critical', 'Should be critical severity');
  },
  
  // Test calculation validation
  testCalculationValidation: () => {
    const report = {
      totalRecords: 100,
      uniquePoles: 50,
      totalDrops: 150,
      avgDropsPerPole: 2.5, // Intentionally wrong (should be 3.0)
      statusCounts: { approved: 60, scheduled: 40 }
    };
    
    const validator = new DataValidationService();
    const errors = validator.validateCalculations(report);
    
    assert(errors.length > 0, 'Should detect calculation error');
    assert(errors[0].includes('Average calculation error'), 'Should identify avg error');
  }
};
```

## Validation Checkpoints

### Daily Processing
1. **Import Stage**: Validate CSV structure and data types
2. **Staging Stage**: Check business rules and duplicates
3. **Processing Stage**: Verify calculations and transformations
4. **Production Stage**: Confirm data integrity maintained
5. **Report Stage**: Validate all metrics and calculations

### Quality Metrics
- **Data Quality Score**: Percentage of records passing all validations
- **Duplicate Rate**: Number of duplicate drops detected
- **Capacity Utilization**: Poles approaching or exceeding limits
- **Processing Errors**: Failed validations per batch

## Error Handling

### Validation Failures
```javascript
const ErrorHandling = {
  // Critical errors - stop processing
  critical: {
    fileCorruption: 'STOP - Manual intervention required',
    schemaViolation: 'STOP - Fix schema issues first',
    capacityViolation: 'STOP - Review capacity limits'
  },
  
  // Warnings - continue with flags
  warnings: {
    duplicateDrops: 'FLAG - Continue but mark for review',
    missingFields: 'FLAG - Use defaults where safe',
    nearCapacity: 'FLAG - Alert operations team'
  },
  
  // Info - log for monitoring
  info: {
    processingTime: 'LOG - Track performance',
    recordCounts: 'LOG - Monitor growth',
    validationPassed: 'LOG - Audit trail'
  }
};
```

## Monitoring Dashboard

### Key Indicators
1. **Validation Success Rate**: Target >99.9%
2. **Average Processing Time**: Target <10 seconds
3. **Duplicate Detection Rate**: Track trends
4. **Capacity Warnings**: Proactive alerts
5. **Report Accuracy**: 100% verification passed

## Implementation Timeline

### Phase 1: Core Validation (Week 1)
- Implement DataValidationService
- Add CSV import validation
- Create unit tests

### Phase 2: Business Rules (Week 2)
- Add capacity validation
- Implement drop uniqueness checks
- Create validation reports

### Phase 3: Report Validation (Week 3)
- Update report generators
- Add calculation verification
- Implement spot checks

### Phase 4: Monitoring (Week 4)
- Create validation dashboard
- Set up alerts
- Document procedures

## Success Criteria

1. **Zero false reports** like the July 23 incident
2. **100% calculation accuracy** in all reports
3. **<1% data quality issues** pass through
4. **Real-time validation** feedback
5. **Complete audit trail** for all validations

---

*This framework ensures data integrity from source to report, preventing calculation errors and false capacity warnings.*