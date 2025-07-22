const admin = require('firebase-admin');
const xlsx = require('xlsx');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to map job title to primary group
function mapJobTitleToGroup(jobTitle) {
  if (!jobTitle) return 'Technician';
  
  const title = jobTitle.toLowerCase();
  
  if (title.includes('admin')) return 'Admin';
  if (title.includes('project manager') || title.includes('pm') || title.includes('head of')) return 'ProjectManager';
  if (title.includes('technician') || title.includes('officer') || title.includes('planner')) return 'Technician';
  if (title.includes('director') || title.includes('chief') || title.includes('gm')) return 'Admin';
  
  return 'Technician'; // Default
}

// Function to generate employee ID
function generateEmployeeId(index) {
  return `VF${String(index).padStart(3, '0')}`;
}

async function importStaffFromExcel() {
  try {
    console.log('Starting staff import from Excel...\n');
    
    // Read the Excel file
    const filePath = path.join(__dirname, 'VF_Staff.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip header rows and process staff data
    const staffToImport = [];
    let employeeCounter = 1;
    
    for (let i = 2; i < data.length; i++) { // Start from row 2 (skip headers)
      const row = data[i];
      
      if (!row[0] || !row[2]) { // Skip if no name or email
        console.log(`Skipping row ${i + 1}: Missing name or email`);
        continue;
      }
      
      // Skip placeholder entries
      if (row[0] === 'Name' || row[0] === 'IC\'s' || row[0] === 'Management') {
        console.log(`Skipping row ${i + 1}: Placeholder entry`);
        continue;
      }
      
      const name = row[0];
      const jobTitle = row[1] || 'Staff Member';
      const email = row[2];
      
      // Create staff member object
      const staffMember = {
        employeeId: generateEmployeeId(employeeCounter++),
        name: name,
        email: email.toLowerCase(),
        phone: '+27 00 000 0000', // Placeholder phone
        primaryGroup: mapJobTitleToGroup(jobTitle),
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
        createdBy: 'import-script',
        // Store job title as metadata
        metadata: {
          jobTitle: jobTitle,
          importedFrom: 'VF_Staff.xlsx',
          importDate: new Date().toISOString()
        }
      };
      
      staffToImport.push(staffMember);
    }
    
    console.log(`\nPrepared ${staffToImport.length} staff members for import\n`);
    
    // Import to Firestore
    const batch = db.batch();
    let successCount = 0;
    
    for (const staff of staffToImport) {
      try {
        // Check if staff member already exists
        const existingQuery = await db.collection('staff')
          .where('email', '==', staff.email)
          .limit(1)
          .get();
        
        if (!existingQuery.empty) {
          console.log(`⚠️  Staff member already exists: ${staff.name} (${staff.email})`);
          continue;
        }
        
        // Add to batch
        const docRef = db.collection('staff').doc();
        batch.set(docRef, staff);
        successCount++;
        
        console.log(`✅ Prepared: ${staff.name} (${staff.email}) - ${staff.primaryGroup}`);
      } catch (error) {
        console.error(`❌ Error preparing ${staff.name}: ${error.message}`);
      }
    }
    
    // Commit the batch
    if (successCount > 0) {
      await batch.commit();
      console.log(`\n✅ Successfully imported ${successCount} staff members to Firebase!`);
    } else {
      console.log('\n⚠️  No new staff members to import.');
    }
    
    // Summary by group
    const groupCounts = staffToImport.reduce((acc, staff) => {
      acc[staff.primaryGroup] = (acc[staff.primaryGroup] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nImport Summary by Group:');
    Object.entries(groupCounts).forEach(([group, count]) => {
      console.log(`  ${group}: ${count}`);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    // Terminate the app
    await admin.app().delete();
  }
}

// Run the import
importStaffFromExcel();