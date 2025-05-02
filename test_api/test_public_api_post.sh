#!/bin/bash

# Test POST operations on the public API with the newer API key
API_KEY="lc_sk_Afe4QXcX1DIp0GDKfCRi6vtjCcP_Gj-gMbVGsN537Mc"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"
AUTH_HEADER="Authorization: Bearer $API_KEY"

echo "=== Testing LaunchCue Public API POST Operations ==="
echo "API Key: $API_KEY"
echo "Base URL: $BASE_URL"

# Function to test creating a task
test_create_task() {
  # Get project ID from the projects JSON file if it exists
  local project_id=""
  if [ -f "public_projects.json" ]; then
    project_id=$(cat public_projects.json | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  fi
  
  if [ -z "$project_id" ]; then
    echo "❌ No project ID found in public_projects.json. Using placeholder."
    project_id="PROJECT_ID"
  fi
  
  echo -e "\nTesting POST /tasks (Create New Task)..."
  echo "Using Project ID: $project_id"
  
  # Current date for task name to make it unique
  current_date=$(date +"%Y-%m-%d %H:%M:%S")
  
  # Create task data
  local task_data='{
    "title": "API Test Task - '"$current_date"'",
    "description": "This task was created via the public API test script",
    "status": "To Do",
    "type": "task",
    "projectId": "'"$project_id"'",
    "dueDate": "2025-06-30T00:00:00.000Z",
    "checklist": [
      {
        "title": "Step 1: Test POST API",
        "completed": true
      },
      {
        "title": "Step 2: Verify task creation",
        "completed": false
      }
    ]
  }'
  
  # Make the request
  response=$(curl -s -X POST \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$task_data" \
    "$BASE_URL/tasks")
  
  # Save response to file
  echo "$response" > "public_create_task_response.json"
  
  # Check if there's an error in the response
  if echo "$response" | grep -q "error"; then
    error_type=$(echo "$response" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    details=$(echo "$response" | grep -o '"details":"[^"]*' | cut -d'"' -f4 2>/dev/null)
    
    echo "❌ Error: $error_type"
    if [ ! -z "$details" ]; then
      echo "   Details: $details"
    fi
  else
    echo "✅ Success! Task created. Response saved to public_create_task_response.json"
    task_id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "   Created Task ID: $task_id"
  fi
}

# Function to test creating a note
test_create_note() {
  # Get project ID and client ID from the projects JSON file if it exists
  local project_id=""
  local client_id=""
  
  if [ -f "public_projects.json" ]; then
    project_id=$(cat public_projects.json | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    client_id=$(cat public_projects.json | grep -o '"clientId":"[^"]*' | head -1 | cut -d'"' -f4)
  fi
  
  if [ -z "$project_id" ]; then
    echo "❌ No project ID found. Using placeholder."
    project_id="PROJECT_ID"
  fi
  
  if [ -z "$client_id" ]; then
    echo "❌ No client ID found. Using placeholder."
    client_id="CLIENT_ID"
  fi
  
  echo -e "\nTesting POST /notes (Create New Note)..."
  echo "Using Project ID: $project_id"
  echo "Using Client ID: $client_id"
  
  # Current date for note title to make it unique
  current_date=$(date +"%Y-%m-%d %H:%M:%S")
  
  # Create note data
  local note_data='{
    "title": "API Test Note - '"$current_date"'",
    "content": "# API Test Note\n\nThis note was created via the public API test script.\n\n## Key Points\n- Testing API functionality\n- Verifying scope permissions\n- Documenting results",
    "tags": ["api", "test", "documentation"],
    "clientId": "'"$client_id"'",
    "projectId": "'"$project_id"'"
  }'
  
  # Make the request
  response=$(curl -s -X POST \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$note_data" \
    "$BASE_URL/notes")
  
  # Save response to file
  echo "$response" > "public_create_note_response.json"
  
  # Check if there's an error in the response
  if echo "$response" | grep -q "error"; then
    error_type=$(echo "$response" | grep -o '"error":"[^"]*' | cut -d'"' -f4)
    details=$(echo "$response" | grep -o '"details":"[^"]*' | cut -d'"' -f4 2>/dev/null)
    
    echo "❌ Error: $error_type"
    if [ ! -z "$details" ]; then
      echo "   Details: $details"
    fi
  else
    echo "✅ Success! Note created. Response saved to public_create_note_response.json"
    note_id=$(echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    echo "   Created Note ID: $note_id"
  fi
}

# Execute tests
test_create_task
test_create_note

echo -e "\n=== Testing Complete ==="
echo "All responses have been saved to JSON files with 'public_' prefix" 