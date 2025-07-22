#!/bin/bash

# Create service account for colleague access
# This bypasses domain restrictions

PROJECT_ID="vf-onemap-data"
SA_NAME="colleague-onemap-access"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Creating service account for colleague..."

# Create service account
gcloud iam service-accounts create ${SA_NAME} \
    --display-name="Colleague OneMap Access" \
    --project=${PROJECT_ID}

# Grant necessary permissions
echo "Granting permissions..."

# Storage access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin"

# Firestore access  
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/datastore.user"

# Firebase access
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/firebase.viewer"

# Create and download key
echo "Creating service account key..."
gcloud iam service-accounts keys create \
    colleague-service-account-key.json \
    --iam-account=${SA_EMAIL} \
    --project=${PROJECT_ID}

echo "✅ Done! Share 'colleague-service-account-key.json' with your colleague"
echo "⚠️  Keep this file secure - it provides full access to the project"