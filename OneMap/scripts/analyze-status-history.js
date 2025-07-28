#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../credentials/vf-onemap-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'vf-onemap-data'
    });
}

const db = admin.firestore();

async function analyzeStatusHistory() {
    console.log('🔍 Analyzing status history...\n');
    
    // Get all records
    const snapshot = await db.collection('vf-onemap-processed-records').get();
    
    let totalRecords = 0;
    let recordsWithHistory = 0;
    let recordsWithMultipleEntries = 0;
    let recordsWithStatusChanges = 0;
    const sampleChanges = [];
    
    snapshot.forEach(doc => {
        const data = doc.data();
        totalRecords++;
        
        if (data.statusHistory && data.statusHistory.length > 0) {
            recordsWithHistory++;
            
            if (data.statusHistory.length > 1) {
                recordsWithMultipleEntries++;
                
                // Check if statuses actually changed
                let hasChange = false;
                for (let i = 1; i < data.statusHistory.length; i++) {
                    if (data.statusHistory[i].status !== data.statusHistory[i-1].status) {
                        hasChange = true;
                        
                        // Collect sample for report
                        if (sampleChanges.length < 5) {
                            sampleChanges.push({
                                propertyId: data.propertyId,
                                poleNumber: data.poleNumber,
                                history: data.statusHistory
                            });
                        }
                        break;
                    }
                }
                
                if (hasChange) {
                    recordsWithStatusChanges++;
                }
            }
        }
    });
    
    console.log('📊 Analysis Results:');
    console.log(`Total Records: ${totalRecords}`);
    console.log(`Records with History: ${recordsWithHistory}`);
    console.log(`Records with Multiple Entries: ${recordsWithMultipleEntries}`);
    console.log(`Records with Actual Status Changes: ${recordsWithStatusChanges}`);
    
    if (sampleChanges.length > 0) {
        console.log('\n📋 Sample Status Changes:');
        sampleChanges.forEach(sample => {
            console.log(`\nProperty ${sample.propertyId} (Pole: ${sample.poleNumber || 'No pole'})`);
            sample.history.forEach((entry, i) => {
                console.log(`  ${i + 1}. ${entry.date}: ${entry.status} (${entry.agent || 'No agent'})`);
            });
        });
    } else {
        console.log('\n⚠️ No status changes found!');
        console.log('This likely means all properties kept the same status across all imports.');
    }
    
    // Check a specific property
    console.log('\n🔍 Checking specific property as example:');
    const exampleDoc = await db.collection('vf-onemap-processed-records')
        .where('poleNumber', '==', 'LAW.P.C739')
        .limit(1)
        .get();
    
    if (!exampleDoc.empty) {
        const data = exampleDoc.docs[0].data();
        console.log(`Property ${data.propertyId}:`);
        console.log(`Current Status: ${data.currentStatus}`);
        console.log(`History Entries: ${data.statusHistory?.length || 0}`);
        if (data.statusHistory) {
            data.statusHistory.forEach((entry, i) => {
                console.log(`  ${i + 1}. ${entry.date}: ${entry.status}`);
            });
        }
    }
    
    await admin.app().delete();
}

analyzeStatusHistory().catch(console.error);