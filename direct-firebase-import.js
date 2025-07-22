const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const csv = require('csv-parse/sync');
const readline = require('readline');

// Firebase configuration
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function importStaff() {
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('staff-import-ready.csv', 'utf-8');
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`\n📋 Found ${records.length} staff members to import\n`);

    // Get auth credentials
    console.log('Please provide admin credentials to authenticate:');
    const email = await question('Email: ');
    const password = await question('Password: ');
    
    console.log('\n🔐 Authenticating...');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`✅ Authenticated as ${userCredential.user.email}\n`);
    } catch (authError) {
      console.error('❌ Authentication failed:', authError.message);
      rl.close();
      return;
    }

    // Now import the staff
    const staffCollection = collection(db, 'staff');
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('🚀 Starting import...\n');

    for (const record of records) {
      try {
        // Check if staff already exists
        const q = query(staffCollection, where('email', '==', record['Email'].toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log(`⚠️  Skipping existing: ${record['Name']} (${record['Email']})`);
          skipped++;
          continue;
        }

        // Create staff member object
        const staffMember = {
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: auth.currentUser.uid
        };

        // Add to Firestore
        const docRef = await addDoc(staffCollection, staffMember);
        console.log(`✅ Imported: ${record['Name']} (${record['Primary Group']}) - ID: ${docRef.id}`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Error importing ${record['Name']}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⚠️  Skipped (existing): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total processed: ${records.length}`);
    
    console.log('\n✨ Import complete!');
    console.log('\n🌐 View the imported staff at: https://fibreflow-73daf.web.app/staff');
    console.log('   (You may need to refresh the page)\n');

  } catch (error) {
    console.error('❌ Import failed:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the import
console.log('🚀 FibreFlow Staff Import Tool');
console.log('==============================\n');
importStaff();