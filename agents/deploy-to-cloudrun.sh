#!/bin/bash
set -e

echo "🚀 Deploying Neon+Gemini Agent to Google Cloud Run"
echo "================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found. Please install it first."
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud:"
    gcloud auth login
fi

# Set project (use FibreFlow's project)
PROJECT_ID="fibreflow-73daf"
gcloud config set project $PROJECT_ID

echo "📦 Building and deploying to Cloud Run..."

# Deploy using Cloud Build (recommended)
gcloud builds submit --config cloudbuild.yaml .

# Get the service URL
SERVICE_URL=$(gcloud run services describe neon-agent --platform=managed --region=us-central1 --format="value(status.url)")

echo ""
echo "🎉 Deployment complete!"
echo "📱 Service URL: $SERVICE_URL"
echo "🔗 Update Angular service to use: $SERVICE_URL"
echo ""
echo "💡 Test endpoints:"
echo "   Health: $SERVICE_URL/health"
echo "   Database: $SERVICE_URL/database/info"
echo "   Query: $SERVICE_URL/query (POST)"
echo ""
echo "🔧 To update environment variables:"
echo "   gcloud run services update neon-agent --region=us-central1 --set-env-vars=NEON_CONNECTION_STRING=..."