#!/usr/bin/env node

/**
 * Migration Script: Firebase to Neon for Pole Management
 * 
 * This script migrates pole data from Firebase to existing Neon tables:
 * - Firebase pole collections → project_poles table
 * - Firebase drop collections → project_drops table
 * - Status history → status_history table
 * 
 * Run: node Neon/scripts/migrate-firebase-poles-to-neon.js [--dry-run] [--project=PROJECT_ID]
 */

const admin = require('firebase-admin');
const { neon } = require('@neondatabase/serverless');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const projectFilter = args.find(arg => arg.startsWith('--project='))?.split('=')[1];

// Initialize Firebase Admin
const serviceAccount = require('../../fibreflow-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Initialize Neon connection
const connectionString = 'postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool-pooler.gwc.azure.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-long-breeze-a9w7xool';
const sql = neon(connectionString);

// Migration statistics
const stats = {
  poles: { total: 0, migrated: 0, errors: 0, duplicates: 0 },
  drops: { total: 0, migrated: 0, errors: 0, duplicates: 0 },
  statusHistory: { total: 0, migrated: 0, errors: 0 }
};

// Helper function to convert Firebase Timestamp to PostgreSQL timestamp
function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return new Date(timestamp).toISOString();
}

// Helper function to parse GPS coordinates
function parseGPS(location) {
  if (!location) return { lat: null, lon: null };
  
  // Handle "lat,lng" format
  const match = location.toString().match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2])
    };
  }
  
  return { lat: null, lon: null };
}

// Check if a pole already exists in Neon
async function poleExists(projectId, poleNumber) {
  try {
    const result = await sql`
      SELECT id FROM project_poles 
      WHERE project_id = ${projectId}::uuid 
        AND pole_number = ${poleNumber}
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking pole existence: ${error.message}`);
    return false;
  }
}

// Check if a drop already exists in Neon
async function dropExists(projectId, dropNumber) {
  try {
    const result = await sql`
      SELECT id FROM project_drops
      WHERE project_id = ${projectId}::uuid
        AND drop_number = ${dropNumber}
    `;
    return result.length > 0;
  } catch (error) {
    console.error(`Error checking drop existence: ${error.message}`);
    return false;
  }
}

// Migrate poles from various Firebase collections
async function migratePoles() {
  console.log('\n📍 Migrating Poles...');
  
  // Collections to migrate from
  const poleCollections = [
    { name: 'pole-trackers', type: 'tracker' },
    { name: 'planned-poles', type: 'planned' },
    { name: 'pole-installations', type: 'installation' }
  ];
  
  for (const collection of poleCollections) {
    console.log(`\n  Processing ${collection.name}...`);
    
    try {
      const snapshot = await db.collection(collection.name).get();
      console.log(`  Found ${snapshot.size} documents in ${collection.name}`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        stats.poles.total++;
        
        // Filter by project if specified
        if (projectFilter && data.projectId !== projectFilter) continue;
        
        // Check if pole already exists
        if (await poleExists(data.projectId, data.poleNumber)) {
          console.log(`  ⚠️  Pole already exists: ${data.poleNumber}`);
          stats.poles.duplicates++;
          continue;
        }
        
        try {
          // Parse GPS coordinates
          const gps = parseGPS(data.location || data.gpsLocation);
          
          // Prepare connected drops array
          const connectedDrops = data.connectedDrops || [];
          
          // Map status
          const status = mapPoleStatus(data.status);
          
          if (!isDryRun) {
            await sql`
              INSERT INTO project_poles (
                project_id,
                pole_number,
                vf_pole_id,
                status,
                pole_type,
                pon,
                zone,
                location,
                gps_lat,
                gps_lon,
                drop_count,
                max_capacity,
                connected_drops,
                quality_checked,
                contractor_id,
                working_team,
                upload_before,
                upload_front,
                upload_side,
                upload_depth,
                upload_concrete,
                upload_compaction,
                import_batch_id,
                date_installed,
                created_at,
                updated_at,
                created_by,
                updated_by
              ) VALUES (
                ${data.projectId}::uuid,
                ${data.poleNumber},
                ${data.vfPoleId || data.poleId || null},
                ${status},
                ${data.poleType || 'wooden'},
                ${data.pon || null},
                ${data.zone || null},
                ${data.location || null},
                ${gps.lat},
                ${gps.lon},
                ${data.dropCount || connectedDrops.length || 0},
                ${data.maxCapacity || 12},
                ${connectedDrops},
                ${data.qualityChecked || false},
                ${data.contractorId || null},
                ${data.workingTeam || null},
                ${data.uploads?.before?.uploaded || false},
                ${data.uploads?.front?.uploaded || false},
                ${data.uploads?.side?.uploaded || false},
                ${data.uploads?.depth?.uploaded || false},
                ${data.uploads?.concrete?.uploaded || false},
                ${data.uploads?.compaction?.uploaded || false},
                ${`firebase_${collection.name}_${new Date().toISOString()}`},
                ${convertTimestamp(data.dateInstalled)},
                ${convertTimestamp(data.createdAt) || new Date().toISOString()},
                ${convertTimestamp(data.updatedAt) || new Date().toISOString()},
                ${data.createdBy || 'migration'},
                ${data.updatedBy || 'migration'}
              )
            `;
            
            // Add status history if present
            if (data.statusHistory && Array.isArray(data.statusHistory)) {
              for (const entry of data.statusHistory) {
                await addStatusHistory(
                  data.projectId,
                  data.poleNumber,
                  entry.previousStatus,
                  entry.status,
                  entry.changedBy,
                  entry.changedAt,
                  entry.notes
                );
              }
            }
          }
          
          stats.poles.migrated++;
          console.log(`  ✓ Pole: ${data.poleNumber}`);
          
        } catch (error) {
          console.error(`  ✗ Error migrating pole ${doc.id}: ${error.message}`);
          stats.poles.errors++;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${collection.name}:`, error);
    }
  }
}

// Migrate drops from various Firebase collections
async function migrateDrops() {
  console.log('\n🏠 Migrating Drops...');
  
  // Collections to migrate from
  const dropCollections = [
    { name: 'home-signups', type: 'signup' },
    { name: 'homes-connected', type: 'connected' },
    { name: 'homes-activated', type: 'activated' },
    { name: 'drops', type: 'drop' }
  ];
  
  for (const collection of dropCollections) {
    console.log(`\n  Processing ${collection.name}...`);
    
    try {
      const snapshot = await db.collection(collection.name).get();
      console.log(`  Found ${snapshot.size} documents in ${collection.name}`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        stats.drops.total++;
        
        // Get project ID from pole if not directly available
        let projectId = data.projectId;
        if (!projectId && data.connectedToPole) {
          // Try to find project ID from pole
          const poleResult = await sql`
            SELECT project_id FROM project_poles 
            WHERE pole_number = ${data.connectedToPole}
            LIMIT 1
          `;
          if (poleResult.length > 0) {
            projectId = poleResult[0].project_id;
          }
        }
        
        if (!projectId) {
          console.log(`  ⚠️  No project ID for drop: ${data.dropNumber}`);
          continue;
        }
        
        // Check if drop already exists
        if (await dropExists(projectId, data.dropNumber)) {
          console.log(`  ⚠️  Drop already exists: ${data.dropNumber}`);
          stats.drops.duplicates++;
          continue;
        }
        
        try {
          // Parse GPS coordinates
          const gps = parseGPS(data.location || data.gpsLocation);
          
          // Map status based on collection type
          const status = mapDropStatus(data.status, collection.type);
          
          if (!isDryRun) {
            await sql`
              INSERT INTO project_drops (
                project_id,
                drop_number,
                connected_to_pole,
                ont_reference,
                is_spare,
                pon,
                zone,
                gps_lat,
                gps_lon,
                status,
                pole_validated,
                capacity_validated,
                quality_checked,
                installation_date,
                activation_date,
                installed_by,
                installed_by_name,
                import_batch_id,
                created_at,
                updated_at,
                created_by,
                updated_by
              ) VALUES (
                ${projectId}::uuid,
                ${data.dropNumber},
                ${data.connectedToPole || data.poleNumber || null},
                ${data.ontReference || data.ontSerial || null},
                ${data.isSpare || false},
                ${data.pon || null},
                ${data.zone || null},
                ${gps.lat},
                ${gps.lon},
                ${status},
                ${data.poleValidated || false},
                ${data.capacityValidated || false},
                ${data.qualityChecked || false},
                ${convertTimestamp(data.installationDate || data.connectionDate)},
                ${convertTimestamp(data.activationDate)},
                ${data.installedBy || data.createdBy || null},
                ${data.installedByName || null},
                ${`firebase_${collection.name}_${new Date().toISOString()}`},
                ${convertTimestamp(data.createdAt) || new Date().toISOString()},
                ${convertTimestamp(data.updatedAt) || new Date().toISOString()},
                ${data.createdBy || 'migration'},
                ${data.updatedBy || 'migration'}
              )
            `;
          }
          
          stats.drops.migrated++;
          console.log(`  ✓ Drop: ${data.dropNumber}`);
          
        } catch (error) {
          console.error(`  ✗ Error migrating drop ${doc.id}: ${error.message}`);
          stats.drops.errors++;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${collection.name}:`, error);
    }
  }
}

// Add status history entry
async function addStatusHistory(propertyId, poleNumber, oldStatus, newStatus, changedBy, changedAt, notes) {
  try {
    await sql`
      INSERT INTO status_history (
        property_id,
        pole_number,
        old_status,
        new_status,
        changed_by,
        changed_at,
        import_batch_id,
        change_details
      ) VALUES (
        ${propertyId},
        ${poleNumber},
        ${oldStatus || null},
        ${newStatus},
        ${changedBy || 'migration'},
        ${convertTimestamp(changedAt) || new Date().toISOString()},
        ${'firebase_migration_' + new Date().toISOString()},
        ${JSON.stringify({ notes, source: 'firebase_migration' })}
      )
    `;
    stats.statusHistory.migrated++;
  } catch (error) {
    console.error(`Error adding status history: ${error.message}`);
    stats.statusHistory.errors++;
  }
}

// Helper function to map Firebase pole status to Neon
function mapPoleStatus(status) {
  const statusMap = {
    'planned': 'Permission not granted',
    'pending': 'Permission not granted',
    'approved': 'Pole Permission: Approved',
    'in_progress': 'Construction: In Progress',
    'installed': 'Construction: Completed',
    'quality_checked': 'Quality: Approved',
    'rejected': 'Permission not granted',
    'captured': 'Construction: Completed',
    'completed': 'Construction: Completed'
  };
  
  return statusMap[status?.toLowerCase()] || 'Permission not granted';
}

// Helper function to map drop status
function mapDropStatus(status, collectionType) {
  // Map based on collection type
  if (collectionType === 'signup') return 'signup';
  if (collectionType === 'connected') return 'connected';
  if (collectionType === 'activated') return 'activated';
  
  // Otherwise try to map from status string
  const statusMap = {
    'signup_requested': 'signup',
    'signup_approved': 'signup_approved',
    'installation_scheduled': 'scheduled',
    'connected': 'connected',
    'activated': 'activated',
    'suspended': 'suspended'
  };
  
  return statusMap[status?.toLowerCase()] || 'planned';
}

// Update drop counts after migration
async function updateDropCounts() {
  console.log('\n🔢 Updating drop counts...');
  
  try {
    if (!isDryRun) {
      // Update drop_count based on connected_drops array
      const result = await sql`
        UPDATE project_poles
        SET drop_count = COALESCE(array_length(connected_drops, 1), 0)
        WHERE connected_drops IS NOT NULL
      `;
      
      console.log(`✓ Updated drop counts for poles`);
      
      // Also update pole capacity table
      await sql`
        INSERT INTO pole_capacity (pole_number, total_drops, max_capacity, last_updated)
        SELECT 
          pole_number,
          drop_count,
          max_capacity,
          NOW()
        FROM project_poles
        ON CONFLICT (pole_number) DO UPDATE
        SET 
          total_drops = EXCLUDED.total_drops,
          last_updated = EXCLUDED.last_updated
      `;
      
      console.log(`✓ Updated pole capacity table`);
    }
  } catch (error) {
    console.error('Error updating drop counts:', error);
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting Firebase to Neon Migration');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Using existing Neon tables: project_poles, project_drops`);
  if (projectFilter) {
    console.log(`Filtering by project: ${projectFilter}`);
  }
  
  try {
    // Test Neon connection
    const testResult = await sql`SELECT 1 as test`;
    console.log('✓ Connected to Neon database');
    
    // Check existing data
    const poleCount = await sql`SELECT COUNT(*) as count FROM project_poles`;
    const dropCount = await sql`SELECT COUNT(*) as count FROM project_drops`;
    console.log(`\nExisting data in Neon:`);
    console.log(`  - project_poles: ${poleCount[0].count} records`);
    console.log(`  - project_drops: ${dropCount[0].count} records`);
    
    // Run migrations
    await migratePoles();
    await migrateDrops();
    await updateDropCounts();
    
    // Print summary
    console.log('\n📊 Migration Summary:');
    console.log('====================');
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`${key}:`);
      console.log(`  Total: ${value.total}`);
      console.log(`  Migrated: ${value.migrated}`);
      console.log(`  Duplicates: ${value.duplicates || 0}`);
      console.log(`  Errors: ${value.errors}`);
    });
    
    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was actually migrated.');
      console.log('Run without --dry-run flag to perform actual migration.');
    } else {
      // Final counts
      const finalPoleCount = await sql`SELECT COUNT(*) as count FROM project_poles`;
      const finalDropCount = await sql`SELECT COUNT(*) as count FROM project_drops`;
      console.log(`\nFinal data in Neon:`);
      console.log(`  - project_poles: ${finalPoleCount[0].count} records`);
      console.log(`  - project_drops: ${finalDropCount[0].count} records`);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    console.log('\n✓ Migration complete');
    process.exit(0);
  }
}

// Run migration
migrate().catch(console.error);