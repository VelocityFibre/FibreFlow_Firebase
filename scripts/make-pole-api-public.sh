#!/bin/bash

echo "Making pole analytics API publicly accessible..."
echo "=============================================="

# Try to make the function public
echo "Attempting to set public access with gcloud..."
gcloud functions add-iam-policy-binding poleAnalyticsExpress \
  --member="allUsers" \
  --role="roles/cloudfunctions.invoker" \
  --region=us-central1 \
  --project=fibreflow-73daf 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Success! The API is now publicly accessible."
    echo ""
    echo "Test endpoints:"
    echo "1. Health check:"
    echo "   curl -H \"X-API-Token: fibreflow-pole-analytics-2025\" https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/health"
    echo ""
    echo "2. Summary:"
    echo "   curl -H \"X-API-Token: fibreflow-pole-analytics-2025\" https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/summary"
    echo ""
    echo "3. Full analytics:"
    echo "   curl -H \"X-API-Token: fibreflow-pole-analytics-2025\" https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsExpress/analytics"
else
    echo ""
    echo "❌ gcloud command failed (this is expected if gcloud is not configured)."
    echo ""
    echo "MANUAL STEPS REQUIRED:"
    echo "====================="
    echo ""
    echo "Option 1: Ask someone with project access to run this command:"
    echo "----------"
    echo "gcloud functions add-iam-policy-binding poleAnalyticsExpress \\"
    echo "  --member=\"allUsers\" \\"
    echo "  --role=\"roles/cloudfunctions.invoker\" \\"
    echo "  --region=us-central1 \\"
    echo "  --project=fibreflow-73daf"
    echo ""
    echo "Option 2: Use Google Cloud Console (Web UI):"
    echo "----------"
    echo "1. Go to: https://console.cloud.google.com/functions/details/us-central1/poleAnalyticsExpress?project=fibreflow-73daf"
    echo "2. Click 'PERMISSIONS' tab"
    echo "3. Click 'ADD' button"
    echo "4. In 'New principals' field, type: allUsers"
    echo "5. In 'Role' dropdown, select: Cloud Functions > Cloud Functions Invoker"
    echo "6. Click 'SAVE'"
    echo ""
    echo "After completing either option, the API will be accessible!"
fi