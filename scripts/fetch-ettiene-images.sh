#!/bin/bash

# Firebase REST API to fetch uploaded images
PROJECT_ID="fibreflow-73daf"
COLLECTION="uploaded-images"

# Get auth token
TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "⚠️  No auth token available. Trying alternative method..."
    
    # Alternative: Use Firebase CLI to export data
    echo "📥 Exporting Firestore data..."
    firebase firestore:export ettiene-export --collection uploaded-images
    
    echo "✅ Check ettiene-export folder for data"
else
    # Use REST API
    curl -X GET \
      "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Accept: application/json" \
      > ettiene-images.json
    
    echo "✅ Data saved to ettiene-images.json"
fi