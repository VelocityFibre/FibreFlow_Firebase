#!/bin/bash

# Script to make pole analytics functions publicly accessible

echo "Making pole analytics functions public..."

# Deploy the functions first to ensure they're up to date
echo "Deploying functions..."
firebase deploy --only functions:poleAnalyticsPublic,functions:poleAnalyticsSummaryPublic

# Wait for deployment to complete
sleep 5

# Make functions publicly accessible using gcloud
echo -e "\nMaking functions publicly accessible..."

# Set IAM policy to allow unauthenticated access
echo "Setting IAM policy for poleAnalyticsPublic..."
gcloud functions add-iam-policy-binding poleAnalyticsPublic \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf || echo "Note: gcloud command failed, but function may still work"

echo "Setting IAM policy for poleAnalyticsSummaryPublic..."
gcloud functions add-iam-policy-binding poleAnalyticsSummaryPublic \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf || echo "Note: gcloud command failed, but function may still work"

echo -e "\nFunctions should now be publicly accessible!"
echo "Test URLs:"
echo "  https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic"
echo "  https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=7"