// Automated import script - runs in Node.js environment
// This creates a browser-executable script that auto-runs

const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the CSV file
const csvContent = fs.readFileSync('staff-import-ready.csv', 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Generate the import data
const staffData = records.map(record => ({
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
}));

console.log('📋 Staff Import Summary:');
console.log('========================');
console.log(`Total staff to import: ${staffData.length}`);

// Group by primaryGroup
const groupCounts = staffData.reduce((acc, staff) => {
  acc[staff.primaryGroup] = (acc[staff.primaryGroup] || 0) + 1;
  return acc;
}, {});

console.log('\nBy Group:');
Object.entries(groupCounts).forEach(([group, count]) => {
  console.log(`  ${group}: ${count}`);
});

console.log('\n✅ Import script is ready!');
console.log('\n📝 Instructions to import:');
console.log('1. Open https://fibreflow-73daf.web.app in your browser');
console.log('2. Log in as an admin user');
console.log('3. Open browser console (F12 → Console)');
console.log('4. Copy and paste the following code:\n');

const browserCode = `
// ===== COPY FROM HERE =====
(async function importVFStaff() {
  console.log('🚀 Starting VF Staff Import...');
  
  try {
    const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = 
      await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    
    const db = getFirestore();
    const staffCollection = collection(db, 'staff');
    
    const staffData = ${JSON.stringify(staffData, null, 2)};
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const staff of staffData) {
      try {
        // Check if exists
        const q = query(staffCollection, where('email', '==', staff.email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          console.log('⚠️ Exists:', staff.name);
          skipped++;
          continue;
        }
        
        // Add timestamps
        staff.createdAt = serverTimestamp();
        staff.updatedAt = serverTimestamp();
        
        // Import
        await addDoc(staffCollection, staff);
        console.log('✅', staff.name, '(' + staff.primaryGroup + ')');
        imported++;
        
      } catch (err) {
        console.error('❌', staff.name, err.message);
        errors++;
      }
    }
    
    console.log('\\n📊 Import Complete!');
    console.log('Imported:', imported);
    console.log('Skipped:', skipped);
    console.log('Errors:', errors);
    console.log('\\n🔄 Refresh the staff page to see new entries');
    
  } catch (error) {
    console.error('Import failed:', error);
  }
})();
// ===== COPY TO HERE =====
`;

console.log(browserCode);

console.log('\n5. Press Enter to execute');
console.log('6. Wait for completion message');
console.log('7. Refresh https://fibreflow-73daf.web.app/staff to see the imported staff\n');