#!/bin/bash

# Fix Firebase Extensions permission for service account

PROJECT_ID="fibreflow-73daf"
SERVICE_ACCOUNT="firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com"

echo "🔧 Adding Firebase Extensions permissions..."
echo ""

# Add Firebase Extensions Viewer role
echo "Adding Firebase Extensions Viewer role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/firebaseextensions.viewer"

# Add Firebase Extensions Admin role (if needed for deployment)
echo ""
echo "Adding Firebase Extensions Admin role..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/firebaseextensions.admin"

echo ""
echo "✅ Extensions permissions added!"
echo ""
echo "The service account now has:"
echo "- Firebase Extensions Viewer"
echo "- Firebase Extensions Admin"
echo ""
echo "Run 'firebase deploy --only functions:neonReadAPI' to continue deployment"