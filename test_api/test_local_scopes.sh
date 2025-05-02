#!/bin/bash

# The existing API key works for projects, tasks, clients, notes
API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="http://localhost:8888/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue API Endpoints with Scope Checking ==="

# Test endpoints known to work with the current API key
test_working_endpoints() {
  echo -e "\n=== Testing endpoints with current key ==="
  
  local endpoints=("/projects" "/tasks" "/clients" "/notes")
  
  for endpoint in "${endpoints[@]}"; do
    echo -e "\nTesting GET $endpoint..."
    
    response=$(curl -s -X GET \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      "$BASE_URL$endpoint")
    
    # Check if there's an error in the response
    if echo "$response" | grep -q "error"; then
      echo "❌ Error detected: $(echo "$response" | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
      echo "Details: $(echo "$response" | grep -o '"details":"[^"]*' | cut -d'"' -f4)"
    else
      echo "✅ Success! Response contains data."
      # Get count of items in the array response
      items=$(echo "$response" | grep -o '{' | wc -l)
      echo "   Found approximately $items items in the response."
    fi
  done
}

# List all endpoints and their required scopes
test_scope_requirements() {
  echo -e "\n=== Checking scope requirements for all endpoints ==="
  
  local endpoints=(
    "/projects:read:projects" 
    "/tasks:read:tasks" 
    "/clients:read:clients" 
    "/notes:read:notes"
    "/teams:read:teams"
    "/resources:read:resources"
    "/campaigns:read:campaigns"
    "/calendar-events:read:calendar-events"
    "/api-keys:read:api-keys"
    "/braindumps:read:braindumps"
  )
  
  for endpoint_info in "${endpoints[@]}"; do
    # Split the endpoint_info into endpoint and scope
    endpoint="${endpoint_info%%:*}"  # Before first colon
    scope="${endpoint_info#*:}"      # After first colon
    
    echo -e "\nTesting GET $endpoint (requires $scope)..."
    
    response=$(curl -s -X GET \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      "$BASE_URL$endpoint")
    
    # Check if there's an error in the response
    if echo "$response" | grep -q "error"; then
      error_type=$(echo "$response" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
      details=$(echo "$response" | grep -o '"details":"[^"]*' | cut -d'"' -f4 2>/dev/null)
      
      echo "❌ Error: $error_type"
      if [ ! -z "$details" ]; then
        echo "   Details: $details"
      fi
      
      # Check if it's a scope-related error
      if echo "$response" | grep -q "sufficient permissions"; then
        echo "   🔑 This is a scope-related error. Current key doesn't have the \"$scope\" scope."
      fi
    else
      echo "✅ Success! Endpoint responds with data."
      # Get count of items in the array response
      items=$(echo "$response" | grep -o '{' | wc -l)
      echo "   Found approximately $items items in the response."
    fi
  done
}

# Execute tests
test_working_endpoints
test_scope_requirements

echo -e "\n=== Testing Complete ==="
echo "To test all endpoints, generate a new API key with all scopes in the Settings page." 