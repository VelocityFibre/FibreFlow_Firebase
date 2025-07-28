#!/bin/bash

# Simple Firebase Console Script Generator for CSV Import
# This creates a script you can paste directly into Firebase Console

set -e

echo "🚀 VF OneMap Firebase Console Import Script Generator"
echo "=================================================="

# Check if CSV file argument provided
if [ -z "$1" ]; then
    echo "Usage: $0 <csv-filename>"
    echo "Example: $0 \"Lawley May Week 3 22052025 - First Report.csv\""
    exit 1
fi

CSV_FILE="$1"
CSV_PATH="downloads/$CSV_FILE"

# Check if file exists
if [ ! -f "$CSV_PATH" ]; then
    echo "❌ CSV file not found: $CSV_PATH"
    exit 1
fi

echo "✅ Found CSV file: $CSV_FILE"
echo ""
echo "📋 Instructions:"
echo "1. Go to: https://console.firebase.google.com/project/vf-onemap-data/firestore"
echo "2. Open Browser Developer Console (F12)"
echo "3. Go to Console tab"
echo "4. Paste the following script:"
echo ""
echo "========== COPY BELOW THIS LINE =========="

cat << 'SCRIPT'
// Firebase Console Import Script for VF OneMap
(async function() {
    console.log('🚀 Starting VF OneMap CSV Import...');
    
    // Get Firestore reference
    const db = firebase.firestore();
    
    // Sample data (replace with your CSV data)
    // For now, let's test with a few records
    const testRecords = [
        {
            "Property ID": "TEST001",
            "OneMap NAD ID": "NAD001",
            "Pole Number": "LAW.P.A123",
            "Drop Number": "DR001",
            "Stand Number": "ST001",
            "Status": "Pole Permission: Approved",
            "Flow Name Groups": "Pole Permission: Approved",
            "Site": "Lawley",
            "Sections": "Section A",
            "PONS": "PON001",
            "Location Address": "123 Test Street, Lawley",
            "Latitude": "-26.123456",
            "Longitude": "27.123456",
            "Field Agent Name": "Test Agent",
            "Last Modified Date": new Date().toISOString()
        }
    ];
    
    const importBatchId = `IMP_${Date.now()}`;
    console.log(`Batch ID: ${importBatchId}`);
    
    // Import records
    let count = 0;
    for (const record of testRecords) {
        try {
            await db.collection('vf-onemap-processed-records')
                .doc(record["Property ID"])
                .set({
                    ...record,
                    importBatchId: importBatchId,
                    importedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    source: 'console-import'
                }, { merge: true });
            count++;
            console.log(`✅ Imported: ${record["Property ID"]}`);
        } catch (error) {
            console.error(`❌ Failed to import ${record["Property ID"]}:`, error);
        }
    }
    
    // Save import summary
    await db.collection('vf-onemap-import-batches').doc(importBatchId).set({
        batchId: importBatchId,
        totalRecords: testRecords.length,
        importedRecords: count,
        importedAt: firebase.firestore.FieldValue.serverTimestamp(),
        importedBy: 'console-script'
    });
    
    console.log(`✨ Import completed! ${count} records imported.`);
    console.log('📊 Check the data in your Firestore collections');
})();
SCRIPT

echo "========== COPY ABOVE THIS LINE =========="
echo ""
echo "📝 Next Steps:"
echo "1. Copy the script above"
echo "2. Paste in Firebase Console"
echo "3. Press Enter to run"
echo "4. Check the vf-onemap-processed-records collection"
echo ""
echo "🔍 To import your actual CSV data:"
echo "   - Convert your CSV to JSON format"
echo "   - Replace the testRecords array with your data"
echo "   - Run the script again"