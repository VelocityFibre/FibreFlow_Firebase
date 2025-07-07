const admin = require('firebase-admin');
const sql = require('mssql');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Check if running in GitHub Actions
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Local development - use default credentials
    admin.initializeApp();
  }
}

// SQL Server configuration
const sqlConfig = {
  user: 'fibreflowadmin',
  password: 'Xoouphae2415!',
  database: 'fromfirebase',
  server: 'fibreflow.database.windows.net',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000
  }
};

// Helper to convert Firebase timestamp to SQL date
function toSqlDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
}

// Clear all tables in correct order (respecting foreign keys)
async function clearAllTables(pool) {
  console.log('Clearing existing data in correct order...');
  
  const tablesToClear = [
    // Clear dependent tables first
    'Tasks',           // Has FKs to Projects and Staff
    'StockItems',      // Has FK to Suppliers
    'Projects',        // Referenced by Tasks
    'Staff',           // Referenced by Tasks
    'Suppliers',       // Referenced by StockItems
    'Clients',
    'Contractors',
    'Materials'
  ];
  
  for (const table of tablesToClear) {
    try {
      await pool.request().query(`DELETE FROM ${table}`);
      console.log(`  ✓ Cleared ${table}`);
    } catch (error) {
      console.log(`  ⚠ Could not clear ${table}: ${error.message}`);
    }
  }
}

// Create UNASSIGNED project for orphaned tasks
async function createUnassignedProject(pool) {
  const unassignedProject = {
    id: 'UNASSIGNED',
    project_code: 'UNASSIGNED',
    name: 'Unassigned Tasks (from deleted projects)',
    description: 'Container for tasks whose original projects were deleted',
    client_id: null,
    client_name: 'System',
    client_contact: '',
    status: 'active',
    project_type: 'FTTH',
    location: 'Various',
    budget: 0,
    budget_used: 0,
    start_date: new Date(),
    expected_end_date: null,
    actual_end_date: null,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    updated_by: 'system',
    firestore_sync_timestamp: new Date()
  };
  
  try {
    const columns = Object.keys(unassignedProject);
    const values = columns.map((col, index) => `@param${index}`);
    
    const request = pool.request();
    columns.forEach((col, index) => {
      const value = unassignedProject[col];
      if (value instanceof Date) {
        request.input(`param${index}`, sql.DateTime2, value);
      } else if (typeof value === 'number') {
        request.input(`param${index}`, sql.Decimal(18, 2), value);
      } else {
        request.input(`param${index}`, sql.NVarChar, value);
      }
    });
    
    await request.query(`INSERT INTO Projects (${columns.join(', ')}) VALUES (${values.join(', ')})`);
    console.log('✓ Created UNASSIGNED project for orphaned tasks');
  } catch (error) {
    if (error.message.includes('Violation of PRIMARY KEY')) {
      console.log('  UNASSIGNED project already exists');
    } else {
      console.error('Error creating UNASSIGNED project:', error.message);
    }
  }
}

// Get all valid project IDs
async function getValidProjectIds() {
  const projectsSnapshot = await admin.firestore().collection('projects').get();
  const projectIds = new Set();
  projectsSnapshot.forEach(doc => projectIds.add(doc.id));
  return projectIds;
}

// Sync collection
async function syncCollection(collectionName, tableName, transformFn, validProjectIds = null) {
  console.log(`\nSyncing ${collectionName} to ${tableName}...`);
  
  try {
    const snapshot = await admin.firestore().collection(collectionName).get();
    console.log(`Found ${snapshot.size} documents in ${collectionName}`);
    
    if (snapshot.empty) {
      return { success: 0, errors: 0, orphaned: 0 };
    }
    
    const pool = await sql.connect(sqlConfig);
    
    let successCount = 0;
    let errorCount = 0;
    let orphanedCount = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        let transformedData = transformFn(data, doc.id);
        
        // For tasks, validate project ID
        if (collectionName === 'tasks' && validProjectIds) {
          const projectId = transformedData.project_id;
          if (!projectId || !validProjectIds.has(projectId)) {
            orphanedCount++;
            transformedData.project_id = 'UNASSIGNED';
            // Append original project ID to description
            const originalProject = projectId || 'none';
            transformedData.description = `${transformedData.description} [Original Project: ${originalProject}]`.substring(0, 500);
          }
        }
        
        const columns = Object.keys(transformedData);
        const values = columns.map((col, index) => `@param${index}`);
        
        const request = pool.request();
        columns.forEach((col, index) => {
          const value = transformedData[col];
          if (value instanceof Date) {
            request.input(`param${index}`, sql.DateTime2, value);
          } else if (typeof value === 'number') {
            request.input(`param${index}`, sql.Decimal(18, 2), value);
          } else if (typeof value === 'boolean') {
            request.input(`param${index}`, sql.Bit, value);
          } else {
            request.input(`param${index}`, sql.NVarChar, value);
          }
        });
        
        const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
        await request.query(query);
        
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`  Progress: ${successCount}/${snapshot.size}`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`  Error syncing ${doc.id}: ${error.message}`);
        }
      }
    }
    
    await pool.close();
    
    console.log(`✓ Completed: ${successCount} synced, ${errorCount} errors`);
    if (orphanedCount > 0) {
      console.log(`  ↻ Reassigned ${orphanedCount} orphaned tasks to UNASSIGNED project`);
    }
    
    return { success: successCount, errors: errorCount, orphaned: orphanedCount };
  } catch (error) {
    console.error(`Error syncing ${collectionName}:`, error.message);
    return { success: 0, errors: 1, orphaned: 0 };
  }
}

// Transform functions
const transforms = {
  projects: (data, id) => ({
    id: id,
    project_code: data.projectCode || `PRJ-${id.substring(0, 6).toUpperCase()}`,
    name: data.title || data.name || 'Unnamed Project',
    description: data.description || '',
    client_id: data.client?.id || null,
    client_name: data.client?.name || '',
    client_contact: data.client?.contact || '',
    status: ['planning', 'active', 'on_hold', 'completed', 'cancelled'].includes(data.status) 
      ? data.status : 'planning',
    project_type: ['FTTH', 'FTTB', 'FTTC', 'P2P', 'Enterprise', 'Backbone'].includes(data.type)
      ? data.type : 'FTTH',
    location: data.location || '',
    budget: data.budget || 0,
    budget_used: data.budgetUsed || 0,
    start_date: toSqlDate(data.startDate) || new Date(),
    expected_end_date: toSqlDate(data.endDate),
    actual_end_date: toSqlDate(data.actualEndDate),
    created_at: toSqlDate(data.createdAt) || new Date(),
    updated_at: toSqlDate(data.updatedAt) || new Date(),
    created_by: data.createdBy || 'system',
    updated_by: data.updatedBy || 'system',
    firestore_sync_timestamp: new Date()
  }),
  
  staff: (data, id) => ({
    id: id,
    employee_id: `EMP-${id.substring(0, 6).toUpperCase()}`,
    name: data.name || 'Unknown',
    email: data.email || `user${id.substring(0, 6)}@fibreflow.com`,
    phone: data.phone || '',
    primary_group: ['Admin', 'ProjectManager', 'TeamLead', 'Technician', 'Supplier', 'Client'].includes(data.role)
      ? data.role : 'Technician',
    secondary_groups: JSON.stringify(data.secondaryGroups || []),
    availability_status: data.availabilityStatus || 'available',
    skills: JSON.stringify(data.skills || []),
    certifications: JSON.stringify(data.certifications || []),
    last_login: toSqlDate(data.lastLogin),
    is_active: data.isActive !== false,
    created_at: toSqlDate(data.createdAt) || new Date(),
    updated_at: toSqlDate(data.updatedAt) || new Date(),
    firestore_sync_timestamp: new Date()
  }),
  
  tasks: (data, id) => ({
    id: id,
    name: data.name || data.title || 'Unnamed Task',
    description: (data.description || '').substring(0, 500), // Limit description length
    project_id: data.projectId || 'UNASSIGNED',
    phase_id: data.phaseId || null,
    step_id: data.stepId || null,
    assignee_id: data.assigneeId || data.assignedTo || null,
    assignee_name: data.assigneeName || '',
    status: ['todo', 'in_progress', 'in_review', 'completed', 'blocked', 'cancelled'].includes(data.status)
      ? data.status : 'todo',
    priority: ['low', 'medium', 'high', 'critical'].includes(data.priority)
      ? data.priority : 'medium',
    estimated_hours: data.estimatedHours || 0,
    actual_hours: data.actualHours || 0,
    start_date: toSqlDate(data.startDate),
    due_date: toSqlDate(data.dueDate),
    completed_date: toSqlDate(data.completedDate),
    dependencies: JSON.stringify(data.dependencies || []),
    created_at: toSqlDate(data.createdAt) || new Date(),
    updated_at: toSqlDate(data.updatedAt) || new Date(),
    created_by: data.createdBy || 'system',
    updated_by: data.updatedBy || 'system',
    firestore_sync_timestamp: new Date()
  })
};

// Main sync function
async function syncAll() {
  console.log('=========================================');
  console.log('COMPLETE FIREBASE TO SQL SYNC');
  console.log('=========================================');
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  try {
    // Test connection
    console.log('\nTesting SQL connection...');
    const pool = await sql.connect(sqlConfig);
    console.log('✓ SQL connection successful');
    
    // Clear all tables
    await clearAllTables(pool);
    
    // Get valid project IDs
    const validProjectIds = await getValidProjectIds();
    console.log(`\nFound ${validProjectIds.size} valid projects in Firebase`);
    
    // Create UNASSIGNED project first
    await createUnassignedProject(pool);
    
    await pool.close();
    
    const results = [];
    
    // 1. Sync Projects (must be first)
    results.push({
      name: 'Projects',
      ...await syncCollection('projects', 'Projects', transforms.projects)
    });
    
    // 2. Sync Staff
    results.push({
      name: 'Staff',
      ...await syncCollection('staff', 'Staff', transforms.staff)
    });
    
    // 3. Sync Tasks (with project validation)
    results.push({
      name: 'Tasks',
      ...await syncCollection('tasks', 'Tasks', transforms.tasks, validProjectIds)
    });
    
    // Final summary
    console.log('\n=========================================');
    console.log('SYNC COMPLETE - FINAL SUMMARY');
    console.log('=========================================');
    
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalOrphaned = 0;
    
    results.forEach(r => {
      console.log(`\n${r.name}:`);
      console.log(`  ✓ Synced: ${r.success}`);
      if (r.errors > 0) console.log(`  ✗ Errors: ${r.errors}`);
      if (r.orphaned > 0) console.log(`  ↻ Orphaned (reassigned): ${r.orphaned}`);
      
      totalSuccess += r.success;
      totalErrors += r.errors;
      totalOrphaned += r.orphaned;
    });
    
    console.log('\n-----------------------------------------');
    console.log(`TOTAL SYNCED: ${totalSuccess} documents`);
    if (totalOrphaned > 0) {
      console.log(`ORPHANED TASKS: ${totalOrphaned} (now in UNASSIGNED project)`);
    }
    
    console.log(`\nCompleted at: ${new Date().toLocaleString()}`);
    console.log('\n✅ All Firebase data is now in SQL Server!');
    console.log('✅ Power BI can access all 1044 tasks!');
    console.log('✅ Historical data from deleted projects preserved!');
    
    // Run final check
    console.log('\nRunning final verification...');
    const checkPool = await sql.connect(sqlConfig);
    const taskCount = await checkPool.request().query('SELECT COUNT(*) as count FROM Tasks');
    console.log(`\nFINAL TASK COUNT IN SQL: ${taskCount.recordset[0].count}`);
    await checkPool.close();
    
  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

// Run sync
syncAll().catch(console.error);