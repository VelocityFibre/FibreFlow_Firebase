#!/bin/bash

echo "Testing Pole Analytics API Endpoints..."
echo "======================================="

# Test public summary endpoint
echo -e "\n1. Testing Summary Endpoint:"
echo "URL: https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic"
curl -s -w "\nHTTP Status: %{http_code}\n" "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsSummaryPublic"

# Test public analytics endpoint
echo -e "\n\n2. Testing Full Analytics Endpoint:"
echo "URL: https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=7"
curl -s -w "\nHTTP Status: %{http_code}\n" "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic?days=7"

# Test with POST method
echo -e "\n\n3. Testing with POST method:"
curl -s -X POST -H "Content-Type: application/json" -w "\nHTTP Status: %{http_code}\n" "https://us-central1-fibreflow-73daf.cloudfunctions.net/poleAnalyticsPublic" -d '{}'

echo -e "\n\nDone!"