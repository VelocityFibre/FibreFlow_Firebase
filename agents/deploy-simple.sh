#!/bin/bash
set -e

echo "🚀 Simple Deployment to Google Cloud Run"
echo "========================================"

PROJECT_ID="fibreflow-73daf"
SERVICE_NAME="neon-agent"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "📦 Building Docker image locally..."
docker build -t $SERVICE_NAME .

echo "🏷️  Tagging image for Google Container Registry..."
docker tag $SERVICE_NAME $IMAGE_NAME

echo "⬆️  Pushing image to registry..."
docker push $IMAGE_NAME

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "NEON_CONNECTION_STRING=postgresql://neondb_owner:npg_AlX83ojfZpBk@ep-long-breeze-a9w7xool.gwc.azure.neon.tech:5432/neondb?sslmode=require,GOOGLE_AI_STUDIO_API_KEY=AIzaSyDBktsZ8DsqchXKLHFN07iRvJuHrr7jr_8" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --timeout 300

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform=managed --region=$REGION --format="value(status.url)" 2>/dev/null)

echo ""
echo "🎉 Deployment complete!"
echo "📱 Service URL: $SERVICE_URL"
echo ""
echo "💡 Test endpoints:"
echo "   curl $SERVICE_URL/health"
echo "   curl $SERVICE_URL/database/info"
echo ""
echo "🔗 Update the Angular service baseUrl to: $SERVICE_URL"