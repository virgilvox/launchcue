#!/bin/bash

# Test different formats of the API key to see what gets recognized
API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"
TEST_ENDPOINT="/tasks"

echo "=== Testing API Key Format Recognition ==="
echo

test_auth_format() {
  local auth_header="$1"
  local description="$2"
  
  echo "Testing $description:"
  echo "Header: $auth_header"
  
  response=$(curl -s \
    -H "$auth_header" \
    -H "Content-Type: application/json" \
    "$BASE_URL$TEST_ENDPOINT")
  
  # Check if authentication was successful
  if echo "$response" | grep -q "error"; then
    echo "❌ Auth Failed:"
    echo "${response:0:100}..."
  else
    echo "✅ Auth Successful!"
    echo "First 10 characters of response: ${response:0:10}..."
  fi
  
  echo "-------------------------------------"
}

# Test different authorization header formats
test_auth_format "Authorization: Bearer $API_KEY" "Standard format with Bearer prefix"
test_auth_format "Authorization: $API_KEY" "Without Bearer prefix"
test_auth_format "Authorization: Bearer ${API_KEY:0:20}..." "Truncated key"
test_auth_format "Authorization: Token $API_KEY" "Using Token instead of Bearer"
test_auth_format "X-API-Key: $API_KEY" "Using X-API-Key header"
test_auth_format "Api-Key: $API_KEY" "Using Api-Key header"

echo "=== Testing Complete ===" 