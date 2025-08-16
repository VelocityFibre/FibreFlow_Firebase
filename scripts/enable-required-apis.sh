#!/bin/bash

# Enable all required APIs for Firebase Functions deployment

PROJECT_ID="fibreflow-73daf"

echo "🔧 Enabling required Google Cloud APIs for Firebase Functions..."
echo ""

# List of required APIs
APIS=(
  "cloudfunctions.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "cloudscheduler.googleapis.com"
  "cloudbilling.googleapis.com"
  "firebaseextensions.googleapis.com"
  "storage.googleapis.com"
  "logging.googleapis.com"
  "pubsub.googleapis.com"
)

echo "Enabling APIs..."
for API in "${APIS[@]}"
do
  echo "  - Enabling $API..."
  gcloud services enable $API --project=$PROJECT_ID
done

echo ""
echo "✅ All APIs enabled!"
echo ""
echo "You can now deploy with:"
echo "firebase deploy --only functions:neonReadAPI"