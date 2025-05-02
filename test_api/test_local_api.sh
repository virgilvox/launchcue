#!/bin/bash

API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="http://localhost:8888/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue API on local server with key: $API_KEY ==="
echo

# Function to test an endpoint and save the response
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local filename="local_$(echo "$endpoint" | tr / _)"
  if [ "$filename" = "" ]; then
    filename="local_root"
  fi
  filename="${filename}.json"
  
  echo "Testing $method $endpoint..."
  
  response=$(curl -s -X $method \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "$BASE_URL$endpoint")
  
  # Save response to a file
  echo "$response" > "$filename"
  
  # Check for error indicators in the response
  if echo "$response" | grep -q "error"; then
    echo "❌ Error detected. Response saved to $filename"
    echo "First 100 characters: ${response:0:100}..."
  else
    echo "✅ Success response saved to $filename"
    echo "First 100 characters: ${response:0:100}..."
  fi
  
  echo "--------------------------------------------"
}

# Test API endpoints
test_endpoint "/tasks"
test_endpoint "/projects" 
test_endpoint "/clients"
test_endpoint "/notes"
test_endpoint "/teams"
test_endpoint "/resources"
test_endpoint "/campaigns"
test_endpoint "/calendar-events"
test_endpoint "/api-keys"
test_endpoint "/braindumps"

echo "=== API Testing Complete ==="
echo "All responses have been saved to individual JSON files for inspection." 