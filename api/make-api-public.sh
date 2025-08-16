#!/bin/bash

# Script to make the offline field app API publicly accessible

echo "Making offlineFieldAppAPI publicly accessible..."

# Option 1: Using gcloud (if you have it configured)
echo "Attempting with gcloud..."
gcloud functions add-iam-policy-binding offlineFieldAppAPI \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf

if [ $? -eq 0 ]; then
    echo "✅ Success! The API is now publicly accessible."
    echo ""
    echo "Test it with:"
    echo "curl -H \"X-API-Key: field-app-dev-key-2025\" -H \"X-Device-ID: test-device-001\" https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/health"
else
    echo ""
    echo "❌ Failed to set permissions with gcloud."
    echo ""
    echo "Alternative: Use Google Cloud Console"
    echo "1. Go to: https://console.cloud.google.com/functions/details/us-central1/offlineFieldAppAPI?project=fibreflow-73daf"
    echo "2. Click 'PERMISSIONS' tab"
    echo "3. Click 'ADD' button"
    echo "4. In 'New principals' field, type: allUsers"
    echo "5. In 'Role' dropdown, select: Cloud Functions > Cloud Functions Invoker"
    echo "6. Click 'SAVE'"
fi