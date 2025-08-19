#!/bin/bash

echo "Testing Pole Analytics Webhook API..."
echo "===================================="

BASE_URL="https://us-central1-fibreflow-73daf.cloudfunctions.net/poleWebhook"
TOKEN="fibreflow-pole-analytics-2025"

echo -e "\n1. Testing without token (should fail):"
curl -s "$BASE_URL" | jq '.'

echo -e "\n\n2. Testing with token in header (summary):"
curl -s -H "X-API-Token: $TOKEN" "$BASE_URL?endpoint=summary" | jq '.'

echo -e "\n\n3. Testing with token in query (summary):"
curl -s "$BASE_URL?endpoint=summary&token=$TOKEN" | jq '.'

echo -e "\n\n4. Testing full analytics:"
curl -s -H "X-API-Token: $TOKEN" "$BASE_URL?endpoint=analytics&days=7" | jq '.'

echo -e "\n\nDone!"