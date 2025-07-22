const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');
const path = require('path');

// Initialize Firebase Admin
// Using application default credentials
admin.initializeApp({
  projectId: 'fibreflow-73daf',
});

const db = admin.firestore();

async function importStaffFromCSV() {
  try {
    console.log('🚀 Starting automated staff import...\n');
    
    // Read CSV file
    const csvContent = fs.readFileSync('staff-import-ready.csv', 'utf-8');
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`📋 Found ${records.length} staff members in CSV\n`);
    
    const batch = db.batch();
    let importCount = 0;
    let skipCount = 0;
    
    // Check existing staff first
    const staffCollection = await db.collection('staff').get();
    const existingEmails = new Set();
    staffCollection.forEach(doc => {
      const data = doc.data();
      if (data.email) {
        existingEmails.add(data.email.toLowerCase());
      }
    });
    
    console.log(`📊 Found ${existingEmails.size} existing staff members\n`);
    console.log('Processing imports...\n');
    
    for (const record of records) {
      const email = record['Email'].toLowerCase();
      
      // Skip if already exists
      if (existingEmails.has(email)) {
        console.log(`⚠️  Skipping existing: ${record['Name']} (${email})`);
        skipCount++;
        continue;
      }
      
      // Create staff document
      const staffDoc = {
        employeeId: record['Employee ID'],
        name: record['Name'],
        email: email,
        phone: record['Phone'],
        primaryGroup: record['Primary Group'],
        availability: {
          status: 'available',
          workingHours: {
            start: '08:00',
            end: '17:00',
            timezone: 'Africa/Johannesburg'
          },
          currentTaskCount: 0,
          maxConcurrentTasks: 5
        },
        activity: {
          lastLogin: null,
          lastActive: null,
          tasksCompleted: 0,
          tasksInProgress: 0,
          tasksFlagged: 0,
          totalProjectsWorked: 0,
          averageTaskCompletionTime: 0
        },
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'csv-import'
      };
      
      // Add to batch
      const docRef = db.collection('staff').doc();
      batch.set(docRef, staffDoc);
      console.log(`✅ Preparing: ${record['Name']} (${record['Primary Group']})`);
      importCount++;
    }
    
    if (importCount > 0) {
      console.log('\n📤 Committing batch to Firebase...');
      await batch.commit();
      console.log('✅ Batch committed successfully!\n');
    }
    
    // Summary
    console.log('📊 Import Summary:');
    console.log('=================');
    console.log(`✅ Imported: ${importCount} new staff members`);
    console.log(`⚠️  Skipped: ${skipCount} existing staff members`);
    console.log(`📋 Total processed: ${records.length}`);
    
    // Group breakdown of imported
    if (importCount > 0) {
      const groupCounts = {};
      records.forEach(record => {
        if (!existingEmails.has(record['Email'].toLowerCase())) {
          const group = record['Primary Group'];
          groupCounts[group] = (groupCounts[group] || 0) + 1;
        }
      });
      
      console.log('\n📈 Imported by Group:');
      Object.entries(groupCounts).forEach(([group, count]) => {
        console.log(`  ${group}: ${count}`);
      });
    }
    
    console.log('\n✨ Import complete!');
    console.log('🌐 View at: https://fibreflow-73daf.web.app/staff\n');
    
  } catch (error) {
    console.error('❌ Import error:', error.message);
    if (error.code === 'permission-denied') {
      console.log('\n🔐 Permission denied. Trying alternative approach...\n');
      generateBrowserScript();
    }
  }
}

function generateBrowserScript() {
  console.log('📝 Since direct import requires authentication, here\'s a browser script:\n');
  console.log('1. Copy the entire code block below');
  console.log('2. Go to https://fibreflow-73daf.web.app');
  console.log('3. Log in as admin');
  console.log('4. Open browser console (F12)');
  console.log('5. Paste and press Enter\n');
  
  const csvContent = fs.readFileSync('staff-import-ready.csv', 'utf-8');
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  
  const staffData = records.map(r => ({
    employeeId: r['Employee ID'],
    name: r['Name'],
    email: r['Email'].toLowerCase(),
    phone: r['Phone'],
    primaryGroup: r['Primary Group']
  }));
  
  console.log('// ===== COPY EVERYTHING BELOW THIS LINE =====');
  console.log(`
(async () => {
  const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = 
    await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
  
  const db = getFirestore();
  const staff = collection(db, 'staff');
  const data = ${JSON.stringify(staffData)};
  
  let imported = 0, skipped = 0;
  
  for (const s of data) {
    const q = query(staff, where('email', '==', s.email));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      console.log('Skip:', s.name);
      skipped++;
      continue;
    }
    
    await addDoc(staff, {
      ...s,
      availability: {
        status: 'available',
        workingHours: { start: '08:00', end: '17:00', timezone: 'Africa/Johannesburg' },
        currentTaskCount: 0,
        maxConcurrentTasks: 5
      },
      activity: {
        lastLogin: null,
        lastActive: null,
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksFlagged: 0,
        totalProjectsWorked: 0,
        averageTaskCompletionTime: 0
      },
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'import'
    });
    
    console.log('✅', s.name);
    imported++;
  }
  
  console.log('Done! Imported:', imported, 'Skipped:', skipped);
  console.log('Refresh the page to see changes');
})();`);
  console.log('\n// ===== COPY EVERYTHING ABOVE THIS LINE =====\n');
}

// Try direct import first
importStaffFromCSV();