const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin (already initialized in main app)
const db = admin.firestore();
const app = express();

// Enable CORS for all origins (customize as needed)
app.use(cors());
app.use(express.json());

// Base route
app.get('/', (req, res) => {
  res.json({
    message: 'OneMap Staging API',
    version: '1.0',
    endpoints: {
      '/staging/summary': 'Get summary statistics',
      '/staging/records': 'Get all records (paginated)',
      '/staging/records/:id': 'Get specific record',
      '/staging/search': 'Search records',
      '/staging/duplicates': 'Get duplicate analysis',
      '/staging/quality': 'Get data quality report'
    }
  });
});

// Get summary statistics
app.get('/staging/summary', async (req, res) => {
  try {
    const snapshot = await db.collection('onemap-staging').get();
    const records = snapshot.docs.map(doc => doc.data());
    
    const summary = {
      totalRecords: records.length,
      recordsWithPoles: records.filter(r => r.poleNumber).length,
      recordsWithAgents: records.filter(r => r.fieldAgent).length,
      uniquePoles: [...new Set(records.filter(r => r.poleNumber).map(r => r.poleNumber))].length,
      uniqueAgents: [...new Set(records.filter(r => r.fieldAgent).map(r => r.fieldAgent))].length,
      statusBreakdown: records.reduce((acc, r) => {
        acc[r.status || 'No Status'] = (acc[r.status || 'No Status'] || 0) + 1;
        return acc;
      }, {}),
      dataQuality: {
        poleCompleteness: Math.round((records.filter(r => r.poleNumber).length / records.length) * 100),
        agentCompleteness: Math.round((records.filter(r => r.fieldAgent).length / records.length) * 100)
      }
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all records (with pagination)
app.get('/staging/records', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const sortBy = req.query.sortBy || 'propertyId';
    const orderBy = req.query.orderBy || 'asc';
    
    let query = db.collection('onemap-staging')
      .orderBy(sortBy, orderBy)
      .limit(limit);
    
    if (offset > 0) {
      const startAt = await db.collection('onemap-staging')
        .orderBy(sortBy, orderBy)
        .limit(offset)
        .get();
      
      if (startAt.docs.length > 0) {
        query = query.startAfter(startAt.docs[startAt.docs.length - 1]);
      }
    }
    
    const snapshot = await query.get();
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const total = await db.collection('onemap-staging').count().get();
    
    res.json({
      data: records,
      pagination: {
        total: total.data().count,
        limit,
        offset,
        hasMore: offset + limit < total.data().count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific record
app.get('/staging/records/:id', async (req, res) => {
  try {
    const doc = await db.collection('onemap-staging').doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json({
      id: doc.id,
      ...doc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search records
app.post('/staging/search', async (req, res) => {
  try {
    const { field, operator, value, limit = 50 } = req.body;
    
    if (!field || !operator || !value) {
      return res.status(400).json({ 
        error: 'Missing required fields: field, operator, value' 
      });
    }
    
    const snapshot = await db.collection('onemap-staging')
      .where(field, operator, value)
      .limit(limit)
      .get();
    
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      query: { field, operator, value },
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get duplicate pole analysis
app.get('/staging/duplicates', async (req, res) => {
  try {
    const snapshot = await db.collection('onemap-staging').get();
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Group by pole number
    const poleGroups = {};
    records.forEach(record => {
      if (record.poleNumber) {
        if (!poleGroups[record.poleNumber]) {
          poleGroups[record.poleNumber] = [];
        }
        poleGroups[record.poleNumber].push(record);
      }
    });
    
    // Find duplicates
    const duplicates = Object.entries(poleGroups)
      .filter(([pole, records]) => records.length > 1)
      .map(([pole, records]) => ({
        poleNumber: pole,
        count: records.length,
        addresses: [...new Set(records.map(r => r.address))],
        agents: [...new Set(records.filter(r => r.fieldAgent).map(r => r.fieldAgent))],
        records: records.map(r => ({
          id: r.id,
          propertyId: r.propertyId,
          address: r.address,
          agent: r.fieldAgent,
          status: r.status,
          date: r.date
        }))
      }));
    
    res.json({
      totalDuplicatePoles: duplicates.length,
      totalAffectedRecords: duplicates.reduce((sum, d) => sum + d.count, 0),
      duplicates: duplicates.sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get data quality report
app.get('/staging/quality', async (req, res) => {
  try {
    const snapshot = await db.collection('onemap-staging').get();
    const records = snapshot.docs.map(doc => doc.data());
    
    const report = {
      totalRecords: records.length,
      fieldCompleteness: {
        propertyId: records.filter(r => r.propertyId).length,
        poleNumber: records.filter(r => r.poleNumber).length,
        fieldAgent: records.filter(r => r.fieldAgent).length,
        status: records.filter(r => r.status).length,
        gps: records.filter(r => r.gps || (r.latitude && r.longitude)).length,
        address: records.filter(r => r.address).length
      },
      dataIssues: {
        missingPoles: records.filter(r => !r.poleNumber).map(r => ({
          propertyId: r.propertyId,
          address: r.address
        })).slice(0, 10),
        missingAgents: records.filter(r => !r.fieldAgent).map(r => ({
          propertyId: r.propertyId,
          poleNumber: r.poleNumber
        })).slice(0, 10),
        suspiciousAddresses: {}
      },
      qualityScore: 0
    };
    
    // Calculate quality score
    const weights = {
      propertyId: 0.2,
      poleNumber: 0.3,
      fieldAgent: 0.25,
      status: 0.15,
      gps: 0.1
    };
    
    report.qualityScore = Math.round(
      Object.entries(weights).reduce((score, [field, weight]) => {
        const completeness = report.fieldCompleteness[field] / records.length;
        return score + (completeness * weight * 100);
      }, 0)
    );
    
    // Find suspicious addresses (too many records)
    const addressCounts = {};
    records.forEach(r => {
      if (r.address) {
        addressCounts[r.address] = (addressCounts[r.address] || 0) + 1;
      }
    });
    
    report.dataIssues.suspiciousAddresses = Object.entries(addressCounts)
      .filter(([addr, count]) => count > 20)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce((obj, [addr, count]) => {
        obj[addr] = count;
        return obj;
      }, {});
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export for Firebase Functions
exports.stagingApi = app;