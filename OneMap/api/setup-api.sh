#!/bin/bash

echo "Setting up OneMap Staging API..."

# Step 1: Add the function to Firebase
echo "1. Add this code to your functions/index.js:"
echo "----------------------------------------"
cat << 'EOF'

// OneMap Staging API
const onemapApp = express();
onemapApp.use(cors({ origin: true }));
onemapApp.use(express.json());

onemapApp.get('/', (req, res) => {
  res.json({
    message: 'OneMap Staging API v1.0',
    endpoints: {
      '/summary': 'Get summary stats',
      '/records': 'Get records (paginated)',
      '/search': 'Search records',
      '/duplicates': 'Duplicate analysis',
      '/quality': 'Data quality report'
    }
  });
});

// Add all the endpoints from staging-api.js here...

exports.onemapStagingAPI = functions.https.onRequest(onemapApp);
EOF

echo ""
echo "2. Deploy the function:"
echo "firebase deploy --only functions:onemapStagingAPI"

echo ""
echo "3. Your API will be available at:"
echo "https://us-central1-fibreflow-73daf.cloudfunctions.net/onemapStagingAPI"

echo ""
echo "4. Share the API_DOCUMENTATION.md with your friend"

echo ""
echo "Done! The API provides read-only access to staging data."