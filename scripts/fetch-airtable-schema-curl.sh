#!/bin/bash

# Airtable Schema Fetcher using curl
# This script fetches the complete schema for the Airtable base

API_TOKEN="patEKhZokLJqTadpy.fee1d3818ab0dfccaea30091e04d66b467d75638fa6369d89ed3664d0e7e40bf"
BASE_ID="appkYMgaK0cHVu4Zg"
OUTPUT_DIR="../docs"

echo "Fetching Airtable schema for base: $BASE_ID"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Fetch the schema
echo "Making API request..."
curl -X GET "https://api.airtable.com/v0/meta/bases/$BASE_ID/tables" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -o "$OUTPUT_DIR/airtable-schema-raw.json" \
  -w "\nHTTP Status: %{http_code}\n"

# Check if the request was successful
if [ $? -eq 0 ]; then
  echo "Schema fetched successfully!"
  echo "Raw JSON saved to: $OUTPUT_DIR/airtable-schema-raw.json"
  
  # Pretty print the JSON
  if command -v jq &> /dev/null; then
    jq '.' "$OUTPUT_DIR/airtable-schema-raw.json" > "$OUTPUT_DIR/airtable-schema.json"
    echo "Formatted JSON saved to: $OUTPUT_DIR/airtable-schema.json"
    
    # Extract basic information
    echo -e "\n=== Schema Summary ==="
    jq -r '.tables[] | "- \(.name) (ID: \(.id)) - \(.fields | length) fields"' "$OUTPUT_DIR/airtable-schema-raw.json"
  else
    echo "jq not installed - skipping JSON formatting"
  fi
else
  echo "Error fetching schema!"
fi