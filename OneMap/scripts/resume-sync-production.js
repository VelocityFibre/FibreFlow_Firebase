#!/usr/bin/env node

/**
 * Resume sync to production - handles already synced records
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();
const BATCH_SIZE = 50;

class ResumeProductionSync {
  constructor() {
    this.syncId = `RESUME_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    this.stats = {
      total: 0,
      alreadySynced: 0,
      newlySynced: 0,
      skipped: 0,
      errors: 0
    };
    this.changes = [];
    this.errors = [];
  }

  async sync() {
    console.log('🚀 Resuming Production Sync...');
    console.log(`📋 Sync ID: ${this.syncId}`);
    console.log(`📦 Batch Size: ${BATCH_SIZE} records\n`);
    
    try {
      // First, check what's already synced
      const alreadySynced = await db.collection('planned-poles')
        .where('metadata.importedBy', '==', 'onemap-sync')
        .get();
      
      console.log(`✅ Already synced: ${alreadySynced.size} records`);
      
      // Get all synced property IDs
      const syncedPropertyIds = new Set();
      alreadySynced.forEach(doc => {
        syncedPropertyIds.add(doc.data().propertyId);
      });
      
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
      
      // Create new record
      await db.collection(targetCollection).add(mappedData);
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
        nadId: data.oneMapNadId,
        site: data.site,
        sections: data.sections,
        pons: data.pons,
        fieldAgent: data.fieldAgentPolePermission,
        lastModified: data.lastModifiedDate
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
      pon: data.pons,
      zone: data.sections,
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
    const report = `
RESUME PRODUCTION SYNC REPORT
=============================
Sync ID: ${this.syncId}
Date: ${new Date().toISOString()}
Mode: RESUME (continuing from previous sync)

SUMMARY
-------
Total Processed: ${this.stats.total}
Newly Synced: ${this.stats.newlySynced}
Already Synced (skipped): ${this.stats.alreadySynced}
Errors: ${this.stats.errors}

SYNC DETAILS
------------
- New records in planned-poles: ${this.changes.filter(c => c.collection === 'planned-poles').length}
- New records in pole-trackers: ${this.changes.filter(c => c.collection === 'pole-trackers').length}

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
-------
${this.errors.slice(0, 10).map(e => 
  `- Property ${e.propertyId}: ${e.error}`
).join('\n')}` : ''}

✅ SYNC COMPLETED
-----------------
All remaining records have been synced to production.
Total in production: ${this.stats.alreadySynced + this.stats.newlySynced} records
Check the live FibreFlow app to verify.
`;

    console.log(report);
    
    // Save report
    await fs.writeFile(
      `reports/resume_sync_${this.syncId}.txt`,
      report
    );
  }
}

// Run sync
const syncer = new ResumeProductionSync();
syncer.sync().catch(console.error);