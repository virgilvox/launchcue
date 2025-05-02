# Authentication in LaunchCue

This directory contains utilities for authentication in the LaunchCue application.

## Key Files

### `authHandler.js`

A new centralized authentication handler that supports both JWT tokens and API keys with proper scope checking.

#### Features

- **Unified Authentication**: One function (`authenticate`) handles both JWT and API keys
- **Automatic Detection**: Detects the authentication type based on token format
- **Scope Checking**: Verifies API key scopes against required permissions
- **Resource Path Detection**: Automatically derives required scopes from the resource type and HTTP method

#### How to Use

```javascript
const { authenticate } = require('./utils/authHandler');

// In your Netlify function handler:
exports.handler = async function(event, context) {
  let authContext;
  try {
    // Will automatically detect JWT vs API Key
    authContext = await authenticate(event, {
      // Optional: explicitly specify required scopes
      requiredScopes: event.httpMethod === 'GET' 
        ? ['read:tasks'] 
        : ['write:tasks'],
      // Optional: skip scope checking (not recommended)
      skipScopeCheck: false
    });
    
    // Now you can use the auth context
    const { userId, teamId, authType, scopes } = authContext;
    
    // Rest of your handler code
    
  } catch (errorResponse) {
    // Authentication failed, return the error
    return errorResponse;
  }
}
```

## Scope System

API keys have scopes that control what operations they can perform:

- `read:resource` - Allows GET operations on the resource
- `write:resource` - Allows POST, PUT, DELETE operations on the resource
- `admin` - Grants full access to all resources
- `*` - Also grants full access

Examples:
- `read:tasks` - Can view tasks
- `write:projects` - Can create/edit/delete projects
- `read:clients` - Can view clients

## Legacy Files

- `auth.js` - Original JWT authentication
- `apiKeyAuth.js` - Original API key authentication

These are maintained for backward compatibility but should be gradually replaced with `authHandler.js`. 