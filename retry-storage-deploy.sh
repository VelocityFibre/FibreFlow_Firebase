#!/bin/bash

echo "🔄 Retrying Firebase Storage rules deployment..."
echo "IAM changes can take up to 10 minutes to propagate."
echo ""

# Set the service account credential
export GOOGLE_APPLICATION_CREDENTIALS="/home/ldp/VF/Apps/FibreFlow/fibreflow-service-account.json"

# Try deployment with retries
for i in {1..5}; do
    echo "Attempt $i/5..."
    if firebase deploy --only storage; then
        echo "✅ Storage rules deployed successfully!"
        exit 0
    else
        echo "❌ Attempt $i failed. Waiting 2 minutes before retry..."
        sleep 120
    fi
done

echo "❌ All attempts failed. Try manual console update instead."
echo "https://console.firebase.google.com/project/fibreflow-73daf/storage/rules"