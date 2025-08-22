#!/bin/bash

# Deploy FibreFlow React Version
echo "🚀 Deploying FibreFlow React..."

# Set service account
export GOOGLE_APPLICATION_CREDENTIALS="./fibreflow-service-account.json"

# Check if service account exists
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "❌ Service account file not found!"
    exit 1
fi

# Build the application
echo "📦 Building application..."
if ! npm run build; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
if firebase deploy --only hosting --project fibreflow-73daf; then
    echo "✅ Deployment successful!"
    echo "🌐 Visit: https://fibreflow-73daf.web.app"
else
    echo "❌ Deployment failed!"
    exit 1
fi