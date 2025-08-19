#!/bin/bash

echo "Testing Pole Analytics API after IAM fix..."
echo "========================================="

BASE_URL="https://us-central1-fibreflow-73daf.cloudfunctions.net"
TOKEN="fibreflow-pole-analytics-2025"

echo -e "\n1. Testing poleAnalyticsExpress health:"
curl -s -H "X-API-Token: $TOKEN" "$BASE_URL/poleAnalyticsExpress/health" | jq '.'

echo -e "\n\n2. Testing poleAnalyticsExpress summary (should work now):"
curl -s -H "X-API-Token: $TOKEN" "$BASE_URL/poleAnalyticsExpress/summary" | jq '.'

echo -e "\n\n3. Testing poleAnalyticsExpress analytics:"
curl -s -H "X-API-Token: $TOKEN" "$BASE_URL/poleAnalyticsExpress/analytics?days=7" | jq '.'

echo -e "\n\nDone! If you see permission errors, wait 1-2 minutes for IAM to propagate."