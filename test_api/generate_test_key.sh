#!/bin/bash

# Get an auth token first by logging in
echo "Logging in to get JWT token..."
AUTH_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": "obsidian@deveco.io",
    "password": "password123"
  }' \
  "https://launchcue.netlify.app/.netlify/functions/auth")

# Extract the token
TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to get JWT token. Response: $AUTH_RESPONSE"
  exit 1
fi

echo "JWT token obtained. Generating API key..."

# Create an API key with all scopes
API_KEY_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "scopes": [
      "read:projects", "write:projects",
      "read:tasks", "write:tasks",
      "read:clients", "write:clients",
      "read:campaigns", "write:campaigns",
      "read:notes", "write:notes",
      "read:teams", "write:teams",
      "read:resources", "write:resources",
      "read:calendar-events", "write:calendar-events",
      "read:braindumps", "write:braindumps",
      "read:api-keys", "write:api-keys"
    ]
  }' \
  "https://launchcue.netlify.app/.netlify/functions/api-keys")

# Extract the full API key
NEW_API_KEY=$(echo $API_KEY_RESPONSE | grep -o '"apiKey":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_API_KEY" ]; then
  echo "Failed to generate API key. Response: $API_KEY_RESPONSE"
  exit 1
fi

echo "API key generated successfully: $NEW_API_KEY"

# Update the test_all_endpoints.sh script with the new key
sed -i '' "s/API_KEY=\"[^\"]*\"/API_KEY=\"$NEW_API_KEY\"/" test_all_endpoints.sh
sed -i '' "s/API_KEY=\"[^\"]*\"/API_KEY=\"$NEW_API_KEY\"/" test_tasks.sh

echo "Updated test scripts with the new API key."
echo "You can now run ./test_all_endpoints.sh to test all endpoints with the new key." 