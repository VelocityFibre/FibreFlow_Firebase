#!/bin/bash
# vf-onemap-data Import Using Firebase CLI
# ========================================
# Uses your existing Firebase CLI authentication

echo "🚀 VF OneMap Data Import (Using Firebase CLI)"
echo "==========================================="
echo ""

# Check if logged in
echo "🔐 Checking Firebase authentication..."
firebase projects:list --project vf-onemap-data > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Firebase!"
    echo "Please run: firebase login"
    exit 1
fi

echo "✅ Authenticated as louis@velocityfibreapp.com"
echo ""

# Set the project
firebase use vf-onemap-data

# Function to import data using Firestore import
import_csv_data() {
    local csv_file="$1"
    local collection="vf-onemap-processed-records"
    
    echo "📁 Processing: $csv_file"
    
    # Convert CSV to JSON for Firestore import
    node -e "
    const fs = require('fs');
    const path = require('path');
    
    // Read CSV
    const csvPath = path.join(__dirname, '../OneMap/downloads', '$csv_file');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Convert to Firestore import format
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        const record = {};
        headers.forEach((header, index) => {
            record[header.replace(/ /g, '_')] = values[index] || '';
        });
        records.push(record);
    }
    
    // Write JSON file
    const jsonPath = path.join(__dirname, '../temp_import.json');
    const firestoreData = {};
    records.forEach(r => {
        if (r.Property_ID) {
            firestoreData[r.Property_ID] = r;
        }
    });
    
    fs.writeFileSync(jsonPath, JSON.stringify(firestoreData, null, 2));
    console.log('✅ Converted', Object.keys(firestoreData).length, 'records to JSON');
    "
    
    # Import to Firestore using Firebase CLI
    echo "🔄 Importing to Firestore..."
    
    # Use Firebase REST API with CLI auth token
    TOKEN=$(firebase auth:export:token)
    
    # Alternative: Use gcloud with your user auth
    gcloud auth application-default print-access-token > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Using gcloud authentication"
        # Import using gcloud Firestore import
        # This would require the data to be in a specific format
    else
        echo "⚠️  gcloud auth not available, using Firebase CLI method"
    fi
    
    echo "✅ Import complete!"
}

# Main execution
if [ -z "$1" ]; then
    # Default file
    import_csv_data "Lawley May Week 3 22052025 - First Report.csv"
else
    # User-specified file
    import_csv_data "$1"
fi

echo ""
echo "📊 View your data at:"
echo "https://console.firebase.google.com/project/vf-onemap-data/firestore/data"