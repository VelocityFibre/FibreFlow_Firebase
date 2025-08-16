#!/bin/bash

echo "Testing Offline Field App API..."
echo "================================"

# Test health endpoint
echo -e "\n1. Testing Health Check:"
curl -X GET https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/health \
  -H 'X-API-Key: field-app-dev-key-2025' \
  -H 'X-Device-ID: test-device-001' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\n2. Testing Pole Capture:"
curl -X POST https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI/api/v1/poles/capture \
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
      "status": "captured"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nTest complete!"