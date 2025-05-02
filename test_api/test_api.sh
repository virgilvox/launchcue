#!/bin/bash

API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue API ==="
echo "API Key: $API_KEY"
echo

# Function to make API requests
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  
  echo "Testing $method $endpoint..."
  
  response=$(curl -s -X $method \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "$BASE_URL$endpoint")
  
  # Check if the response is valid JSON
  if echo "$response" | jq -e . >/dev/null 2>&1; then
    # It's valid JSON
    if echo "$response" | jq -e 'has("error")' >/dev/null 2>&1 && [ "$(echo "$response" | jq -r 'has("error")')" = "true" ]; then
      echo "❌ Error response:"
      echo "$response" | jq '.'
    else
      echo "✅ Success response:"
      echo "$response" | jq '.'
    fi
  else
    # Not valid JSON
    echo "❌ Invalid JSON response:"
    echo "$response"
  fi
  
  echo "--------------------------------------------"
}

# Test API endpoints
test_endpoint "/teams"
test_endpoint "/projects"
test_endpoint "/tasks"
test_endpoint "/clients"
test_endpoint "/notes"
test_endpoint "/resources"
echo "=== API Testing Complete ===" 