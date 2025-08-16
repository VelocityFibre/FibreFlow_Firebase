#!/bin/bash

# Test script for offlineFieldAppAPI function

echo "Testing Offline Field App API..."
echo "================================"

FUNCTION_URL="https://us-central1-fibreflow-73daf.cloudfunctions.net/offlineFieldAppAPI"
API_KEY="field-app-dev-key-2025"
DEVICE_ID="test-device-001"

# Test 1: Health check
echo ""
echo "Test 1: Health Check"
echo "-------------------"
curl -X GET "$FUNCTION_URL/health" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Device-ID: $DEVICE_ID" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 2: OPTIONS request (CORS preflight)
echo ""
echo "Test 2: CORS Preflight Check"
echo "----------------------------"
curl -X OPTIONS "$FUNCTION_URL/health" \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-API-Key,X-Device-ID" \
  -i

# Test 3: Invalid API key
echo ""
echo "Test 3: Invalid API Key (should return 401)"
echo "-----------------------------------------"
curl -X GET "$FUNCTION_URL/health" \
  -H "X-API-Key: invalid-key" \
  -H "X-Device-ID: $DEVICE_ID" \
  -w "\nHTTP Status: %{http_code}\n"

# Test 4: Missing device ID
echo ""
echo "Test 4: Missing Device ID (should return 400)"
echo "-------------------------------------------"
curl -X GET "$FUNCTION_URL/health" \
  -H "X-API-Key: $API_KEY" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Tests complete!"