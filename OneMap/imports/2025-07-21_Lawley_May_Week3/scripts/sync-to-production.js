#!/usr/bin/env node

/**
 * Sync from OneMap staging to FibreFlow production
 * Maps 1Map fields to FibreFlow schema
 * 
 * Usage: node sync-to-production.js [--dry-run] [--limit=10]
 */

const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'fibreflow-73daf'
  });
}

const db = admin.firestore();

// Collections
const STAGING_COLLECTION = 'onemap-processing-staging';
const PRODUCTION_POLES = 'planned-poles';  // For planned poles
const PRODUCTION_TRACKERS = 'pole-trackers';  // For installed poles

class ProductionSyncService {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.limit = options.limit || null;
    this.syncId = `SYNC_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    
    this.stats = {
      total: 0,
      synced: 0,
      skipped: 0,
      errors: 0,
      created: 0,
      updated: 0
    };
    
    this.changes = [];
    this.errors = [];
  }

  async sync() {
    console.log(`🚀 Starting production sync...`);
    console.log(`📋 Sync ID: ${this.syncId}`);
    console.log(`⚙️  Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    try {
      // Get staged records
      let query = db.collection(STAGING_COLLECTION);
      if (this.limit) {
        query = query.limit(this.limit);
      }
      
      const staged = await query.get();
      console.log(`📊 Found ${staged.size} staged records to process`);
      
      // Process each record
      for (const doc of staged.docs) {
        await this.processRecord(doc);
      }
      
      // Generate report
      const report = this.generateReport();
      console.log(report);
      
      // Save report
      if (!this.dryRun) {
        await this.saveReport(report);
      }
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  async processRecord(stagingDoc) {
    try {
      this.stats.total++;
      
      const stagingData = stagingDoc.data();
      const recordId = stagingDoc.id;
      
      // Determine target collection based on status
      const targetCollection = this.determineTargetCollection(stagingData);
      
      // Map fields according to target schema
      const mappedData = targetCollection === PRODUCTION_POLES ? 
        this.mapToPlannedPoles(stagingData) : 
        this.mapToPoleTrackers(stagingData);
      
      if (!mappedData) {
        this.stats.skipped++;
        return;
      }
      
      // Check if exists in production
      const existingDoc = await db
        .collection(targetCollection)
        .where('propertyId', '==', stagingData.propertyId)
        .limit(1)
        .get();
      
      if (existingDoc.empty) {
        // Create new
        if (!this.dryRun) {
          await db.collection(targetCollection).add(mappedData);
        }
        
        this.stats.created++;
        this.changes.push({
          action: 'CREATE',
          collection: targetCollection,
          propertyId: stagingData.propertyId,
          poleNumber: mappedData.clientPoleNumber || mappedData.poleNumber,
          data: mappedData
        });
        
      } else {
        // Update existing
        const existingId = existingDoc.docs[0].id;
        const changes = this.detectChanges(existingDoc.docs[0].data(), mappedData);
        
        if (changes.length > 0) {
          if (!this.dryRun) {
            await db.collection(targetCollection).doc(existingId).update(mappedData);
          }
          
          this.stats.updated++;
          this.changes.push({
            action: 'UPDATE',
            collection: targetCollection,
            documentId: existingId,
            propertyId: stagingData.propertyId,
            changes: changes
          });
        } else {
          this.stats.skipped++;
        }
      }
      
      this.stats.synced++;
      
    } catch (error) {
      this.stats.errors++;
      this.errors.push({
        recordId: stagingDoc.id,
        error: error.message,
        data: stagingDoc.data()
      });
      console.error(`❌ Error processing ${stagingDoc.id}:`, error.message);
    }
  }

  determineTargetCollection(data) {
    // If status indicates installation/completion, use pole-trackers
    const status = data.status || '';
    
    if (status.includes('Installed') || 
        status.includes('Completed') ||
        status.includes('Active')) {
      return PRODUCTION_TRACKERS;
    }
    
    // Otherwise use planned-poles
    return PRODUCTION_POLES;
  }

  /**
   * Map 1Map data to planned-poles schema
   */
  mapToPlannedPoles(data) {
    // Skip if no pole number
    if (!data.poleNumber) {
      return null;
    }
    
    const mapped = {
      // Identifiers
      propertyId: data.propertyId,
      clientPoleNumber: data.poleNumber,
      
      // Location
      plannedLocation: {
        lat: data.gpsLatitude || 0,
        lng: data.gpsLongitude || 0,
        address: data.locationAddress || ''
      },
      
      // Project info (needs to be determined)
      projectId: this.getProjectId(data),
      projectCode: data.poleNumber?.split('.')[0] || 'LAW',
      projectName: 'Lawley Project',  // TODO: Get from project lookup
      
      // Status
      status: this.mapStatus(data.status),
      
      // Import metadata
      importBatchId: data._meta?.importId || this.syncId,
      importDate: Timestamp.now(),
      
      // 1Map specific data
      oneMapData: {
        nadId: data.oneMapNadId,
        flowNameGroups: data.flowNameGroups,
        site: data.site,
        sections: data.sections,
        pons: data.pons,
        fieldAgent: data.fieldAgentPolePermission,
        lastModified: data.lastModifiedDate
      },
      
      // Metadata
      metadata: {
        importedBy: 'onemap-sync',
        importedByName: 'OneMap Sync Service',
        importFileName: 'onemap-staging',
        syncId: this.syncId,
        originalPropertyId: data.propertyId
      },
      
      // Timestamps
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    // Clean empty values
    this.cleanEmptyValues(mapped);
    
    return mapped;
  }

  /**
   * Map 1Map data to pole-trackers schema
   */
  mapToPoleTrackers(data) {
    // Skip if no pole number
    if (!data.poleNumber) {
      return null;
    }
    
    const mapped = {
      // Core Identity
      vfPoleId: data.poleNumber,
      poleNumber: data.poleNumber,
      projectId: this.getProjectId(data),
      projectCode: data.poleNumber?.split('.')[0] || 'LAW',
      
      // Network Details
      pon: data.pons,
      zone: data.sections,
      
      // Location
      location: data.locationAddress || '',
      gpsCoordinates: {
        lat: data.gpsLatitude || 0,
        lng: data.gpsLongitude || 0
      },
      
      // Installation (if available)
      dateInstalled: data.dateStatusChanged ? 
        new Date(data.dateStatusChanged) : 
        Timestamp.now(),
      
      // Contractor info (needs lookup)
      contractorId: 'pending',  // TODO: Lookup contractor
      contractorName: data.fieldAgentPolePermission || 'Unknown',
      workingTeam: data.fieldAgentPolePermission || 'Import Team',
      
      // Required fields
      maxCapacity: 12,
      poleType: 'unknown',  // TODO: Determine from data
      
      // Upload tracking (initialize empty)
      uploads: {
        before: { uploaded: false },
        front: { uploaded: false },
        side: { uploaded: false },
        depth: { uploaded: false },
        concrete: { uploaded: false },
        compaction: { uploaded: false }
      },
      
      // Quality tracking
      qualityChecked: false,
      
      // 1Map reference
      propertyId: data.propertyId,
      oneMapData: {
        nadId: data.oneMapNadId,
        flowNameGroups: data.flowNameGroups,
        site: data.site,
        lastModified: data.lastModifiedDate
      },
      
      // Metadata
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'onemap-sync',
      updatedBy: 'onemap-sync'
    };
    
    // Add drop information if available
    if (data.dropNumber) {
      mapped.connectedDrops = [data.dropNumber];
      mapped.dropCount = 1;
    } else {
      mapped.connectedDrops = [];
      mapped.dropCount = 0;
    }
    
    // Clean empty values
    this.cleanEmptyValues(mapped);
    
    return mapped;
  }

  getProjectId(data) {
    // TODO: Implement project lookup based on pole prefix
    // For now, use a default project ID
    const prefix = data.poleNumber?.split('.')[0];
    
    // This should lookup actual project IDs
    const projectMap = {
      'LAW': 'lawley-project-id',  // Replace with actual ID
      'MO': 'mohadin-project-id'    // Replace with actual ID
    };
    
    return projectMap[prefix] || 'default-project-id';
  }

  mapStatus(oneMapStatus) {
    // Map 1Map status to FibreFlow status
    const statusMap = {
      'Pole Permission: Approved': 'planned',
      'Home Sign Ups: Approved': 'assigned',
      'Installation Scheduled': 'in_progress',
      'Home Installation: In Progress': 'in_progress',
      'Home Installation: Installed': 'installed',
      'Completed': 'verified'
    };
    
    return statusMap[oneMapStatus] || 'planned';
  }

  detectChanges(existing, mapped) {
    const changes = [];
    
    // Check key fields for changes
    const fieldsToCheck = [
      'status',
      'plannedLocation.lat',
      'plannedLocation.lng',
      'contractorName',
      'dateInstalled'
    ];
    
    fieldsToCheck.forEach(field => {
      const existingValue = this.getNestedValue(existing, field);
      const mappedValue = this.getNestedValue(mapped, field);
      
      if (existingValue !== mappedValue) {
        changes.push({
          field,
          oldValue: existingValue,
          newValue: mappedValue
        });
      }
    });
    
    return changes;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  cleanEmptyValues(obj) {
    Object.keys(obj).forEach(key => {
      if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        this.cleanEmptyValues(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    });
  }

  generateReport() {
    const mode = this.dryRun ? 'DRY RUN' : 'LIVE';
    
    return `
PRODUCTION SYNC REPORT (${mode})
================================
Sync ID: ${this.syncId}
Date: ${new Date().toISOString()}

SUMMARY
-------
Total Processed: ${this.stats.total}
Successfully Synced: ${this.stats.synced}
Created: ${this.stats.created}
Updated: ${this.stats.updated}
Skipped: ${this.stats.skipped}
Errors: ${this.stats.errors}

${this.changes.length > 0 ? `
CHANGES (${this.changes.length})
---------
${this.changes.slice(0, 20).map(change => {
  if (change.action === 'CREATE') {
    return `✅ CREATE in ${change.collection}
   Property: ${change.propertyId}
   Pole: ${change.poleNumber}`;
  } else {
    return `📝 UPDATE in ${change.collection}
   Property: ${change.propertyId}
   Changes: ${change.changes.map(c => c.field).join(', ')}`;
  }
}).join('\n\n')}

${this.changes.length > 20 ? `\n... and ${this.changes.length - 20} more changes` : ''}
` : 'No changes to sync.'}

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
-------
${this.errors.slice(0, 5).map(err => 
  `❌ ${err.recordId}: ${err.error}`
).join('\n')}
` : ''}

${this.dryRun ? `
⚠️  DRY RUN MODE - No actual changes were made
To sync for real, run without --dry-run flag
` : `
✅ SYNC COMPLETED - Changes applied to production
`}
`;
  }

  async saveReport(report) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const filename = `sync_to_production_${this.syncId}.txt`;
    const filepath = path.join('OneMap/reports', filename);
    
    await fs.writeFile(filepath, report);
    console.log(`📄 Report saved to: ${filepath}`);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    limit: null
  };
  
  args.forEach(arg => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    }
  });
  
  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  
  console.log(`
⚠️  PRODUCTION SYNC WARNING
==========================
This will sync data to your LIVE production database.

Mode: ${options.dryRun ? 'DRY RUN (safe)' : 'LIVE (will modify production!)'}
Limit: ${options.limit || 'No limit (all records)'}

Press Ctrl+C to cancel, or wait 5 seconds to continue...
`);
  
  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const syncer = new ProductionSyncService(options);
  await syncer.sync();
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}