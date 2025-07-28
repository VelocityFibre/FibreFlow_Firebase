#!/bin/bash

# Setup cross-project access between FibreFlow and vf-onemap-data
# This allows us to use FibreFlow's service account to access vf-onemap-data

echo "🔧 Setting up cross-project access..."
echo "===================================="
echo ""
echo "Since key creation is blocked, we'll use cross-project IAM permissions."
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to vf-onemap-data IAM page:"
echo "   https://console.cloud.google.com/iam-admin/iam?project=vf-onemap-data"
echo ""
echo "2. Click '+ GRANT ACCESS' (or 'Add' button)"
echo ""
echo "3. Add this principal (email):"
echo "   firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com"
echo ""
echo "4. Assign these roles:"
echo "   - Cloud Datastore User"
echo "   - Firebase Admin"
echo "   - Storage Admin"
echo ""
echo "5. Click 'Save'"
echo ""
echo "That's it! This grants FibreFlow's service account access to vf-onemap-data."
echo ""
echo "Alternative: If you can run gcloud commands:"
echo ""
cat << 'GCLOUD'
# Grant access using gcloud
gcloud projects add-iam-policy-binding vf-onemap-data \
  --member="serviceAccount:firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding vf-onemap-data \
  --member="serviceAccount:firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com" \
  --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding vf-onemap-data \
  --member="serviceAccount:firebase-adminsdk-fbsvc@fibreflow-73daf.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
GCLOUD

echo ""
echo "After granting access, we can use the existing FibreFlow service account!"