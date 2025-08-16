#!/usr/bin/env node

/**
 * Migration Script: Firebase to Neon for Pole Management
 * 
 * This script migrates all pole-related data from Firebase collections to Neon PostgreSQL.
 * It handles:
 * - Projects reference data
 * - Poles (from pole-trackers, planned-poles, pole-installations)
 * - Drops (from home-signups, homes-connected, homes-activated, drops)
 * - Import batches and history
 * - Photos and metadata
 * - Status history
 * 
 * Run: node database/migrate-poles-to-neon.js [--dry-run] [--project=PROJECT_ID]
 */

const admin = require('firebase-admin');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const projectFilter = args.find(arg => arg.startsWith('--project='))?.split('=')[1];

// Initialize Firebase Admin
const serviceAccount = require('../fibreflow-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Neon connection
// TODO: Update with actual Neon connection string from environment
const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Migration statistics
const stats = {
  projects: { total: 0, migrated: 0, errors: 0 },
  poles: { total: 0, migrated: 0, errors: 0 },
  drops: { total: 0, migrated: 0, errors: 0 },
  photos: { total: 0, migrated: 0, errors: 0 },
  statusHistory: { total: 0, migrated: 0, errors: 0 },
  importBatches: { total: 0, migrated: 0, errors: 0 }
};

// Helper function to convert Firebase Timestamp to PostgreSQL timestamp
function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

// Helper function to convert location string to PostGIS point
function parseLocation(location) {
  if (!location) return null;
  
  // Handle "lat,lng" format
  const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    return `POINT(${lng} ${lat})`; // PostGIS uses lng,lat order
  }
  
  return null;
}

// Helper function to generate ULID-like ID
function generateULID() {
  // For migration, we'll use UUID v4 for simplicity
  return uuidv4();
}

// Migrate projects (reference data only)
async function migrateProjects() {
  console.log('\n📁 Migrating Projects...');
  
  try {
    const projectsSnapshot = await db.collection('projects').get();
    stats.projects.total = projectsSnapshot.size;
    
    for (const doc of projectsSnapshot.docs) {
      const data = doc.data();
      
      // Filter by project if specified
      if (projectFilter && doc.id !== projectFilter) continue;
      
      try {
        const query = `
          INSERT INTO projects (id, name, project_code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = EXCLUDED.updated_at
        `;
        
        const values = [
          doc.id,
          data.title || data.name || 'Unknown Project',
          data.projectCode || doc.id.substring(0, 10),
          convertTimestamp(data.createdAt) || new Date(),
          convertTimestamp(data.updatedAt) || new Date()
        ];
        
        if (!isDryRun) {
          await neonPool.query(query, values);
        }
        
        stats.projects.migrated++;
        console.log(`✓ Project: ${data.title || data.name}`);
      } catch (error) {
        console.error(`✗ Error migrating project ${doc.id}:`, error.message);
        stats.projects.errors++;
      }
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
}

// Migrate poles from various collections
async function migratePoles() {
  console.log('\n📍 Migrating Poles...');
  
  // Collections to migrate from
  const poleCollections = [
    { name: 'pole-trackers', type: 'tracker' },
    { name: 'planned-poles', type: 'planned' },
    { name: 'pole-installations', type: 'installation' }
  ];
  
  const poleNumberMap = new Map(); // Track migrated pole numbers to avoid duplicates
  
  for (const collection of poleCollections) {
    console.log(`\n  Processing ${collection.name}...`);
    
    try {
      const snapshot = await db.collection(collection.name).get();
      console.log(`  Found ${snapshot.size} documents in ${collection.name}`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        stats.poles.total++;
        
        // Skip if already migrated (by pole number)
        if (data.poleNumber && poleNumberMap.has(data.poleNumber)) {
          console.log(`  ⚠️  Skipping duplicate pole number: ${data.poleNumber}`);
          continue;
        }
        
        // Filter by project if specified
        if (projectFilter && data.projectId !== projectFilter) continue;
        
        try {
          // Prepare pole data
          const poleId = generateULID();
          const location = parseLocation(data.location || data.gpsLocation);
          
          const query = `
            INSERT INTO poles (
              id, project_id, pole_number, vf_pole_id, status, installation_status,
              quality_checked, quality_check_date, quality_checked_by,
              location, gps_accuracy, zone, pon, distribution_or_feeder,
              contractor_id, contractor_name, working_team,
              date_installed, pole_type, pole_height,
              import_batch_id, onemap_id, onemap_data,
              max_capacity, drop_count,
              created_at, created_by, updated_at, updated_by,
              metadata
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::geography,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
            )
          `;
          
          const values = [
            poleId,
            data.projectId,
            data.poleNumber || `TEMP_${doc.id}`,
            data.vfPoleId || data.poleId || null,
            mapPoleStatus(data.status),
            data.installationStatus || null,
            data.qualityChecked || false,
            convertTimestamp(data.qualityCheckDate),
            data.qualityCheckedBy || null,
            location,
            data.gpsAccuracy || null,
            data.zone || null,
            data.pon || null,
            data.distributionFeeder || data.distributionOrFeeder || null,
            data.contractorId || null,
            data.contractorName || null,
            data.workingTeam || null,
            convertTimestamp(data.dateInstalled),
            data.poleType || null,
            data.poleHeight || null,
            data.importBatchId || null,
            data.oneMapId || data.oneMapNadId || null,
            data.oneMapData ? JSON.stringify(data.oneMapData) : null,
            data.maxCapacity || 12,
            data.dropCount || data.connectedDrops?.length || 0,
            convertTimestamp(data.createdAt) || new Date(),
            data.createdBy || 'migration',
            convertTimestamp(data.updatedAt) || new Date(),
            data.updatedBy || 'migration',
            JSON.stringify({
              firebaseId: doc.id,
              firebaseCollection: collection.name,
              migratedAt: new Date().toISOString(),
              originalData: data
            })
          ];
          
          if (!isDryRun) {
            await neonPool.query(query, values);
            
            // Migrate status history if present
            if (data.statusHistory && Array.isArray(data.statusHistory)) {
              await migrateStatusHistory(poleId, 'pole', data.statusHistory);
            }
            
            // Migrate photos if present
            if (data.uploads) {
              await migratePolePhotos(poleId, data.uploads);
            }
          }
          
          if (data.poleNumber) {
            poleNumberMap.set(data.poleNumber, poleId);
          }
          
          stats.poles.migrated++;
          console.log(`  ✓ Pole: ${data.poleNumber || doc.id}`);
        } catch (error) {
          console.error(`  ✗ Error migrating pole ${doc.id}:`, error.message);
          stats.poles.errors++;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${collection.name}:`, error);
    }
  }
  
  return poleNumberMap;
}

// Migrate drops from various collections
async function migrateDrops(poleNumberMap) {
  console.log('\n🏠 Migrating Drops...');
  
  // Collections to migrate from
  const dropCollections = [
    { name: 'home-signups', type: 'signup' },
    { name: 'homes-connected', type: 'connected' },
    { name: 'homes-activated', type: 'activated' },
    { name: 'drops', type: 'drop' }
  ];
  
  const dropNumberMap = new Map(); // Track migrated drop numbers to avoid duplicates
  
  for (const collection of dropCollections) {
    console.log(`\n  Processing ${collection.name}...`);
    
    try {
      const snapshot = await db.collection(collection.name).get();
      console.log(`  Found ${snapshot.size} documents in ${collection.name}`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        stats.drops.total++;
        
        // Skip if already migrated (by drop number)
        if (data.dropNumber && dropNumberMap.has(data.dropNumber)) {
          console.log(`  ⚠️  Skipping duplicate drop number: ${data.dropNumber}`);
          continue;
        }
        
        try {
          // Find pole ID from pole number
          let poleId = null;
          if (data.connectedToPole || data.poleNumber) {
            const poleNumber = data.connectedToPole || data.poleNumber;
            poleId = poleNumberMap.get(poleNumber);
            
            if (!poleId && !isDryRun) {
              // Try to find pole in database
              const result = await neonPool.query(
                'SELECT id FROM poles WHERE pole_number = $1',
                [poleNumber]
              );
              if (result.rows.length > 0) {
                poleId = result.rows[0].id;
              }
            }
          }
          
          const dropId = generateULID();
          const location = parseLocation(data.location || data.gpsLocation);
          
          const query = `
            INSERT INTO drops (
              id, drop_number, pole_id, status,
              property_id, address, customer_name, customer_phone, customer_email,
              distance_to_pole, cable_length, cable_type, ont_serial,
              location,
              signup_date, approval_date, installation_scheduled_date,
              connection_date, activation_date,
              import_batch_id, onemap_id,
              created_at, created_by, updated_at, updated_by,
              metadata
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14::geography, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26
            )
          `;
          
          const values = [
            dropId,
            data.dropNumber || `TEMP_DROP_${doc.id}`,
            poleId,
            mapDropStatus(data.status, collection.type),
            data.propertyId || null,
            data.address || data.locationAddress || null,
            data.customerName || null,
            data.customerPhone || null,
            data.customerEmail || null,
            data.distanceToPole || null,
            data.cableLength || null,
            data.cableType || null,
            data.ontSerial || null,
            location,
            convertTimestamp(data.signupDate || data.createdAt),
            convertTimestamp(data.approvalDate),
            convertTimestamp(data.installationScheduledDate),
            convertTimestamp(data.connectionDate),
            convertTimestamp(data.activationDate),
            data.importBatchId || null,
            data.oneMapId || null,
            convertTimestamp(data.createdAt) || new Date(),
            data.createdBy || 'migration',
            convertTimestamp(data.updatedAt) || new Date(),
            data.updatedBy || 'migration',
            JSON.stringify({
              firebaseId: doc.id,
              firebaseCollection: collection.name,
              migratedAt: new Date().toISOString(),
              originalData: data
            })
          ];
          
          if (!isDryRun) {
            await neonPool.query(query, values);
          }
          
          if (data.dropNumber) {
            dropNumberMap.set(data.dropNumber, dropId);
          }
          
          stats.drops.migrated++;
          console.log(`  ✓ Drop: ${data.dropNumber || doc.id}`);
        } catch (error) {
          console.error(`  ✗ Error migrating drop ${doc.id}:`, error.message);
          stats.drops.errors++;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${collection.name}:`, error);
    }
  }
}

// Migrate status history
async function migrateStatusHistory(entityId, entityType, statusHistory) {
  for (const entry of statusHistory) {
    try {
      const query = `
        INSERT INTO status_history (
          id, entity_type, entity_id, old_status, new_status,
          changed_by, changed_at, reason, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        generateULID(),
        entityType,
        entityId,
        entry.previousStatus || null,
        entry.status,
        entry.changedBy || 'migration',
        convertTimestamp(entry.changedAt) || new Date(),
        entry.notes || entry.reason || null,
        JSON.stringify({
          source: entry.source,
          importBatchId: entry.importBatchId,
          changedByName: entry.changedByName
        })
      ];
      
      await neonPool.query(query, values);
      stats.statusHistory.migrated++;
    } catch (error) {
      console.error('Error migrating status history:', error.message);
      stats.statusHistory.errors++;
    }
  }
}

// Migrate pole photos
async function migratePolePhotos(poleId, uploads) {
  const photoTypes = ['before', 'front', 'side', 'depth', 'concrete', 'compaction'];
  
  for (const type of photoTypes) {
    const upload = uploads[type];
    if (!upload || !upload.url) continue;
    
    try {
      const query = `
        INSERT INTO pole_photos (
          id, pole_id, photo_type, storage_url, thumbnail_url,
          file_size, mime_type, uploaded_at, uploaded_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      const values = [
        generateULID(),
        poleId,
        type,
        upload.url,
        upload.thumbnailUrl || null,
        upload.metadata?.originalSize || null,
        upload.metadata?.mimeType || 'image/jpeg',
        convertTimestamp(upload.uploadedAt) || new Date(),
        upload.uploadedBy || 'migration',
        JSON.stringify({
          fileName: upload.fileName,
          approved: upload.approved,
          approvedBy: upload.approvedBy,
          approvedAt: upload.approvedAt,
          metadata: upload.metadata
        })
      ];
      
      await neonPool.query(query, values);
      stats.photos.migrated++;
    } catch (error) {
      console.error(`Error migrating photo ${type}:`, error.message);
      stats.photos.errors++;
    }
  }
}

// Migrate import batches
async function migrateImportBatches() {
  console.log('\n📦 Migrating Import Batches...');
  
  try {
    const snapshot = await db.collection('import-batches').get();
    stats.importBatches.total = snapshot.size;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      try {
        const query = `
          INSERT INTO import_batches (
            id, import_type, file_name, file_url, project_id,
            total_records, processed_records, success_count, error_count, duplicate_count,
            status, started_at, completed_at, errors,
            imported_by, imported_at, metadata
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17
          )
        `;
        
        const values = [
          doc.id,
          mapImportType(data.importType || data.type),
          data.fileName || null,
          data.fileUrl || null,
          data.projectId || null,
          data.totalRecords || 0,
          data.processedRecords || 0,
          data.successCount || 0,
          data.errorCount || 0,
          data.duplicateCount || 0,
          data.status || 'completed',
          convertTimestamp(data.startedAt),
          convertTimestamp(data.completedAt),
          JSON.stringify(data.errors || []),
          data.importedBy || 'migration',
          convertTimestamp(data.importedAt || data.createdAt) || new Date(),
          JSON.stringify({
            firebaseId: doc.id,
            migratedAt: new Date().toISOString(),
            originalData: data
          })
        ];
        
        if (!isDryRun) {
          await neonPool.query(query, values);
        }
        
        stats.importBatches.migrated++;
        console.log(`✓ Import batch: ${data.fileName || doc.id}`);
      } catch (error) {
        console.error(`✗ Error migrating import batch ${doc.id}:`, error.message);
        stats.importBatches.errors++;
      }
    }
  } catch (error) {
    console.error('Error fetching import batches:', error);
  }
}

// Helper function to map Firebase status to PostgreSQL enum
function mapPoleStatus(status) {
  const statusMap = {
    'planned': 'planned',
    'pending': 'pending',
    'in_progress': 'in_progress',
    'installed': 'installed',
    'quality_checked': 'quality_checked',
    'approved': 'approved',
    'rejected': 'rejected',
    'on_hold': 'on_hold',
    'captured': 'installed', // Map captured to installed
    'completed': 'approved'   // Map completed to approved
  };
  
  return statusMap[status?.toLowerCase()] || 'pending';
}

// Helper function to map drop status
function mapDropStatus(status, collectionType) {
  // If collection type gives us a hint
  if (collectionType === 'signup') return 'signup_approved';
  if (collectionType === 'connected') return 'connected';
  if (collectionType === 'activated') return 'activated';
  
  // Otherwise try to map from status string
  const statusMap = {
    'signup_requested': 'signup_requested',
    'signup_approved': 'signup_approved',
    'signup_declined': 'signup_declined',
    'installation_scheduled': 'installation_scheduled',
    'installation_in_progress': 'installation_in_progress',
    'connected': 'connected',
    'activated': 'activated',
    'suspended': 'suspended',
    'cancelled': 'cancelled'
  };
  
  return statusMap[status?.toLowerCase()] || 'signup_requested';
}

// Helper function to map import type
function mapImportType(type) {
  const typeMap = {
    'csv': 'csv',
    'excel': 'excel',
    'onemap': 'onemap',
    'manual': 'manual',
    'api': 'api'
  };
  
  return typeMap[type?.toLowerCase()] || 'manual';
}

// Update drop counts after migration
async function updateDropCounts() {
  console.log('\n🔢 Updating drop counts...');
  
  try {
    const query = `
      UPDATE poles p
      SET drop_count = (
        SELECT COUNT(*)
        FROM drops d
        WHERE d.pole_id = p.id
      )
    `;
    
    if (!isDryRun) {
      const result = await neonPool.query(query);
      console.log(`✓ Updated drop counts for ${result.rowCount} poles`);
    }
  } catch (error) {
    console.error('Error updating drop counts:', error);
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting Firebase to Neon Migration');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  if (projectFilter) {
    console.log(`Filtering by project: ${projectFilter}`);
  }
  
  try {
    // Test Neon connection
    await neonPool.query('SELECT 1');
    console.log('✓ Connected to Neon database');
    
    // Run migrations in order
    await migrateProjects();
    const poleNumberMap = await migratePoles();
    await migrateDrops(poleNumberMap);
    await migrateImportBatches();
    await updateDropCounts();
    
    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${key}:`);
      console.log(`  Total: ${value.total}`);
      console.log(`  Migrated: ${value.migrated}`);
      console.log(`  Errors: ${value.errors}`);
    });
    
    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was actually migrated.');
      console.log('Run without --dry-run flag to perform actual migration.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await neonPool.end();
    console.log('\n✓ Migration complete');
  }
}

// Run migration
migrate().catch(console.error);