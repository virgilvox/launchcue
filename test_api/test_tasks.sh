#!/bin/bash

API_KEY="lc_sk_h1fbjJRtjMmsJslWBWUmp4qSQ3tQrt0W1lgUsJWlIZQ"
BASE_URL="https://launchcue.netlify.app/.netlify/functions"

echo "=== Testing LaunchCue API: Tasks Endpoint ==="
echo "API Key: $API_KEY"
echo

# Test the tasks endpoint directly
echo "Testing GET /tasks endpoint..."
echo

response=$(curl -s \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  "${BASE_URL}/tasks")

# Save the response to a file for inspection
echo "$response" > tasks_response.json

# Attempt to format with jq
echo "Formatted response:"
echo "$response" | jq '.' || echo "Failed to parse as JSON. Raw response saved to tasks_response.json"

echo
echo "=== Testing Complete ===" 