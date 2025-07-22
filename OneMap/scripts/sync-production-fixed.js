#!/usr/bin/env node

/**
 * Fixed production sync - handles undefined values properly
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();
const BATCH_SIZE = 50;

class FixedProductionSync {
  constructor() {
    this.syncId = `FIXED_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    this.stats = {
      total: 0,
      alreadySynced: 0,
      newlySynced: 0,
      skipped: 0,
      errors: 0,
      fixed: 0
    };
    this.changes = [];
    this.errors = [];
  }

  // Remove undefined values from object
  cleanObject(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          cleaned[key] = this.cleanObject(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned;
  }

  async sync() {
    console.log('🚀 Starting FIXED Production Sync...');
    console.log(`📋 Sync ID: ${this.syncId}`);
    console.log('🛠️  Fixed: Handles undefined values properly\n');
    
    try {
      // Check what's already synced
      const alreadySynced = await db.collection('planned-poles')
        .where('metadata.importedBy', '==', 'onemap-sync')
        .get();
      
      console.log(`✅ Already synced: ${alreadySynced.size} records`);
      
      // Get all synced property IDs
      const syncedPropertyIds = new Set();
      alreadySynced.forEach(doc => {
        syncedPropertyIds.add(doc.data().propertyId);
      });
      
      // Also check pole-trackers
      const alreadySyncedTrackers = await db.collection('pole-trackers')
        .where('createdBy', '==', 'onemap-sync')
        .get();
      
      alreadySyncedTrackers.forEach(doc => {
        syncedPropertyIds.add(doc.data().propertyId);
      });
      
      console.log(`✅ Total already synced: ${syncedPropertyIds.size} records`);
      
      // Get records that have pole numbers
      const snapshot = await db.collection('onemap-processing-staging')
        .where('poleNumber', '!=', null)
        .get();
      
      console.log(`📦 Total records in staging: ${snapshot.size}`);
      
      // Filter out already synced records
      const recordsToSync = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!syncedPropertyIds.has(data.propertyId)) {
          recordsToSync.push({ id: doc.id, ...data });
        }
      });
      
      console.log(`🆕 Records still to sync: ${recordsToSync.length}\n`);
      
      if (recordsToSync.length === 0) {
        console.log('✅ All records have already been synced!');
        return;
      }
      
      // Process in batches
      const totalBatches = Math.ceil(recordsToSync.length / BATCH_SIZE);
      
      for (let i = 0; i < recordsToSync.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = recordsToSync.slice(i, i + BATCH_SIZE);
        
        console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
        
        let batchSynced = 0;
        for (const record of batch) {
          const synced = await this.processRecord(record);
          if (synced) batchSynced++;
        }
        
        console.log(`✅ Batch ${batchNum} complete. Synced ${batchSynced} records.`);
        console.log(`   Total progress: ${this.stats.newlySynced}/${recordsToSync.length}`);
        
        // Small delay between batches
        if (batchNum < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.errors.push({ error: error.message });
    }
  }

  async processRecord(record) {
    try {
      this.stats.total++;
      
      // Determine target collection
      const targetCollection = this.getTargetCollection(record.status);
      
      // Map data
      const mappedData = targetCollection === 'planned-poles' ?
        this.mapToPlannedPoles(record) :
        this.mapToPoleTrackers(record);
      
      if (!mappedData || !mappedData.projectId) {
        this.stats.skipped++;
        return false;
      }
      
      // IMPORTANT: Clean the object to remove undefined values
      const cleanedData = this.cleanObject(mappedData);
      this.stats.fixed++;
      
      // Create new record
      await db.collection(targetCollection).add(cleanedData);
      this.stats.newlySynced++;
      
      this.changes.push({
        action: 'CREATE',
        collection: targetCollection,
        propertyId: record.propertyId,
        poleNumber: record.poleNumber
      });
      
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.errors.push({
        propertyId: record.propertyId,
        poleNumber: record.poleNumber,
        error: error.message
      });
      return false;
    }
  }

  getTargetCollection(status) {
    if (status?.includes('Installed') || 
        status?.includes('Completed') ||
        status?.includes('Active')) {
      return 'pole-trackers';
    }
    return 'planned-poles';
  }

  mapToPlannedPoles(data) {
    return {
      propertyId: data.propertyId,
      clientPoleNumber: data.poleNumber,
      plannedLocation: {
        lat: data.gpsLatitude || 0,
        lng: data.gpsLongitude || 0,
        address: data.locationAddress || ''
      },
      projectId: this.getProjectId(data.poleNumber),
      projectCode: data.poleNumber?.split('.')[0] || 'LAW',
      projectName: 'Lawley Project',
      status: this.mapStatus(data.status),
      importBatchId: this.syncId,
      importDate: admin.firestore.Timestamp.now(),
      oneMapData: {
        nadId: data.oneMapNadId || null,
        site: data.site || null,
        sections: data.sections || null,  // Will be removed if undefined
        pons: data.pons || null,
        fieldAgent: data.fieldAgentPolePermission || null,
        lastModified: data.lastModifiedDate || null
      },
      metadata: {
        importedBy: 'onemap-sync',
        syncId: this.syncId,
        originalPropertyId: data.propertyId
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
  }

  mapToPoleTrackers(data) {
    return {
      vfPoleId: data.poleNumber,
      poleNumber: data.poleNumber,
      projectId: this.getProjectId(data.poleNumber),
      projectCode: data.poleNumber?.split('.')[0] || 'LAW',
      pon: data.pons || null,
      zone: data.sections || null,
      location: data.locationAddress || '',
      dateInstalled: data.dateStatusChanged ? 
        new Date(data.dateStatusChanged) : 
        admin.firestore.Timestamp.now(),
      contractorId: 'pending',
      contractorName: data.fieldAgentPolePermission || 'Unknown',
      workingTeam: data.fieldAgentPolePermission || 'Import Team',
      maxCapacity: 12,
      poleType: 'wooden',
      uploads: {
        before: { uploaded: false },
        front: { uploaded: false },
        side: { uploaded: false },
        depth: { uploaded: false },
        concrete: { uploaded: false },
        compaction: { uploaded: false }
      },
      qualityChecked: false,
      propertyId: data.propertyId,
      connectedDrops: data.dropNumber ? [data.dropNumber] : [],
      dropCount: data.dropNumber ? 1 : 0,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      createdBy: 'onemap-sync',
      updatedBy: 'onemap-sync'
    };
  }

  getProjectId(poleNumber) {
    const prefix = poleNumber?.split('.')[0];
    const projectMap = {
      'LAW': '6edHoC3ZakUTbXznbQ5a',  // Lawley project
      'MO': 'o2cF0JNv5yvCyQcj6tNk'     // Mohadin project
    };
    return projectMap[prefix] || null;
  }

  mapStatus(oneMapStatus) {
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

  async generateReport() {
    const totalInProduction = this.stats.alreadySynced + this.stats.newlySynced;
    const report = `
FIXED PRODUCTION SYNC REPORT
============================
Sync ID: ${this.syncId}
Date: ${new Date().toISOString()}
Mode: FIXED (handles undefined values)

SUMMARY
-------
Total Processed: ${this.stats.total}
Newly Synced: ${this.stats.newlySynced}
Already Synced: ${syncedPropertyIds.size}
Data Fixed: ${this.stats.fixed} records cleaned
Errors: ${this.stats.errors}

SYNC DETAILS
------------
- New records in planned-poles: ${this.changes.filter(c => c.collection === 'planned-poles').length}
- New records in pole-trackers: ${this.changes.filter(c => c.collection === 'pole-trackers').length}
- Total now in production: ${totalInProduction} / 543

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
-------
${this.errors.slice(0, 10).map(e => 
  `- Property ${e.propertyId} (${e.poleNumber}): ${e.error}`
).join('\n')}` : ''}

✅ SYNC COMPLETED
-----------------
Fixed undefined value issues and synced all possible records.
Total in production: ${totalInProduction} records
Check the live FibreFlow app to verify.
`;

    console.log(report);
    
    // Save report
    await fs.writeFile(
      `reports/fixed_sync_${this.syncId}.txt`,
      report
    );
    
    // Update completion status
    if (totalInProduction >= 543) {
      await fs.writeFile(
        `imports/2025-07-21_Lawley_May_Week3/SYNC_COMPLETED.json`,
        JSON.stringify({
          syncId: this.syncId,
          completedAt: new Date().toISOString(),
          totalSynced: totalInProduction,
          stats: this.stats,
          note: 'Fixed undefined values issue'
        }, null, 2)
      );
    }
  }
}

// Run sync
const syncer = new FixedProductionSync();
syncer.sync().catch(console.error);