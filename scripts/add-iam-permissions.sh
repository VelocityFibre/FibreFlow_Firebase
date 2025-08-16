#!/bin/bash
# This script needs to be run by someone with project owner permissions

PROJECT_ID="fibreflow-73daf"
SERVICE_ACCOUNT="firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com"
DEFAULT_SERVICE_ACCOUNT="fibreflow-73daf@appspot.gserviceaccount.com"

echo "Adding permissions for Firebase Functions deployment..."
echo ""

# Add Service Account User role on the default App Engine service account
echo "1. Adding Service Account User role..."
gcloud iam service-accounts add-iam-policy-binding \
  $DEFAULT_SERVICE_ACCOUNT \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/iam.serviceAccountUser" \
  --project=$PROJECT_ID

# Add Cloud Functions Admin role
echo ""
echo "2. Adding Cloud Functions Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/cloudfunctions.admin"

# Add Storage Admin role (for uploading function code)
echo ""
echo "3. Adding Storage Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.admin"

echo ""
echo "✅ Permissions added successfully!"
echo ""
echo "You can now deploy Firebase Functions using:"
echo "export GOOGLE_APPLICATION_CREDENTIALS='/home/ldp/VF/Apps/FibreFlow/fibreflow-service-account.json'"
echo "firebase deploy --only functions"
