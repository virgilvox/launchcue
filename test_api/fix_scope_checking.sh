#!/bin/bash

# Script to analyze API endpoint files for consistent API key auth and scope checking

echo "=== Analyzing API Endpoint Files for Authentication Issues ==="
echo

# Directory containing the Netlify functions
FUNCTIONS_DIR="../netlify/functions"

# Check if the directory exists
if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "Error: Functions directory not found at $FUNCTIONS_DIR"
  exit 1
fi

# Function to analyze a file
analyze_file() {
  local file=$1
  local filename=$(basename "$file")
  
  echo "Analyzing $filename..."
  
  # Check for authentication patterns
  if grep -q "authenticateApiKeyRequest" "$file"; then
    echo "✅ Uses API Key Authentication"
    
    # Check if it has scope checking
    if grep -q "authContext.scopes" "$file"; then
      echo "✅ Has scope checking"
    else
      echo "⚠️ Missing scope checking!"
      
      # Determine resource type from filename
      resource_type=${filename%.*}
      
      echo "  Recommended fix: Add scope checking for '$resource_type'"
      echo "  Example code:"
      echo "  if (event.httpMethod === 'GET' && !authContext.scopes?.includes('read:$resource_type')) {"
      echo "      return createErrorResponse(403, 'Forbidden', 'API key does not have permission to read $resource_type');"
      echo "  }"
      echo "  if (['POST', 'PUT', 'DELETE'].includes(event.httpMethod) && !authContext.scopes?.includes('write:$resource_type')) {"
      echo "      return createErrorResponse(403, 'Forbidden', 'API key does not have permission to write $resource_type');"
      echo "  }"
    fi
  else
    echo "⚠️ No API Key Authentication found"
  fi
  
  # Check for import inconsistencies
  if grep -q "require('./utils/apiKeyAuth')" "$file"; then
    echo "✅ Imports from ./utils/apiKeyAuth"
  elif grep -q "require('./utils/auth')" "$file"; then
    if grep -q "authenticateApiKeyRequest.*require('./utils/auth')" "$file"; then
      echo "⚠️ Imports authenticateApiKeyRequest from ./utils/auth (should be from ./utils/apiKeyAuth)"
    else
      echo "✅ Imports from ./utils/auth (but not for API key auth)"
    fi
  else
    echo "⚠️ No authentication imports found"
  fi
  
  echo "-------------------------------------------"
}

# Find all JavaScript files in the functions directory
find "$FUNCTIONS_DIR" -name "*.js" -type f | while read -r file; do
  # Skip files in the utils directory and other non-endpoint files
  if [[ "$file" != *"/utils/"* && "$file" != *"/lib/"* && "$file" != *"/common/"* ]]; then
    analyze_file "$file"
  fi
done

echo
echo "=== Analysis Complete ==="
echo "You should fix the files with inconsistent authentication patterns." 