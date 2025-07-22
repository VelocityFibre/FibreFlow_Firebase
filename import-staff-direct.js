// Direct import script for Firebase using the REST API
const https = require('https');
const fs = require('fs');
const csv = require('csv-parse/sync');

const FIREBASE_PROJECT_ID = 'fibreflow-73daf';
const FIRESTORE_API_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/staff`;

// Read the CSV file
const csvContent = fs.readFileSync('staff-import-ready.csv', 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

console.log(`Found ${records.length} staff members to import\n`);

// Function to convert JS object to Firestore document format
function toFirestoreDocument(staff) {
  return {
    fields: {
      employeeId: { stringValue: staff['Employee ID'] },
      name: { stringValue: staff['Name'] },
      email: { stringValue: staff['Email'] },
      phone: { stringValue: staff['Phone'] },
      primaryGroup: { stringValue: staff['Primary Group'] },
      availability: {
        mapValue: {
          fields: {
            status: { stringValue: 'available' },
            workingHours: {
              mapValue: {
                fields: {
                  start: { stringValue: '08:00' },
                  end: { stringValue: '17:00' },
                  timezone: { stringValue: 'Africa/Johannesburg' }
                }
              }
            },
            currentTaskCount: { integerValue: '0' },
            maxConcurrentTasks: { integerValue: '5' }
          }
        }
      },
      activity: {
        mapValue: {
          fields: {
            lastLogin: { nullValue: null },
            lastActive: { nullValue: null },
            tasksCompleted: { integerValue: '0' },
            tasksInProgress: { integerValue: '0' },
            tasksFlagged: { integerValue: '0' },
            totalProjectsWorked: { integerValue: '0' },
            averageTaskCompletionTime: { integerValue: '0' }
          }
        }
      },
      isActive: { booleanValue: true },
      createdAt: { timestampValue: new Date().toISOString() },
      updatedAt: { timestampValue: new Date().toISOString() },
      createdBy: { stringValue: 'import-script' }
    }
  };
}

// Since we need authentication, let's create an alternative approach
console.log('Creating a script that can be run in the browser console...\n');

// Generate browser-executable code
const browserScript = `
// FibreFlow Staff Import Script
// Run this in the browser console at https://fibreflow-73daf.web.app

async function importStaff() {
  const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
  
  const db = getFirestore();
  const staffCollection = collection(db, 'staff');
  
  const staffData = ${JSON.stringify(records.map(record => ({
    employeeId: record['Employee ID'],
    name: record['Name'],
    email: record['Email'].toLowerCase(),
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
    createdBy: 'import-script'
  })), null, 2)};
  
  console.log('Starting import of ' + staffData.length + ' staff members...');
  
  let imported = 0;
  let skipped = 0;
  
  for (const staff of staffData) {
    try {
      // Check if staff already exists
      const q = query(staffCollection, where('email', '==', staff.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log('⚠️ Skipping existing: ' + staff.name);
        skipped++;
        continue;
      }
      
      // Add timestamps
      staff.createdAt = serverTimestamp();
      staff.updatedAt = serverTimestamp();
      
      // Add to Firestore
      await addDoc(staffCollection, staff);
      console.log('✅ Imported: ' + staff.name + ' (' + staff.primaryGroup + ')');
      imported++;
      
    } catch (error) {
      console.error('❌ Error importing ' + staff.name + ':', error);
    }
  }
  
  console.log('\\n✅ Import complete!');
  console.log('Imported: ' + imported);
  console.log('Skipped (existing): ' + skipped);
  console.log('\\nRefresh the staff page to see the new entries.');
}

// Run the import
importStaff();
`;

// Save the browser script
fs.writeFileSync('import-staff-browser.js', browserScript);

console.log('✅ Created import-staff-browser.js\n');
console.log('To import the staff data:\n');
console.log('1. Open https://fibreflow-73daf.web.app in your browser');
console.log('2. Log in as an admin user');
console.log('3. Open the browser console (F12 → Console tab)');
console.log('4. Copy and paste the contents of import-staff-browser.js');
console.log('5. Press Enter to run the import\n');
console.log('The script will:');
console.log('- Check for existing staff members (by email)');
console.log('- Import new staff members only');
console.log('- Show progress in the console');
console.log('- Report the final count\n');

// Also display summary
const groupCounts = records.reduce((acc, record) => {
  const group = record['Primary Group'];
  acc[group] = (acc[group] || 0) + 1;
  return acc;
}, {});

console.log('Staff to be imported by group:');
Object.entries(groupCounts).forEach(([group, count]) => {
  console.log(`  ${group}: ${count}`);
});
console.log(`\nTotal: ${records.length} staff members`);