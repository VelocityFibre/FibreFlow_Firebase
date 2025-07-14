#!/bin/bash

# Firebase CLI Backup Script
# Uses Firebase CLI for authentication instead of service account

echo "🚀 Starting Firebase Backup using Firebase CLI"
echo ""

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="backups/data/firebase-cli-backup-$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Function to export a collection
export_collection() {
    local COLLECTION=$1
    echo "📥 Exporting $COLLECTION..."
    
    # Use firestore:export to export to local file
    firebase firestore:export "$BACKUP_DIR" --only-collections "$COLLECTION" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Successfully exported $COLLECTION"
    else
        # Try alternative method using Firebase CLI query
        echo "  ⚠️  Direct export failed, trying query method..."
        
        # Create JSON file for collection
        firebase firestore:read "$COLLECTION" --limit 10000 > "$BACKUP_DIR/${COLLECTION}.json" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Successfully queried $COLLECTION"
        else
            echo "  ❌ Failed to export $COLLECTION"
        fi
    fi
}

# List of collections to backup
COLLECTIONS=(
    "projects"
    "phases"
    "steps"
    "tasks"
    "clients"
    "suppliers"
    "contractors"
    "contractorProjects"
    "staff"
    "stock"
    "materials"
    "boq"
    "quotes"
    "rfqs"
    "roles"
    "emailLogs"
    "meetings"
    "personalTodos"
    "dailyProgress"
    "auditTrail"
    "poleTracker"
)

echo "📊 Starting collection exports..."
echo ""

# Export each collection
for collection in "${COLLECTIONS[@]}"; do
    export_collection "$collection"
done

echo ""
echo "✅ Backup process completed!"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo "💡 To restore this backup later:"
echo "   firebase firestore:import $BACKUP_DIR"
echo ""
echo "⚠️  Note: Some collections may have failed due to permissions or empty data."