#!/bin/bash

echo "Testing Offline Field App API via Firebase Hosting..."
echo "===================================================="

# Test health endpoint via hosting
echo -e "\n1. Testing Health Check (via Hosting):"
curl -X GET https://fibreflow-73daf.web.app/api/offline-field/health \
  -H 'X-API-Key: field-app-dev-key-2025' \
  -H 'X-Device-ID: test-device-001' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\n2. Testing Pole Capture (via Hosting):"
curl -X POST https://fibreflow-73daf.web.app/api/offline-field/api/v1/poles/capture \
  -H 'X-API-Key: field-app-dev-key-2025' \
  -H 'X-Device-ID: test-device-001' \
  -H 'Content-Type: application/json' \
  -d '{
    "pole": {
      "poleNumber": "TEST.P.'$(date +%s)'",
      "gps": {
        "latitude": -26.123456,
        "longitude": 28.123456,
        "accuracy": 5.2
      },
      "status": "captured",
      "notes": "Test via hosting URL"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\n3. Testing Pending Syncs (via Hosting):"
curl -X GET https://fibreflow-73daf.web.app/api/offline-field/api/v1/sync/pending \
  -H 'X-API-Key: field-app-dev-key-2025' \
  -H 'X-Device-ID: test-device-001' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nTest complete!"
echo "==============="
echo "If successful, your developer should use these URLs:"
echo "Base URL: https://fibreflow-73daf.web.app/api/offline-field"
echo "Instead of: https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI"