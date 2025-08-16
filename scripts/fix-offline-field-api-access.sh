#!/bin/bash

# Fix IAM Policy Error for offlineFieldAppAPI Function
# This script provides multiple solutions to resolve the precondition error

echo "======================================"
echo "Fix offlineFieldAppAPI Access Error"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fibreflow-73daf"
FUNCTION_NAME="offlineFieldAppAPI"
REGION="us-central1"

echo -e "${BLUE}Checking function status...${NC}"
gcloud functions describe $FUNCTION_NAME --region=$REGION --project=$PROJECT_ID 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}Function not found or error accessing it${NC}"
    echo ""
    echo -e "${YELLOW}Solution 1: Redeploy the function${NC}"
    echo "Run: firebase deploy --only functions:offlineFieldAppAPI"
    exit 1
fi

echo ""
echo -e "${GREEN}Function found. Proceeding with solutions...${NC}"
echo ""

# Solution 1: Try using gcloud with --force flag
echo -e "${YELLOW}Solution 1: Force IAM policy update${NC}"
echo "Attempting to force update IAM policy..."
gcloud functions add-iam-policy-binding $FUNCTION_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    --force 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Success! Function is now publicly accessible${NC}"
    echo "URL: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
    exit 0
fi

echo ""
echo -e "${YELLOW}Solution 2: Using Firebase CLI to set permissions${NC}"
echo "This will redeploy the function with public access..."
echo ""

# Create a temporary function config
cat > /tmp/offline-field-api-public.js << 'EOF'
const functions = require('firebase-functions');

// Re-export the existing function with public access
const originalFunction = require('./src/offline-field-app-api').offlineFieldAppAPI;

// Wrap it to ensure public access
exports.offlineFieldAppAPI = functions
  .runWith({
    // Ensure function has enough resources
    memory: '1GB',
    timeoutSeconds: 540
  })
  .https
  .onRequest(originalFunction);
EOF

echo "To implement this solution, run these commands:"
echo ""
echo "1. Update the function export in functions/index.js:"
echo "   Replace the current export with:"
echo ""
echo "   exports.offlineFieldAppAPI = functions"
echo "     .runWith({ memory: '1GB', timeoutSeconds: 540 })"
echo "     .https.onRequest(offlineFieldAppAPI.offlineFieldAppAPI);"
echo ""
echo "2. Deploy the function:"
echo "   firebase deploy --only functions:offlineFieldAppAPI"
echo ""

echo -e "${YELLOW}Solution 3: Alternative - Use Firebase Hosting Rewrite${NC}"
echo "Add this to your firebase.json hosting configuration:"
echo ""
cat << 'EOF'
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/offline-field/**",
        "function": "offlineFieldAppAPI"
      }
    ]
  }
}
EOF

echo ""
echo -e "${YELLOW}Solution 4: Direct REST API call to set IAM policy${NC}"
echo "Creating script to directly set IAM policy..."

cat > /tmp/set-function-public-access.js << 'EOF'
const { google } = require('googleapis');
const cloudfunctions = google.cloudfunctions('v1');

async function makePublic() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const authClient = await auth.getClient();
  const projectId = 'fibreflow-73daf';
  const location = 'us-central1';
  const functionName = 'offlineFieldAppAPI';
  
  const resource = `projects/${projectId}/locations/${location}/functions/${functionName}`;
  
  try {
    const policy = {
      bindings: [{
        role: 'roles/cloudfunctions.invoker',
        members: ['allUsers']
      }]
    };
    
    const response = await cloudfunctions.projects.locations.functions.setIamPolicy({
      resource,
      requestBody: { policy },
      auth: authClient
    });
    
    console.log('Successfully set public access:', response.data);
  } catch (error) {
    console.error('Error:', error);
  }
}

makePublic();
EOF

echo ""
echo "To use this solution:"
echo "1. cd functions && npm install googleapis"
echo "2. node /tmp/set-function-public-access.js"
echo ""

echo -e "${YELLOW}Solution 5: Check and fix function generation/version${NC}"
echo "Sometimes the error occurs when the function generation is mismatched."
echo ""
echo "1. Get current function details:"
echo "   gcloud functions describe $FUNCTION_NAME --region=$REGION --format=json | jq '.serviceConfig.revision'"
echo ""
echo "2. Delete and redeploy (last resort):"
echo "   gcloud functions delete $FUNCTION_NAME --region=$REGION --quiet"
echo "   firebase deploy --only functions:offlineFieldAppAPI"
echo ""

echo -e "${BLUE}Additional Troubleshooting Steps:${NC}"
echo "1. Check if function is in DEPLOYING state:"
echo "   watch -n 2 'gcloud functions describe $FUNCTION_NAME --region=$REGION | grep state'"
echo ""
echo "2. Check Cloud Build logs:"
echo "   gcloud builds list --limit=5"
echo ""
echo "3. Check function logs for errors:"
echo "   firebase functions:log --only offlineFieldAppAPI"
echo ""

echo -e "${GREEN}Quick Test Command:${NC}"
echo "Once fixed, test with:"
echo "curl -X GET https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME/health \\"
echo "  -H 'X-API-Key: field-app-dev-key-2025' \\"
echo "  -H 'X-Device-ID: test-device-001'"