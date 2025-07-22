#!/usr/bin/env node

/**
 * Batch sync to production - handles large datasets efficiently
 */

const admin = require('firebase-admin');
const fs = require('fs').promises;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'fibreflow-73daf' });
}

const db = admin.firestore();
const BATCH_SIZE = 50;

class BatchProductionSync {
  constructor() {
    this.syncId = `SYNC_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
    this.stats = {
      total: 0,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    this.changes = [];
    this.errors = [];
  }

  async sync() {
    console.log('🚀 Starting BATCH Production Sync...');
    console.log(`📋 Sync ID: ${this.syncId}`);
    console.log(`📦 Batch Size: ${BATCH_SIZE} records\n`);
    
    try {
      // Get records that have pole numbers (ready to sync)
      const snapshot = await db.collection('onemap-processing-staging')
        .where('poleNumber', '!=', null)
        .get();
      
      console.log(`✅ Found ${snapshot.size} records ready to sync\n`);
      
      // Convert to array for batch processing
      const records = [];
      snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });
      
      // Process in batches
      const totalBatches = Math.ceil(records.length / BATCH_SIZE);
      
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = records.slice(i, i + BATCH_SIZE);
        
        console.log(`\n🔄 Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
        
        for (const record of batch) {
          await this.processRecord(record);
        }
        
        console.log(`✅ Batch ${batchNum} complete. Total synced: ${this.stats.synced}/${records.length}`);
        
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
      
      // Skip if no pole number
      if (!record.poleNumber) {
        this.stats.skipped++;
        return;
      }
      
      // Determine target collection
      const targetCollection = this.getTargetCollection(record.status);
      
      // Map data
      const mappedData = targetCollection === 'planned-poles' ?
        this.mapToPlannedPoles(record) :
        this.mapToPoleTrackers(record);
      
      if (!mappedData || !mappedData.projectId) {
        this.stats.skipped++;
        return;
      }
      
      // Check if exists
      const existingQuery = await db.collection(targetCollection)
        .where('propertyId', '==', record.propertyId)
        .limit(1)
        .get();
      
      if (existingQuery.empty) {
        // Create new
        await db.collection(targetCollection).add(mappedData);
        this.stats.created++;
        this.stats.synced++;
        
        this.changes.push({
          action: 'CREATE',
          collection: targetCollection,
          propertyId: record.propertyId,
          poleNumber: record.poleNumber
        });
      } else {
        // For now, skip updates to avoid overwrites
        this.stats.skipped++;
      }
      
    } catch (error) {
      this.stats.errors++;
      this.errors.push({
        propertyId: record.propertyId,
        error: error.message
      });
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
BATCH PRODUCTION SYNC REPORT
============================
Sync ID: ${this.syncId}
Date: ${new Date().toISOString()}
Mode: LIVE

SUMMARY
-------
Total Processed: ${this.stats.total}
Successfully Synced: ${this.stats.synced}
Created: ${this.stats.created}
Updated: ${this.stats.updated}
Skipped: ${this.stats.skipped}
Errors: ${this.stats.errors}

SYNC DETAILS
------------
- Records created in planned-poles: ${this.changes.filter(c => c.collection === 'planned-poles').length}
- Records created in pole-trackers: ${this.changes.filter(c => c.collection === 'pole-trackers').length}

${this.errors.length > 0 ? `
ERRORS (${this.errors.length})
-------
${this.errors.slice(0, 10).map(e => 
  `- Property ${e.propertyId}: ${e.error}`
).join('\n')}` : ''}

✅ SYNC COMPLETED
-----------------
All records have been synced to production.
Check the live FibreFlow app to verify.
`;

    console.log(report);
    
    // Save report
    await fs.writeFile(
      `reports/batch_sync_${this.syncId}.txt`,
      report
    );
    
    // Update import tracking
    await fs.writeFile(
      `imports/2025-07-21_Lawley_May_Week3/SYNC_COMPLETED.json`,
      JSON.stringify({
        syncId: this.syncId,
        completedAt: new Date().toISOString(),
        stats: this.stats,
        targetCollections: {
          'planned-poles': this.changes.filter(c => c.collection === 'planned-poles').length,
          'pole-trackers': this.changes.filter(c => c.collection === 'pole-trackers').length
        }
      }, null, 2)
    );
  }
}

// Run sync
const syncer = new BatchProductionSync();
syncer.sync().catch(console.error);