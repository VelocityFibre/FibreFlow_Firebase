# SOW Module - Validation Rules & Error Scenarios

## Overview
This document defines all validation rules, error scenarios, and edge cases for the SOW module. Each rule includes the business logic, implementation details, and user-friendly error messages.

## Validation Categories

### 1. File-Level Validation

#### 1.1 File Format Validation
```typescript
interface FileValidation {
  // Accepted formats
  acceptedFormats: ['.xlsx', '.xls'];
  maxFileSize: 50 * 1024 * 1024; // 50MB
  
  // Validation rules
  rules: {
    format: {
      check: (file: File) => this.acceptedFormats.includes(getExtension(file)),
      error: 'Please upload an Excel file (.xlsx or .xls)'
    },
    size: {
      check: (file: File) => file.size <= this.maxFileSize,
      error: 'File size must be less than 50MB'
    },
    readability: {
      check: async (file: File) => await this.canReadFile(file),
      error: 'Unable to read file. Please ensure it is not password protected'
    }
  }
}
```

#### 1.2 Required Columns Validation
```typescript
interface RequiredColumns {
  poles: {
    required: ['label_1', 'status', 'latitude', 'longitude'],
    optional: ['pon_no', 'zone_no', 'created_date'],
    aliases: {
      'label_1': ['pole_number', 'pole_id', 'pole'],
      'status': ['permission_status', 'pole_status'],
      'latitude': ['lat', 'y'],
      'longitude': ['lon', 'lng', 'x']
    }
  },
  drops: {
    required: ['label', 'strtfeat'],
    optional: ['endfeat', 'pon', 'zone'],
    aliases: {
      'label': ['drop_number', 'drop_id', 'drop'],
      'strtfeat': ['pole', 'pole_number', 'start_feature'],
      'endfeat': ['ont', 'ont_reference', 'end_feature']
    }
  },
  fibre: {
    required: ['length_m'],
    optional: ['route_id', 'type', 'cable_id'],
    aliases: {
      'length_m': ['length', 'cable_length', 'distance']
    }
  }
}
```

### 2. Data Validation Rules

#### 2.1 Pole Data Validation
```typescript
const poleValidationRules = {
  // Pole number format
  poleNumber: {
    pattern: /^[A-Z]{3}\.P\.[A-Z0-9]+$/,  // e.g., LAW.P.B167
    required: true,
    error: 'Pole number must follow format: XXX.P.XXXX (e.g., LAW.P.B167)',
    autoFix: (value: string) => value.toUpperCase().replace(/\s+/g, '')
  },
  
  // Status validation
  status: {
    validValues: [
      'Pole Permission: Approved',
      'Pole Permission: Pending',
      'Pole Permission: Declined',
      'Pole Permission: In Progress'
    ],
    required: true,
    error: 'Invalid pole status',
    autoFix: (value: string) => {
      // Fuzzy match to closest valid status
      return this.findClosestMatch(value, this.validValues);
    }
  },
  
  // GPS coordinates
  coordinates: {
    latitude: {
      min: -90,
      max: 90,
      required: true,
      error: 'Latitude must be between -90 and 90',
      validate: (val: number) => !isNaN(val) && val >= -90 && val <= 90
    },
    longitude: {
      min: -180,
      max: 180,
      required: true,
      error: 'Longitude must be between -180 and 180',
      validate: (val: number) => !isNaN(val) && val >= -180 && val <= 180
    },
    // South Africa specific bounds
    southAfricaBounds: {
      lat: { min: -35, max: -22 },
      lng: { min: 16, max: 33 },
      warning: 'Coordinates appear to be outside South Africa'
    }
  },
  
  // PON validation
  pon: {
    pattern: /^PON\d{2,3}$/,  // e.g., PON01, PON123
    required: false,
    error: 'PON must follow format: PON## (e.g., PON01)',
    autoFix: (value: string) => {
      if (!value) return '';
      return 'PON' + value.replace(/\D/g, '').padStart(2, '0');
    }
  },
  
  // Zone validation
  zone: {
    pattern: /^Zone\s?\d+$/i,  // e.g., Zone 1, Zone1
    required: false,
    error: 'Zone must follow format: Zone # (e.g., Zone 1)',
    autoFix: (value: string) => {
      if (!value) return '';
      const num = value.match(/\d+/)?.[0];
      return num ? `Zone ${num}` : value;
    }
  }
};
```

#### 2.2 Drop Data Validation
```typescript
const dropValidationRules = {
  // Drop number format
  dropNumber: {
    pattern: /^[A-Z]{2,4}\d{4,6}$/,  // e.g., DR1234, DROP123456
    required: true,
    error: 'Drop number must contain letters followed by numbers',
    unique: true,
    uniqueError: 'Duplicate drop number found'
  },
  
  // Pole reference
  poleReference: {
    required: true,
    mustExist: true,
    error: 'Drop references non-existent pole',
    crossValidate: (dropPole: string, polesList: string[]) => {
      return polesList.includes(dropPole);
    }
  },
  
  // ONT reference (indicates active connection)
  ontReference: {
    pattern: /^ONT.*/i,
    required: false,
    indicates: 'home_signup',
    validate: (value: string) => {
      return !value || value.toUpperCase().startsWith('ONT');
    }
  },
  
  // Capacity constraint
  poleCapacity: {
    maxDropsPerPole: 12,
    error: 'Pole {pole} exceeds maximum capacity of 12 drops',
    validate: (poleDropMap: Map<string, string[]>) => {
      const errors = [];
      for (const [pole, drops] of poleDropMap) {
        if (drops.length > 12) {
          errors.push({
            pole,
            dropCount: drops.length,
            excess: drops.length - 12
          });
        }
      }
      return errors;
    }
  }
};
```

#### 2.3 Fibre Data Validation
```typescript
const fibreValidationRules = {
  // Cable length
  length: {
    min: 0,
    max: 100000, // 100km max per segment
    required: true,
    unit: 'meters',
    error: 'Cable length must be between 0 and 100,000 meters',
    warning: (length: number) => {
      if (length > 10000) return 'Cable length > 10km - please verify';
      if (length < 1) return 'Cable length < 1m - please verify';
      return null;
    }
  },
  
  // Cable type
  cableType: {
    validTypes: ['Aerial', 'Underground', 'Duct', 'Direct Burial'],
    required: false,
    error: 'Invalid cable type',
    autoMap: {
      'A': 'Aerial',
      'U': 'Underground',
      'D': 'Duct',
      'DB': 'Direct Burial'
    }
  },
  
  // Route validation
  route: {
    pattern: /^R\d{3,4}$/,  // e.g., R001, R1234
    required: false,
    error: 'Route must follow format: R### (e.g., R001)'
  }
};
```

### 3. Cross-File Validation

#### 3.1 Relationship Validation
```typescript
interface CrossFileValidation {
  // All drops must reference existing poles
  dropPoleMismatch: {
    validate: (poles: string[], drops: DropImportData[]) => {
      const mismatches = drops.filter(d => !poles.includes(d.strtfeat));
      return {
        valid: mismatches.length === 0,
        errors: mismatches.map(d => ({
          drop: d.label,
          referencedPole: d.strtfeat,
          message: `Drop ${d.label} references non-existent pole ${d.strtfeat}`
        }))
      };
    }
  },
  
  // PON/Zone consistency
  ponZoneConsistency: {
    validate: (poles: PoleImportData[], drops: DropImportData[]) => {
      const inconsistencies = [];
      drops.forEach(drop => {
        const pole = poles.find(p => p.label_1 === drop.strtfeat);
        if (pole && drop.pon && pole.pon_no !== drop.pon) {
          inconsistencies.push({
            drop: drop.label,
            dropPON: drop.pon,
            polePON: pole.pon_no
          });
        }
      });
      return inconsistencies;
    }
  },
  
  // Geographic clustering
  geographicValidation: {
    maxDistanceBetweenPoles: 1000, // meters
    validate: (poles: PoleImportData[]) => {
      // Check for poles that are too far from others
      const outliers = this.findGeographicOutliers(poles);
      return outliers.map(p => ({
        pole: p.label_1,
        warning: 'Pole appears isolated from others - verify coordinates'
      }));
    }
  }
}
```

### 4. Business Logic Validation

#### 4.1 Calculation Validation
```typescript
const calculationValidation = {
  // Daily targets must be achievable
  dailyTargets: {
    maxPolesPerDay: 20,
    maxHomesPerDay: 15,
    maxFibrePerDay: 2000, // meters
    validate: (targets: DailyTargets) => {
      const warnings = [];
      if (targets.polesPlantedDaily > this.maxPolesPerDay) {
        warnings.push(`Daily pole target (${targets.polesPlantedDaily}) seems high`);
      }
      if (targets.homesConnectedDaily > this.maxHomesPerDay) {
        warnings.push(`Daily homes target (${targets.homesConnectedDaily}) seems high`);
      }
      return warnings;
    }
  },
  
  // Project duration sanity check
  projectDuration: {
    minDays: 5,
    maxDays: 365,
    validate: (estimatedDays: number) => {
      if (estimatedDays < this.minDays) {
        return 'Project duration too short - minimum 5 days';
      }
      if (estimatedDays > this.maxDays) {
        return 'Project duration too long - maximum 365 days';
      }
      return null;
    }
  }
};
```

### 5. Data Quality Checks

#### 5.1 Duplicate Detection
```typescript
const duplicateDetection = {
  // Pole duplicates
  poles: {
    checkField: 'label_1',
    action: 'merge', // merge, reject, or keep-first
    mergeStrategy: (duplicates: PoleImportData[]) => {
      // Keep the one with most complete data
      return duplicates.reduce((best, current) => {
        const bestScore = this.calculateCompleteness(best);
        const currentScore = this.calculateCompleteness(current);
        return currentScore > bestScore ? current : best;
      });
    }
  },
  
  // Drop duplicates
  drops: {
    checkField: 'label',
    action: 'reject',
    error: 'Duplicate drop numbers are not allowed'
  },
  
  // Coordinate duplicates (same location)
  coordinates: {
    tolerance: 0.00001, // ~1 meter
    warning: 'Multiple poles at same coordinates'
  }
};
```

#### 5.2 Data Completeness
```typescript
const completenessChecks = {
  // Minimum required data percentage
  minimumCompleteness: {
    poles: 0.80, // 80% of poles must have complete data
    drops: 0.90, // 90% of drops must have pole reference
    validate: (data: any[], requiredFields: string[]) => {
      const complete = data.filter(item => 
        requiredFields.every(field => item[field] != null && item[field] !== '')
      );
      const percentage = complete.length / data.length;
      return {
        percentage,
        passed: percentage >= this.minimumCompleteness.poles,
        message: `Only ${(percentage * 100).toFixed(1)}% of records are complete`
      };
    }
  }
};
```

### 6. Error Messages & User Guidance

#### 6.1 Error Message Templates
```typescript
const errorMessages = {
  // Categorized by severity
  critical: {
    NO_POLES_FOUND: {
      message: 'No valid poles found in the uploaded file',
      suggestion: 'Please check that you selected the correct file and it contains pole data',
      action: 'Re-upload poles file'
    },
    DROPS_WITHOUT_POLES: {
      message: '{count} drops reference non-existent poles',
      suggestion: 'Upload poles file before drops, or check pole numbers match',
      action: 'Fix pole references'
    }
  },
  
  warning: {
    HIGH_DAILY_TARGET: {
      message: 'Daily targets seem unusually high',
      suggestion: 'Verify the estimated project duration is correct',
      action: 'Adjust project duration'
    },
    MISSING_OPTIONAL_DATA: {
      message: 'Some optional fields are missing (PON, Zone)',
      suggestion: 'This won\'t prevent import but may affect reporting',
      action: 'Continue anyway'
    }
  },
  
  info: {
    COORDINATE_PRECISION: {
      message: 'GPS coordinates have been rounded to 6 decimal places',
      suggestion: 'This maintains ~10cm accuracy',
      action: null
    }
  }
};
```

#### 6.2 Auto-Fix Suggestions
```typescript
interface AutoFixSuggestion {
  issue: string;
  canAutoFix: boolean;
  autoFixAction?: () => void;
  manualFixInstructions?: string;
  
  examples: {
    POLE_FORMAT: {
      issue: 'Incorrect pole number format',
      canAutoFix: true,
      autoFixAction: () => this.standardizePoleNumbers(),
      example: 'law.p.b167 → LAW.P.B167'
    },
    COORDINATE_SWAP: {
      issue: 'Latitude/Longitude appear swapped',
      canAutoFix: true,
      autoFixAction: () => this.swapCoordinates(),
      detection: (lat: number, lng: number) => {
        // For South Africa, lat should be negative, lng positive
        return lat > 0 && lng < 0;
      }
    }
  }
}
```

### 7. Validation Performance Optimization

```typescript
class ValidationOptimizer {
  // Batch validation for large datasets
  async validateInBatches<T>(
    data: T[],
    validator: (items: T[]) => ValidationResult,
    batchSize = 1000
  ): Promise<ValidationResult[]> {
    const batches = this.chunk(data, batchSize);
    const results = [];
    
    for (const batch of batches) {
      results.push(await validator(batch));
    }
    
    return this.mergeValidationResults(results);
  }
  
  // Cache validation results
  private validationCache = new Map<string, ValidationResult>();
  
  getCachedOrValidate(key: string, validator: () => ValidationResult): ValidationResult {
    if (this.validationCache.has(key)) {
      return this.validationCache.get(key)!;
    }
    
    const result = validator();
    this.validationCache.set(key, result);
    return result;
  }
  
  // Parallel validation
  async validateInParallel(validations: Array<() => Promise<ValidationResult>>) {
    return Promise.all(validations);
  }
}
```

### 8. Validation Report Structure

```typescript
interface ValidationReport {
  summary: {
    totalRecords: number;
    validRecords: number;
    errorCount: number;
    warningCount: number;
    autoFixAvailable: number;
    validationDuration: number; // ms
  };
  
  fileReports: {
    poles: FileValidationReport;
    drops: FileValidationReport;
    fibre: FileValidationReport;
  };
  
  crossFileValidation: {
    passed: boolean;
    issues: CrossFileIssue[];
  };
  
  recommendations: {
    critical: string[];  // Must fix before import
    warnings: string[];  // Should review
    info: string[];      // FYI only
  };
  
  autoFixReport?: {
    available: AutoFix[];
    applied: AutoFix[];
    manual: ManualFix[];
  };
}
```

## Validation UI/UX Flow

### 1. Real-time Validation
- Validate as user uploads each file
- Show inline errors immediately
- Provide quick fix buttons where possible

### 2. Progressive Validation
- File format → Required columns → Data validation → Cross-file validation
- Allow user to fix errors at each stage

### 3. Validation Summary Dashboard
- Visual indicators (traffic light system)
- Expandable error details
- Export validation report
- One-click auto-fix for applicable issues

## Error Recovery Strategies

### 1. Partial Import
- Allow importing valid records only
- Flag invalid records for manual review
- Create error log for failed records

### 2. Data Correction Wizard
- Step-by-step error resolution
- Bulk edit capabilities
- Preview changes before applying

### 3. Template Generation
- Generate Excel template with correct format
- Include sample data
- Add validation rules to Excel cells