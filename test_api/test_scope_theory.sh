#!/bin/bash

API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing API Key Scope Theory ==="
echo "API Key: $API_KEY"
echo

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local description=$2
  
  echo "Testing $description: $endpoint"
  
  response=$(curl -s \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "$BASE_URL$endpoint")
  
  # Save to a file
  echo "$response" > "scope_test_${description}.json"
  
  # Check for error indicators in the response
  if echo "$response" | grep -q "error"; then
    echo "❌ Error detected."
    if echo "$response" | grep -q "Forbidden"; then
      echo "   Cause: API key doesn't have the right scope (403 Forbidden)"
    elif echo "$response" | grep -q "Unauthorized"; then
      echo "   Cause: Authentication issue (401 Unauthorized)"
    else
      echo "   Cause: Other error"
    fi
    echo "   First 100 chars: ${response:0:100}..."
  else
    echo "✅ Success! API key works for this endpoint."
    echo "   First 100 chars: ${response:0:100}..."
  fi
  
  echo "-------------------------------------"
}

# Test different endpoints
test_endpoint "/tasks" "tasks (known to work)"
test_endpoint "/projects" "projects (might have scope checks)"
test_endpoint "/clients" "clients (might have scope checks)"
test_endpoint "/project-detail/6814e084a53a7ff5fb8192c1" "project-detail (has auth but no scope check)"

echo "=== Testing Complete ===" 