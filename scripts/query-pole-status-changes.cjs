#!/usr/bin/env node

/**
 * Query Examples for FibreFlow Pole Status Changes
 * Shows analytics capabilities for production pole data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for FibreFlow production
admin.initializeApp({
  projectId: 'fibreflow-73daf'
});

const db = admin.firestore();

async function runPoleAnalytics() {
  console.log('🔥 FibreFlow Pole Status Analytics\n');
  console.log('Database: fibreflow-73daf (Production)');
  console.log('=' .repeat(60) + '\n');
  
  // 1. Check collection status
  console.log('📊 1. COLLECTION STATUS');
  const snapshot = await db.collection('pole-status-changes').limit(1).get();
  
  if (snapshot.empty) {
    console.log('❌ Collection not yet created. Run create-pole-status-changes-collection.js first.\n');
    return;
  }
  
  const totalChanges = await db.collection('pole-status-changes').get();
  console.log(`✅ Total status changes: ${totalChanges.size}\n`);
  
  // 2. Contractor Performance
  console.log('👷 2. CONTRACTOR PERFORMANCE');
  const contractorStats = {};
  
  totalChanges.forEach(doc => {
    const data = doc.data();
    if (data.contractorName) {
      if (!contractorStats[data.contractorName]) {
        contractorStats[data.contractorName] = {
          changes: 0,
          poles: new Set(),
          statuses: {}
        };
      }
      contractorStats[data.contractorName].changes++;
      contractorStats[data.contractorName].poles.add(data.poleId);
      
      const status = data.toStatus;
      contractorStats[data.contractorName].statuses[status] = 
        (contractorStats[data.contractorName].statuses[status] || 0) + 1;
    }
  });
  
  console.log('Top Contractors by Activity:');
  Object.entries(contractorStats)
    .sort((a, b) => b[1].changes - a[1].changes)
    .slice(0, 5)
    .forEach(([contractor, stats]) => {
      console.log(`- ${contractor}: ${stats.changes} changes across ${stats.poles.size} poles`);
      const topStatus = Object.entries(stats.statuses)
        .sort((a, b) => b[1] - a[1])[0];
      if (topStatus) {
        console.log(`  Most common status: ${topStatus[0]} (${topStatus[1]} times)`);
      }
    });
  
  // 3. Project Progress
  console.log('\n\n📈 3. PROJECT PROGRESS TRACKING');
  const projectStats = {};
  
  totalChanges.forEach(doc => {
    const data = doc.data();
    const projectKey = `${data.projectCode} - ${data.projectName}`;
    
    if (data.projectCode) {
      if (!projectStats[projectKey]) {
        projectStats[projectKey] = {
          changes: 0,
          poles: new Set(),
          latestDate: null
        };
      }
      projectStats[projectKey].changes++;
      projectStats[projectKey].poles.add(data.poleId);
      
      const changeDate = new Date(data.changeDate);
      if (!projectStats[projectKey].latestDate || changeDate > projectStats[projectKey].latestDate) {
        projectStats[projectKey].latestDate = changeDate;
        projectStats[projectKey].latestStatus = data.toStatus;
      }
    }
  });
  
  console.log('Project Activity Summary:');
  Object.entries(projectStats)
    .filter(([key, _]) => key !== ' - ')
    .sort((a, b) => b[1].changes - a[1].changes)
    .slice(0, 5)
    .forEach(([project, stats]) => {
      const lastUpdate = stats.latestDate ? stats.latestDate.toISOString().split('T')[0] : 'Unknown';
      console.log(`- ${project}`);
      console.log(`  Poles: ${stats.poles.size}, Changes: ${stats.changes}`);
      console.log(`  Last Update: ${lastUpdate} - ${stats.latestStatus || 'Unknown'}`);
    });
  
  // 4. Status Distribution
  console.log('\n\n📊 4. CURRENT STATUS DISTRIBUTION');
  const currentStatuses = {};
  
  // Get only latest statuses
  const latestStatuses = await db.collection('pole-status-changes')
    .where('isLatestStatus', '==', true)
    .get();
  
  latestStatuses.forEach(doc => {
    const status = doc.data().toStatus;
    currentStatuses[status] = (currentStatuses[status] || 0) + 1;
  });
  
  console.log('Current Pole Statuses:');
  Object.entries(currentStatuses)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      const percentage = ((count / latestStatuses.size) * 100).toFixed(1);
      console.log(`- ${status}: ${count} poles (${percentage}%)`);
    });
  
  // 5. Zone Analysis
  console.log('\n\n🗺️ 5. ZONE ACTIVITY');
  const zoneStats = {};
  
  totalChanges.forEach(doc => {
    const data = doc.data();
    if (data.zone) {
      if (!zoneStats[data.zone]) {
        zoneStats[data.zone] = {
          changes: 0,
          poles: new Set()
        };
      }
      zoneStats[data.zone].changes++;
      zoneStats[data.zone].poles.add(data.poleId);
    }
  });
  
  console.log('Top Zones by Activity:');
  Object.entries(zoneStats)
    .sort((a, b) => b[1].changes - a[1].changes)
    .slice(0, 5)
    .forEach(([zone, stats]) => {
      console.log(`- ${zone}: ${stats.changes} changes across ${stats.poles.size} poles`);
    });
  
  // 6. Recent Activity
  console.log('\n\n🕐 6. RECENT ACTIVITY');
  const recentChanges = [];
  
  totalChanges.forEach(doc => {
    const data = doc.data();
    if (data.changedAt) {
      const timestamp = data.changedAt.toDate ? data.changedAt.toDate() : new Date(data.changedAt);
      recentChanges.push({
        poleId: data.vfPoleId || data.poleId,
        change: `${data.fromStatus} → ${data.toStatus}`,
        date: data.changeDate,
        timestamp: timestamp,
        by: data.changedByName,
        source: data.source
      });
    }
  });
  
  // Sort by timestamp and show latest 10
  recentChanges
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
    .forEach(change => {
      console.log(`- [${change.date}] Pole ${change.poleId}: ${change.change}`);
      console.log(`  By: ${change.by} (Source: ${change.source})`);
    });
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ FibreFlow pole analytics complete!');
  console.log('\n💡 This data is from the PRODUCTION FibreFlow database.');
}

// Run analytics
runPoleAnalytics()
  .then(() => process.exit())
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });