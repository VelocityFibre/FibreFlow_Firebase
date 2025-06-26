#!/bin/bash

echo "Testing Airtable API connection..."
echo ""

# Your API key and base ID
API_KEY="patEKhZokLJqTadpy.fee1d3818ab0dfccaea30091e04d66b467d75638fa6369d89ed3664d0e7e40bf"
BASE_ID="appkYMgaK0cHVu4Zg"

# Test with curl
echo "Attempting to fetch first 3 customers..."
curl -s -X GET "https://api.airtable.com/v0/$BASE_ID/Customers?maxRecords=3" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  | jq '.' 2>/dev/null || echo "Failed to connect to Airtable API"

echo ""
echo "If you see JSON data above, your API key is working!"
echo "If not, check:"
echo "1. Internet connection"
echo "2. API key is valid"
echo "3. Base ID is correct"