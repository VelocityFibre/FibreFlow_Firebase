#!/bin/bash

# VF OneMap CSV Import using Firebase CLI
# This script uses Firebase CLI authentication (no service accounts needed)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 VF OneMap CSV Import Script${NC}"
echo -e "${GREEN}Using Firebase CLI Authentication${NC}\n"

# Check if Firebase CLI is logged in
CURRENT_USER=$(firebase login:list | grep -o "louis@velocityfibreapp.com" || echo "")
if [ -z "$CURRENT_USER" ]; then
    echo -e "${RED}❌ Not logged in to Firebase${NC}"
    echo "Please run: firebase login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in as: $CURRENT_USER${NC}"

# Set the project
echo -e "\n${YELLOW}Setting Firebase project to vf-onemap-data...${NC}"
firebase use vf-onemap-data || {
    echo -e "${RED}❌ Failed to set project. Make sure you have access to vf-onemap-data${NC}"
    exit 1
}

# Check if CSV file argument provided
if [ -z "$1" ]; then
    echo -e "${RED}Usage: $0 <csv-filename>${NC}"
    echo "Example: $0 \"Lawley May Week 3 22052025 - First Report.csv\""
    exit 1
fi

CSV_FILE="$1"
CSV_PATH="downloads/$CSV_FILE"

# Check if file exists
if [ ! -f "$CSV_PATH" ]; then
    echo -e "${RED}❌ CSV file not found: $CSV_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found CSV file: $CSV_FILE${NC}"

# Create a Node.js script that uses Firebase SDK with CLI auth
cat > temp-import.js << 'EOF'
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, serverTimestamp } = require('firebase/firestore');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
const fs = require('fs');
const csv = require('csv-parse/sync');

// Firebase config for vf-onemap-data
const firebaseConfig = {
    apiKey: "AIzaSyBZHL-ibP5a3FKy3oYvmNdHRlxGMewbcV0",
    authDomain: "vf-onemap-data.firebaseapp.com",
    projectId: "vf-onemap-data",
    storageBucket: "vf-onemap-data.firebasestorage.app",
    messagingSenderId: "40059977157",
    appId: "1:40059977157:web:3c3a5bb6db1a0a9f8f6d64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function importCSV(fileName) {
    try {
        console.log('📄 Reading CSV file...');
        const fileContent = fs.readFileSync(`downloads/${fileName}`, 'utf-8');
        
        console.log('🔄 Parsing CSV...');
        const records = csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        
        console.log(`✅ Found ${records.length} records`);
        
        const importBatchId = `IMP_${new Date().getTime()}`;
        console.log(`\n📤 Starting import with batch ID: ${importBatchId}`);
        
        let processed = 0;
        let newCount = 0;
        
        // Process in batches of 500
        for (let i = 0; i < records.length; i += 500) {
            const batch = writeBatch(db);
            const chunk = records.slice(i, i + 500);
            
            for (const record of chunk) {
                const propertyId = record['Property ID'];
                if (!propertyId) continue;
                
                const docRef = doc(db, 'vf-onemap-processed-records', propertyId);
                batch.set(docRef, {
                    ...record,
                    importBatchId: importBatchId,
                    fileName: fileName,
                    importedAt: new Date().toISOString(),
                    source: 'firebase-cli-import'
                }, { merge: true });
                
                processed++;
                newCount++;
            }
            
            await batch.commit();
            console.log(`✅ Processed ${processed}/${records.length} records...`);
        }
        
        // Save import summary
        const summaryRef = doc(db, 'vf-onemap-import-batches', importBatchId);
        await setDoc(summaryRef, {
            batchId: importBatchId,
            fileName: fileName,
            totalRecords: records.length,
            processedRecords: processed,
            importedAt: new Date().toISOString(),
            status: 'completed'
        });
        
        console.log('\n✨ Import completed successfully!');
        console.log(`📊 Total records imported: ${processed}`);
        console.log(`📁 Batch ID: ${importBatchId}`);
        
    } catch (error) {
        console.error('❌ Import failed:', error.message);
        process.exit(1);
    }
}

// Get filename from command line
const fileName = process.argv[2];
importCSV(fileName);
EOF

# Install required packages if not present
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules/firebase" ]; then
    echo "Installing Firebase SDK..."
    npm install firebase csv-parse
fi

# Run the import
echo -e "\n${GREEN}Starting import...${NC}"
node temp-import.js "$CSV_FILE"

# Clean up
rm -f temp-import.js

echo -e "\n${GREEN}✅ Import process completed!${NC}"
echo -e "${YELLOW}Check the Firebase Console to verify the data:${NC}"
echo "https://console.firebase.google.com/project/vf-onemap-data/firestore"