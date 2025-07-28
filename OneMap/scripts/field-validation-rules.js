/**
 * Field-Level Validation Rules for OneMap CSV Import
 * Prevents data quality issues by validating each field type
 */

module.exports = {
  // Core identification fields
  'Property ID': {
    type: 'integer',
    required: true,
    min: 1,
    max: 9999999,
    unique: true,
    errorMessage: 'Property ID must be a unique positive integer'
  },
  
  // Location fields
  'Site': {
    type: 'string',
    required: true,
    pattern: /^[A-Z]{3,10}$/,
    examples: ['LAW', 'LAWLEY', 'MOH', 'MOHADIN'],
    errorMessage: 'Site must be uppercase letters (3-10 chars)'
  },
  
  'Location Address': {
    type: 'string',
    required: true,
    minLength: 10,
    maxLength: 500,
    blacklist: [
      // Patterns that indicate field corruption
      /transfer of any title/i,
      /shall also notify/i,
      /terms and conditions/i,
      /company\/ies/i,
      /property or any/i
    ],
    errorMessage: 'Address must be valid street address without legal text'
  },
  
  // GPS Coordinates
  'Latitude': {
    type: 'decimal',
    required: true,
    min: -90,
    max: 90,
    precision: 6,
    // South Africa latitude range
    expectedRange: { min: -35, max: -22 },
    errorMessage: 'Latitude must be valid GPS coordinate for South Africa'
  },
  
  'Longitude': {
    type: 'decimal', 
    required: true,
    min: -180,
    max: 180,
    precision: 6,
    // South Africa longitude range
    expectedRange: { min: 16, max: 33 },
    errorMessage: 'Longitude must be valid GPS coordinate for South Africa'
  },
  
  // Infrastructure identifiers
  'Pole Number': {
    type: 'string',
    required: false,
    pattern: /^([A-Z]{3,4}\.[A-Z]\.[A-Z]\d{1,4})?$/,
    examples: ['LAW.P.B167', 'LAW.P.C234', 'MOH.P.A001'],
    blacklist: [
      // Dates incorrectly in pole field
      /^\d{4}\/\d{2}\/\d{2}/,
      /^\d{2}\/\d{2}\/\d{4}/
    ],
    errorMessage: 'Pole number must follow format: SITE.P.LETTER###'
  },
  
  'Drop Number': {
    type: 'string',
    required: false,
    pattern: /^(DR\d{4,6})?$/,
    unique: true,
    examples: ['DR1234', 'DR123456'],
    errorMessage: 'Drop number must follow format: DR##### (4-6 digits)'
  },
  
  // Status fields
  'Status': {
    type: 'enum',
    required: true,
    values: [
      'Survey Requested',
      'Survey Complete',
      'Pole Permission: Requested',
      'Pole Permission: Approved',
      'Pole Permission: Declined',
      'Home Sign Ups: Approved & Installation Scheduled',
      'Home Installation: In Progress',
      'Home Installation: Installed',
      'Home Installation: Declined'
    ],
    errorMessage: 'Status must be one of the defined workflow states'
  },
  
  'Flow Name Groups': {
    type: 'string',
    required: false,
    maxLength: 1000,
    pattern: /^([A-Za-z\s:,&-]+)?$/,
    errorMessage: 'Flow name groups must contain valid workflow history'
  },
  
  // Agent information
  'Field Agent Name (pole permission)': {
    type: 'string',
    required: false,
    pattern: /^([A-Za-z\s\.\-']+)?$/,
    minLength: 2,
    maxLength: 100,
    errorMessage: 'Agent name must contain only letters, spaces, dots, hyphens'
  },
  
  // Timestamps
  'date_status_changed': {
    type: 'datetime',
    required: false,
    formats: [
      'YYYY/MM/DD HH:mm:ss.SSS',
      'YYYY-MM-DD HH:mm:ss.SSS',
      'YYYY/MM/DD HH:mm:ss',
      'YYYY-MM-DD HH:mm:ss'
    ],
    errorMessage: 'Date must be in valid datetime format'
  },
  
  'lst_mod_dt': {
    type: 'datetime',
    required: false,
    formats: [
      'YYYY-MM-DD HH:mm:ss.SSSSSS+ZZ',
      'YYYY-MM-DD HH:mm:ss+ZZ',
      'YYYY-MM-DD HH:mm:ss'
    ],
    errorMessage: 'Last modified date must include timezone'
  },
  
  'lst_mod_by': {
    type: 'email',
    required: false,
    pattern: /^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})?$/,
    examples: ['ftlawhh13@fibertime.com'],
    errorMessage: 'Last modified by must be valid email address'
  },
  
  // Numeric fields
  'Sections': {
    type: 'string',
    required: false,
    pattern: /^(\d{1,3})?$/,
    errorMessage: 'Sections must be numeric (1-3 digits)'
  },
  
  'PONs': {
    type: 'string',
    required: false,
    pattern: /^(\d{1,3})?$/,
    errorMessage: 'PONs must be numeric (1-3 digits)'
  },
  
  // Installation fields
  'Photo of the Handhole Before Closing': {
    type: 'string',
    required: false,
    pattern: /^(\d{6,10})?$/,
    errorMessage: 'Photo reference must be numeric ID'
  },
  
  'Photo of the Handhole After Closing': {
    type: 'string',
    required: false,
    pattern: /^(\d{6,10})?$/,
    errorMessage: 'Photo reference must be numeric ID'
  },
  
  'Installer Name': {
    type: 'string',
    required: false,
    pattern: /^([A-Za-z0-9\s\(\)\.\-]+)?$/,
    maxLength: 100,
    errorMessage: 'Installer name must be alphanumeric with allowed symbols'
  },
  
  'Length of Drop Cable': {
    type: 'string',
    required: false,
    pattern: /^(\d{1,4}m?|\w+\s?\(\w+\))?$/,
    examples: ['50m', '100', 'Mpumii', 'Honest (fibertime)'],
    errorMessage: 'Drop cable length must be numeric with optional m suffix or installer name'
  },
  
  // Survey fields
  'Survey Date': {
    type: 'datetime',
    required: false,
    formats: ['YYYY/MM/DD HH:mm:ss.SSS'],
    errorMessage: 'Survey date must be in valid format'
  },
  
  'Stand Number': {
    type: 'string',
    required: false,
    pattern: /^(\d{1,10})?$/,
    errorMessage: 'Stand number must be numeric'
  },
  
  // Additional validation rules
  crossFieldValidation: [
    {
      name: 'GPS_COORDINATES_PAIR',
      fields: ['Latitude', 'Longitude'],
      validate: (lat, lon) => {
        // Both must be present or both absent
        if ((lat && !lon) || (!lat && lon)) {
          return { valid: false, error: 'Latitude and Longitude must both be present' };
        }
        return { valid: true };
      }
    },
    {
      name: 'STATUS_FLOW_CONSISTENCY',
      fields: ['Status', 'Flow Name Groups'],
      validate: (status, flowGroups) => {
        // Flow groups should contain current status
        if (status && flowGroups && !flowGroups.includes(status)) {
          return { 
            valid: false, 
            error: 'Current status should be reflected in Flow Name Groups' 
          };
        }
        return { valid: true };
      }
    },
    {
      name: 'POLE_DROP_RELATIONSHIP',
      fields: ['Pole Number', 'Drop Number'],
      validate: (pole, drop) => {
        // If drop exists, pole should exist (in most cases)
        if (drop && !pole) {
          return { 
            valid: true, // This is actually valid for early-stage records
            warning: 'Drop assigned without pole - early stage record'
          };
        }
        return { valid: true };
      }
    }
  ],
  
  // Data quality thresholds
  qualityThresholds: {
    minValidationRate: 90, // Minimum % of valid records to proceed
    criticalValidationRate: 60, // Below this, reject the file entirely
    maxMissingAgents: 70, // Maximum % of records with missing agents
    maxDuplicatePoles: 5, // Maximum % of duplicate pole numbers allowed
    maxGPSOutOfRange: 10 // Maximum % of GPS coordinates outside expected range
  }
};