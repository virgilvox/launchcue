#!/bin/bash

# The new API key with additional scopes
API_KEY="lc_sk_Afe4QXcX1DIp0GDKfCRi6vtjCcP_Gj-gMbVGsN537Mc"
BASE_URL="http://localhost:8888/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue API with New Key (with more scopes) ==="
echo "API Key: $API_KEY"

# Test all endpoints
test_all_endpoints() {
  local endpoints=(
    "/projects" 
    "/tasks" 
    "/clients" 
    "/notes"
    "/teams"
    "/resources"
    "/campaigns"
    "/calendar-events"
    "/api-keys"
    "/braindumps"
  )
  
  for endpoint in "${endpoints[@]}"; do
    echo -e "\nTesting GET $endpoint..."
    
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
    else
      echo "✅ Success! Endpoint responds with data."
      # Get count of items in the array response
      items=$(echo "$response" | grep -o '{' | wc -l)
      echo "   Found approximately $items items in the response."
    fi
  done
}

# Execute tests
test_all_endpoints

echo -e "\n=== Testing Complete ===" 