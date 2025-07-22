#!/bin/bash

# OneMap Staging Cleanup using Firebase CLI
# This is SAFE - only deletes staging collections, not production data

echo "🧹 OneMap Staging Cleanup (Firebase CLI)"
echo "========================================"
echo "This will DELETE all documents from:"
echo "  - onemap-processing-staging"
echo "  - onemap-processing-imports"
echo ""
echo "⚠️  This is SAFE - it will NOT affect your live data!"
echo ""
echo "Starting in 5 seconds... (Press Ctrl+C to cancel)"
echo ""

sleep 5

echo "🗑️  Deleting onemap-processing-staging..."
firebase firestore:delete onemap-processing-staging --recursive --project fibreflow-73daf --force --token "$FIREBASE_TOKEN"

echo ""
echo "🗑️  Deleting onemap-processing-imports..."
firebase firestore:delete onemap-processing-imports --recursive --project fibreflow-73daf --force --token "$FIREBASE_TOKEN"

echo ""
echo "✅ Staging cleanup complete!"
echo "Your production data (planned-poles, pole-trackers, etc.) remains untouched."