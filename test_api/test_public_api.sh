#!/bin/bash

# Test the public API with the newer API key
API_KEY="lc_sk_Afe4QXcX1DIp0GDKfCRi6vtjCcP_Gj-gMbVGsN537Mc"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue Public API with New Key ==="
echo "API Key: $API_KEY"
echo "Base URL: $BASE_URL"

# Function to test an endpoint and save response to file
test_endpoint() {
  local endpoint="$1"
  local filename="public_$(echo $endpoint | tr -d '/')"
  
  echo -e "\nTesting GET $endpoint..."
  
  # Make the request and save response to a file
  response=$(curl -s -X GET \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "$BASE_URL$endpoint")
  
  # Save response to file
  echo "$response" > "${filename}.json"
  
  # Check if there's an error in the response
  if echo "$response" | grep -q "error"; then
    error_type=$(echo "$response" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    details=$(echo "$response" | grep -o '"details":"[^"]*' | cut -d'"' -f4 2>/dev/null)
    
    echo "❌ Error: $error_type"
    if [ ! -z "$details" ]; then
      echo "   Details: $details"
    fi
  else
    echo "✅ Success! Response saved to ${filename}.json"
    # Get count of items in the array response
    items=$(echo "$response" | grep -o '{' | wc -l)
    echo "   Found approximately $items items in the response."
  fi
}

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
    "/braindumps"
  )
  
  for endpoint in "${endpoints[@]}"; do
    test_endpoint "$endpoint"
  done
}

# Test a specific endpoint with additional query parameters
test_specific_endpoint() {
  echo -e "\n=== Testing Specific Endpoint Examples ==="
  
  # Test tasks with filter
  echo -e "\nTesting GET /tasks with status filter..."
  curl -s -X GET \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    "$BASE_URL/tasks?status=To%20Do" > "public_tasks_todo.json"
  echo "✅ Response saved to public_tasks_todo.json"
  
  # Test projects for a specific client if available
  if [ -f "public_clients.json" ]; then
    # Try to extract the first client ID
    client_id=$(cat public_clients.json | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ ! -z "$client_id" ]; then
      echo -e "\nTesting GET /projects for client $client_id..."
      curl -s -X GET \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        "$BASE_URL/projects?clientId=$client_id" > "public_projects_by_client.json"
      echo "✅ Response saved to public_projects_by_client.json"
    fi
  fi
}

# Execute tests
test_all_endpoints
test_specific_endpoint

echo -e "\n=== Testing Complete ==="
echo "All responses have been saved to JSON files with 'public_' prefix" 