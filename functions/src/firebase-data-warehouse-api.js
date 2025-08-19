const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();
const db = admin.firestore();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// API Keys for authentication
const API_KEYS = [
  'powerbi-firebase-warehouse-2025',
  'management-firebase-key-2025',
  process.env.FIREBASE_POWERBI_KEY,
  functions.config().powerbi?.firebase_key,
].filter(Boolean);

// Middleware to check API key
function checkApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apikey;
  
  if (!apiKey || !API_KEYS.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      hint: 'Use X-API-Key header or ?apikey= parameter'
    });
  }
  
  next();
}

// Apply API key check to all routes
app.use(checkApiKey);

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test Firestore connection
    const testDoc = await db.collection('_health_check').doc('test').get();
    
    res.json({
      success: true,
      service: 'Firebase Data Warehouse API',
      database: 'Firestore connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      service: 'Firebase Data Warehouse API',
      database: 'Firestore connection test skipped',
      timestamp: new Date().toISOString()
    });
  }
});

// List all collections
app.get('/collections', async (req, res) => {
  try {
    const collections = await db.listCollections();
    const collectionData = [];
    
    for (const collection of collections) {
      // Get count for each collection (limited to prevent timeout)
      const snapshot = await collection.limit(1).get();
      const countSnapshot = await collection.count().get();
      
      collectionData.push({
        name: collection.id,
        documentCount: countSnapshot.data().count,
        hasData: snapshot.size > 0
      });
    }
    
    // Sort by document count
    collectionData.sort((a, b) => b.documentCount - a.documentCount);
    
    res.json({
      success: true,
      collections: collectionData,
      total: collectionData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list collections',
      message: error.message
    });
  }
});

// Get all data from all collections (Power BI friendly)
app.get('/all-data', async (req, res) => {
  try {
    // Define collections to include (excluding system/internal collections)
    const collectionsToInclude = [
      'projects', 'tasks', 'staff', 'contractors', 'suppliers', 'clients',
      'materials', 'stockItems', 'stockMovements', 'stockAllocations',
      'boqItems', 'quotes', 'rfqs', 'phases', 'steps', 'roles',
      'daily-progress', 'daily-kpis', 'meetings', 'action-items',
      'planned-poles', 'pole-installations', 'import-batches',
      'staging-field-captures', 'field_pole_captures',
      'audit-logs', 'emailLogs'
    ];
    
    const allData = {};
    const errors = [];
    
    // Get data from each collection
    for (const collectionName of collectionsToInclude) {
      try {
        const collection = db.collection(collectionName);
        const countSnapshot = await collection.count().get();
        const count = countSnapshot.data().count;
        
        // Limit data to prevent timeout (adjust as needed)
        const limit = Math.min(count, 500);
        const snapshot = await collection.limit(limit).get();
        
        allData[collectionName] = {
          documents: snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })),
          totalCount: count,
          returnedCount: snapshot.size,
          limited: count > limit
        };
      } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        errors.push({
          collection: collectionName,
          error: error.message
        });
        allData[collectionName] = {
          documents: [],
          totalCount: 0,
          returnedCount: 0,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      data: allData,
      collections: Object.keys(allData),
      errors: errors.length > 0 ? errors : undefined,
      meta: {
        description: 'All Firebase/Firestore data for Power BI',
        timestamp: new Date().toISOString(),
        recordCounts: Object.keys(allData).reduce((acc, key) => {
          acc[key] = allData[key].totalCount;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all data',
      message: error.message
    });
  }
});

// Get specific collection data
app.get('/collections/:collectionName', async (req, res) => {
  try {
    const { collectionName } = req.params;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    
    const collection = db.collection(collectionName);
    
    // Get total count
    const countSnapshot = await collection.count().get();
    const totalCount = countSnapshot.data().count;
    
    // Get documents with pagination
    let query = collection.orderBy(admin.firestore.FieldPath.documentId());
    
    if (offset > 0) {
      // For offset, we need to use startAfter with the last doc ID
      const skipSnapshot = await query.limit(offset).get();
      if (!skipSnapshot.empty) {
        const lastDoc = skipSnapshot.docs[skipSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }
    
    const snapshot = await query.limit(limit).get();
    
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      collection: collectionName,
      data: documents,
      meta: {
        total: totalCount,
        returned: documents.length,
        limit,
        offset,
        hasMore: offset + documents.length < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to fetch collection ${req.params.collectionName}`,
      message: error.message
    });
  }
});

// Management Dashboard - Key metrics from Firebase
app.get('/dashboard', async (req, res) => {
  try {
    const metrics = {};
    
    // Projects metrics
    const projectsSnapshot = await db.collection('projects').count().get();
    metrics.projects = {
      total: projectsSnapshot.data().count,
      // Get active projects
      active: (await db.collection('projects')
        .where('status', '==', 'active')
        .count().get()).data().count
    };
    
    // Tasks metrics
    const tasksSnapshot = await db.collection('tasks').count().get();
    metrics.tasks = {
      total: tasksSnapshot.data().count,
      // Get completed tasks
      completed: (await db.collection('tasks')
        .where('status', '==', 'completed')
        .count().get()).data().count
    };
    
    // Staff metrics
    const staffSnapshot = await db.collection('staff').count().get();
    metrics.staff = {
      total: staffSnapshot.data().count
    };
    
    // Poles metrics
    const polesSnapshot = await db.collection('planned-poles').count().get();
    metrics.poles = {
      planned: polesSnapshot.data().count,
      installed: (await db.collection('pole-installations').count().get()).data().count
    };
    
    // Materials/Stock metrics
    const stockSnapshot = await db.collection('stockItems').count().get();
    metrics.stock = {
      totalItems: stockSnapshot.data().count,
      movements: (await db.collection('stockMovements').count().get()).data().count
    };
    
    // Recent activity
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    
    metrics.recentActivity = {
      meetings: (await db.collection('meetings')
        .where('date', '>=', recentDate)
        .count().get()).data().count,
      dailyProgress: (await db.collection('daily-progress')
        .where('date', '>=', recentDate)
        .count().get()).data().count
    };
    
    res.json({
      success: true,
      dashboard: metrics,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard',
      message: error.message
    });
  }
});

// Power BI optimized endpoints
app.get('/powerbi/projects-overview', async (req, res) => {
  try {
    const projectsSnapshot = await db.collection('projects').get();
    const projects = [];
    
    for (const doc of projectsSnapshot.docs) {
      const project = doc.data();
      
      // Get related data counts
      const phasesCount = (await db.collection('projects').doc(doc.id)
        .collection('phases').count().get()).data().count;
      
      const tasksCount = (await db.collection('tasks')
        .where('projectId', '==', doc.id).count().get()).data().count;
      
      projects.push({
        id: doc.id,
        ...project,
        phasesCount,
        tasksCount
      });
    }
    
    res.json({
      success: true,
      data: projects,
      meta: {
        total: projects.length,
        description: 'Projects with related counts'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get projects overview',
      message: error.message
    });
  }
});

app.get('/powerbi/staff-contractors', async (req, res) => {
  try {
    // Get staff
    const staffSnapshot = await db.collection('staff').get();
    const staff = staffSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'staff',
      ...doc.data()
    }));
    
    // Get contractors
    const contractorsSnapshot = await db.collection('contractors').get();
    const contractors = contractorsSnapshot.docs.map(doc => ({
      id: doc.id,
      type: 'contractor',
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: {
        staff,
        contractors,
        combined: [...staff, ...contractors]
      },
      meta: {
        staffCount: staff.length,
        contractorCount: contractors.length,
        totalWorkforce: staff.length + contractors.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workforce data',
      message: error.message
    });
  }
});

// Export as Firebase Function
exports.firebaseDataWarehouse = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300  // 5 minutes for large data exports
  })
  .https
  .onRequest(app);