const xlsx = require('xlsx');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase configuration - using the project's config
const firebaseConfig = {
  apiKey: "AIzaSyDDjemsz7-k7kLI7U6SWdNRvMHqI-nLmL0",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "502003730693",
  appId: "1:502003730693:web:17e09e93ad088c951f30f9",
  measurementId: "G-7MPJYG7WJN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Function to map job title to primary group
function mapJobTitleToGroup(jobTitle) {
  if (!jobTitle) return 'Technician';
  
  const title = jobTitle.toLowerCase();
  
  if (title.includes('admin')) return 'Admin';
  if (title.includes('project manager') || title.includes('pm') || title.includes('head of')) return 'ProjectManager';
  if (title.includes('technician') || title.includes('officer') || title.includes('planner')) return 'Technician';
  if (title.includes('director') || title.includes('chief') || title.includes('gm')) return 'Admin';
  if (title.includes('bookkeeper')) return 'Admin';
  if (title.includes('manager')) return 'ProjectManager';
  
  return 'Technician'; // Default
}

// Function to generate employee ID
function generateEmployeeId(index) {
  return `VF${String(index).padStart(3, '0')}`;
}

async function importStaffFromExcel() {
  try {
    console.log('Starting staff import from Excel...\n');
    
    // First, authenticate - you'll need to provide credentials
    console.log('Please authenticate to continue with import.');
    console.log('You need to be logged in as an admin user.\n');
    
    // For now, we'll prepare the data without actually importing
    // The actual import should be done through the UI or with proper auth
    
    // Read the Excel file
    const filePath = path.join(__dirname, 'VF_Staff.xlsx');
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Convert to JSON with header row
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Skip header rows and process staff data
    const staffToImport = [];
    let employeeCounter = 1;
    let skippedCount = 0;
    
    for (let i = 2; i < data.length; i++) { // Start from row 2 (skip headers)
      const row = data[i];
      
      if (!row[0] || !row[2]) { // Skip if no name or email
        console.log(`Skipping row ${i + 1}: Missing name or email`);
        skippedCount++;
        continue;
      }
      
      // Skip placeholder entries
      if (row[0] === 'Name' || row[0] === 'IC\'s' || row[0] === 'Management' || row[0] === 'VEA Group') {
        console.log(`Skipping row ${i + 1}: Placeholder entry (${row[0]})`);
        skippedCount++;
        continue;
      }
      
      const name = row[0];
      const jobTitle = row[1] || 'Staff Member';
      const email = row[2];
      
      // Create staff member object matching the StaffMember interface
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'import-script',
        // Store job title in skills array for now
        skills: [jobTitle]
      };
      
      staffToImport.push({
        data: staffMember,
        display: {
          name: name,
          jobTitle: jobTitle,
          email: email,
          group: staffMember.primaryGroup
        }
      });
    }
    
    console.log(`\nData Analysis Complete!\n`);
    console.log(`Total rows in Excel: ${data.length - 2}`);
    console.log(`Valid staff members: ${staffToImport.length}`);
    console.log(`Skipped entries: ${skippedCount}\n`);
    
    // Summary by group
    const groupCounts = staffToImport.reduce((acc, item) => {
      acc[item.data.primaryGroup] = (acc[item.data.primaryGroup] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Staff Distribution by Group:');
    Object.entries(groupCounts).forEach(([group, count]) => {
      console.log(`  ${group}: ${count} staff members`);
    });
    
    // Create CSV for manual import through UI
    console.log('\nCreating CSV file for import through UI...');
    
    // Create CSV content
    const csvHeaders = ['Employee ID', 'Name', 'Email', 'Phone', 'Primary Group'];
    const csvRows = [csvHeaders];
    
    staffToImport.forEach(item => {
      csvRows.push([
        item.data.employeeId,
        item.data.name,
        item.data.email,
        item.data.phone,
        item.data.primaryGroup
      ]);
    });
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Save CSV file
    const fs = require('fs');
    fs.writeFileSync('staff-import-ready.csv', csvContent);
    
    console.log('\n✅ Created staff-import-ready.csv');
    console.log('\nTo import the data:');
    console.log('1. Go to https://fibreflow-73daf.web.app/staff');
    console.log('2. Click on "Import Staff" button');
    console.log('3. Upload the staff-import-ready.csv file');
    console.log('4. Review and confirm the import\n');
    
    // Also display the data that will be imported
    console.log('Staff Members to Import:');
    console.log('========================');
    staffToImport.forEach((item, index) => {
      console.log(`${index + 1}. ${item.display.name}`);
      console.log(`   Job Title: ${item.display.jobTitle}`);
      console.log(`   Email: ${item.display.email}`);
      console.log(`   Group: ${item.display.group}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the import preparation
importStaffFromExcel();