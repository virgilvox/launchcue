# LaunchCue API Documentation

This document provides detailed documentation for the LaunchCue API, including all endpoints, request and response formats, and example requests.

## Base URLs

The API base URL depends on your deployment:
* **Netlify Dev:** `http://localhost:8888/.netlify/functions`
* **Production:** `https://launchcue.netlify.app/.netlify/functions`

## Authentication

API requests can be authenticated in two ways:

1. **JWT Token (User Session):**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **API Key (External Integrations):**
   ```
   Authorization: Bearer lc_sk_YOUR_API_KEY_HERE
   ```

## API Key Scopes

LaunchCue uses a granular scope-based permission system:

| Resource | Read Scope | Write Scope |
|----------|------------|-------------|
| Tasks | `read:tasks` | `write:tasks` |
| Projects | `read:projects` | `write:projects` |
| Clients | `read:clients` | `write:clients` |
| Notes | `read:notes` | `write:notes` |
| Teams | `read:teams` | `write:teams` |
| Resources | `read:resources` | `write:resources` |
| Campaigns | `read:campaigns` | `write:campaigns` |
| Calendar Events | `read:calendar-events` | `write:calendar-events` |
| Brain Dumps | `read:braindumps` | `write:braindumps` |
| API Keys | `read:api-keys` | `write:api-keys` |

## Error Handling

The API uses standard HTTP status codes:

* `200 OK` - Request succeeded
* `201 Created` - Resource created successfully
* `400 Bad Request` - Invalid request parameters
* `401 Unauthorized` - Authentication required or failed
* `403 Forbidden` - Insufficient permissions
* `404 Not Found` - Resource not found
* `500 Internal Server Error` - Server-side error

Error response format:
```json
{
  "error": "Error Type",
  "details": "Error message or object with details"
}
```

Example scope error:
```json
{
  "error": "Forbidden",
  "details": "API key does not have sufficient permissions. Required scopes: read:teams"
}
```

---

## Task Management

### List Tasks

Returns all tasks for the current team.

**Endpoint:** `GET /tasks`  
**Required Scope:** `read:tasks`

**Query Parameters:**
- `projectId` (optional, string) - Filter tasks by project ID
- `status` (optional, string) - Filter tasks by status (e.g., "To Do", "In Progress", "Done")
- `type` (optional, string) - Filter tasks by type

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/tasks?status=To%20Do" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
[
  {
    "id": "6814e8c52f109aacb22d79ee",
    "title": "Meeting with Client",
    "description": "Discuss project requirements",
    "status": "To Do",
    "type": "task",
    "projectId": "6814e084a53a7ff5fb8192c1",
    "dueDate": "2025-05-20T00:00:00.000Z",
    "checklist": [
      {
        "title": "Prepare agenda",
        "completed": false
      },
      {
        "title": "Review previous notes",
        "completed": false
      }
    ],
    "teamId": "681495ef6ff5808e7029558b",
    "createdAt": "2025-05-02T15:46:13.089Z",
    "updatedAt": "2025-05-02T18:40:44.324Z",
    "createdBy": "68147ed8a9b5c368514228bf"
  }
]
```

### Get Task

Retrieves a specific task by ID.

**Endpoint:** `GET /tasks/:taskId`  
**Required Scope:** `read:tasks`

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/tasks/6814e8c52f109aacb22d79ee" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
{
  "id": "6814e8c52f109aacb22d79ee",
  "title": "Meeting with Client",
  "description": "Discuss project requirements",
  "status": "To Do",
  "type": "task",
  "projectId": "6814e084a53a7ff5fb8192c1",
  "dueDate": "2025-05-20T00:00:00.000Z",
  "checklist": [
    {
      "title": "Prepare agenda",
      "completed": false
    },
    {
      "title": "Review previous notes",
      "completed": false
    }
  ],
  "teamId": "681495ef6ff5808e7029558b",
  "createdAt": "2025-05-02T15:46:13.089Z",
  "updatedAt": "2025-05-02T18:40:44.324Z",
  "createdBy": "68147ed8a9b5c368514228bf"
}
```

### Create Task

Creates a new task.

**Endpoint:** `POST /tasks`  
**Required Scope:** `write:tasks`

**Request Body:**
```json
{
  "title": "Documentation Review",
  "description": "Review and update API documentation",
  "status": "To Do",
  "type": "task",
  "projectId": "6814e084a53a7ff5fb8192c1",
  "dueDate": "2025-06-15T00:00:00.000Z",
  "checklist": [
    {
      "title": "Review current docs",
      "completed": false
    },
    {
      "title": "Update examples",
      "completed": false
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/tasks" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"title":"Documentation Review","description":"Review and update API documentation","status":"To Do","type":"task","projectId":"6814e084a53a7ff5fb8192c1","dueDate":"2025-06-15T00:00:00.000Z","checklist":[{"title":"Review current docs","completed":false},{"title":"Update examples","completed":false}]}'
```

**Example Response:**
```json
{
  "id": "6814ff535f27fdc6c77a3b78",
  "title": "Documentation Review",
  "description": "Review and update API documentation",
  "status": "To Do",
  "type": "task",
  "projectId": "6814e084a53a7ff5fb8192c1",
  "dueDate": "2025-06-15T00:00:00.000Z",
  "checklist": [
    {
      "title": "Review current docs",
      "completed": false
    },
    {
      "title": "Update examples",
      "completed": false
    }
  ],
  "teamId": "681495ef6ff5808e7029558b",
  "createdAt": "2025-05-02T17:25:23.783Z",
  "updatedAt": "2025-05-02T17:25:23.783Z",
  "createdBy": "68147ed8a9b5c368514228bf"
}
```

### Update Task

Updates an existing task.

**Endpoint:** `PUT /tasks/:taskId`  
**Required Scope:** `write:tasks`

**Request Body:**
```json
{
  "status": "In Progress",
  "checklist": [
    {
      "title": "Review current docs",
      "completed": true
    },
    {
      "title": "Update examples",
      "completed": false
    }
  ]
}
```

**Example Request:**
```bash
curl -X PUT "https://launchcue.netlify.app/.netlify/functions/tasks/6814ff535f27fdc6c77a3b78" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress","checklist":[{"title":"Review current docs","completed":true},{"title":"Update examples","completed":false}]}'
```

**Example Response:**
```json
{
  "id": "6814ff535f27fdc6c77a3b78",
  "title": "Documentation Review",
  "description": "Review and update API documentation",
  "status": "In Progress",
  "type": "task",
  "projectId": "6814e084a53a7ff5fb8192c1",
  "dueDate": "2025-06-15T00:00:00.000Z",
  "checklist": [
    {
      "title": "Review current docs",
      "completed": true
    },
    {
      "title": "Update examples",
      "completed": false
    }
  ],
  "teamId": "681495ef6ff5808e7029558b",
  "createdAt": "2025-05-02T17:25:23.783Z",
  "updatedAt": "2025-05-02T17:30:44.324Z",
  "createdBy": "68147ed8a9b5c368514228bf"
}
```

### Delete Task

Deletes a task.

**Endpoint:** `DELETE /tasks/:taskId`  
**Required Scope:** `write:tasks`

**Example Request:**
```bash
curl -X DELETE "https://launchcue.netlify.app/.netlify/functions/tasks/6814ff535f27fdc6c77a3b78" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
{
  "message": "Task deleted successfully"
}
```

---

## Project Management

### List Projects

Returns all projects for the current team.

**Endpoint:** `GET /projects`  
**Required Scope:** `read:projects`

**Query Parameters:**
- `clientId` (optional, string) - Filter projects by client ID

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/projects" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
[
  {
    "id": "6814e084a53a7ff5fb8192c1",
    "title": "Documentation",
    "description": "",
    "status": "To Do",
    "clientId": "6814db523a41d6e755521a91",
    "startDate": "2025-05-20T00:00:00.000Z",
    "dueDate": "2025-06-07T00:00:00.000Z",
    "tags": [],
    "teamId": "681495ef6ff5808e7029558b",
    "createdAt": "2025-05-02T15:11:00.129Z",
    "updatedAt": "2025-05-02T15:11:00.129Z",
    "createdBy": "68147ed8a9b5c368514228bf"
  }
]
```

### Create Project

Creates a new project.

**Endpoint:** `POST /projects`  
**Required Scope:** `write:projects`

**Request Body:**
```json
{
  "title": "Website Redesign",
  "description": "Update the company website with new branding",
  "status": "To Do",
  "clientId": "6814db523a41d6e755521a91",
  "startDate": "2025-07-01T00:00:00.000Z",
  "dueDate": "2025-08-15T00:00:00.000Z",
  "tags": ["web", "design"]
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/projects" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"title":"Website Redesign","description":"Update the company website with new branding","status":"To Do","clientId":"6814db523a41d6e755521a91","startDate":"2025-07-01T00:00:00.000Z","dueDate":"2025-08-15T00:00:00.000Z","tags":["web","design"]}'
```

**Example Response:**
```json
{
  "id": "6817cf5d2c441fae99b72a11",
  "title": "Website Redesign",
  "description": "Update the company website with new branding",
  "status": "To Do",
  "clientId": "6814db523a41d6e755521a91",
  "startDate": "2025-07-01T00:00:00.000Z",
  "dueDate": "2025-08-15T00:00:00.000Z",
  "tags": ["web", "design"],
  "teamId": "681495ef6ff5808e7029558b",
  "createdAt": "2025-05-04T10:15:25.481Z",
  "updatedAt": "2025-05-04T10:15:25.481Z",
  "createdBy": "68147ed8a9b5c368514228bf"
}
```

### Get Project

Retrieves a project by ID.

**Endpoint:** `GET /projects/:projectId`  
**Required Scope:** `read:projects`

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/projects/6814e084a53a7ff5fb8192c1" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

### Update Project

Updates an existing project.

**Endpoint:** `PUT /projects/:projectId`  
**Required Scope:** `write:projects`

**Example Request:**
```bash
curl -X PUT "https://launchcue.netlify.app/.netlify/functions/projects/6814e084a53a7ff5fb8192c1" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress"}'
```

### Delete Project

Deletes a project.

**Endpoint:** `DELETE /projects/:projectId`  
**Required Scope:** `write:projects`

**Example Request:**
```bash
curl -X DELETE "https://launchcue.netlify.app/.netlify/functions/projects/6814e084a53a7ff5fb8192c1" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

---

## Client Management

### List Clients

Returns all clients for the current team.

**Endpoint:** `GET /clients`  
**Required Scope:** `read:clients`

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/clients" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
[
  {
    "id": "6814db523a41d6e755521a91",
    "name": "Thistle Technologies",
    "industry": "IoT",
    "website": "https://thistle.tech/",
    "description": "IoT device manufacturer",
    "contactName": "",
    "contactEmail": "",
    "contactPhone": "",
    "address": "",
    "notes": "",
    "teamId": "681495ef6ff5808e7029558b",
    "createdAt": "2025-05-02T14:48:50.318Z",
    "updatedAt": "2025-05-02T16:49:00.944Z",
    "createdBy": "68147ed8a9b5c368514228bf",
    "contacts": [
      {
        "id": "contact_1746204540692",
        "name": "Russel",
        "email": "",
        "phone": "",
        "role": "",
        "isPrimary": true,
        "notes": "",
        "createdAt": "2025-05-02T16:49:00.692Z"
      }
    ],
    "projects": [
      {
        "id": "6814e084a53a7ff5fb8192c1",
        "title": "Documentation",
        "status": "To Do"
      }
    ]
  }
]
```

### Create Client

Creates a new client.

**Endpoint:** `POST /clients`  
**Required Scope:** `write:clients`

**Request Body:**
```json
{
  "name": "Acme Corp",
  "industry": "Technology",
  "website": "https://acme.com",
  "description": "Enterprise software provider",
  "contacts": [
    {
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "phone": "555-123-4567",
      "role": "CTO",
      "isPrimary": true
    }
  ]
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/clients" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","industry":"Technology","website":"https://acme.com","description":"Enterprise software provider","contacts":[{"name":"Jane Smith","email":"jane@acme.com","phone":"555-123-4567","role":"CTO","isPrimary":true}]}'
```

### Get Client

Retrieves a client by ID.

**Endpoint:** `GET /clients/:clientId`  
**Required Scope:** `read:clients`

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/clients/6814db523a41d6e755521a91" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

### Update Client

Updates an existing client.

**Endpoint:** `PUT /clients/:clientId`  
**Required Scope:** `write:clients`

**Example Request:**
```bash
curl -X PUT "https://launchcue.netlify.app/.netlify/functions/clients/6814db523a41d6e755521a91" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"industry":"IoT and AI","website":"https://thistle.tech/v2"}'
```

### Delete Client

Deletes a client.

**Endpoint:** `DELETE /clients/:clientId`  
**Required Scope:** `write:clients`

**Example Request:**
```bash
curl -X DELETE "https://launchcue.netlify.app/.netlify/functions/clients/6814db523a41d6e755521a91" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

---

## Notes

### List Notes

Returns all notes for the current team.

**Endpoint:** `GET /notes`  
**Required Scope:** `read:notes`

**Query Parameters:**
- `clientId` (optional, string) - Filter notes by client ID
- `projectId` (optional, string) - Filter notes by project ID
- `tag` (optional, string) - Filter notes by tag

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/notes" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
[
  {
    "id": "6814f5be2f3b3244f4322047",
    "title": "Meeting Notes - Project Kickoff",
    "content": "# Project Kickoff Meeting\n\n- Discussed timeline and deliverables\n- Client wants weekly updates\n- Next steps: Create detailed project plan",
    "tags": ["meeting", "kickoff"],
    "clientId": "6814db523a41d6e755521a91",
    "projectId": "6814e084a53a7ff5fb8192c1",
    "teamId": "681495ef6ff5808e7029558b",
    "userId": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-02T16:41:34.098Z",
    "updatedAt": "2025-05-02T16:41:34.098Z"
  }
]
```

### Create Note

Creates a new note.

**Endpoint:** `POST /notes`  
**Required Scope:** `write:notes`

**Request Body:**
```json
{
  "title": "API Integration Plan",
  "content": "# API Integration Plan\n\n## Requirements\n- Authentication\n- Endpoint mapping\n- Error handling\n\n## Timeline\n- Week 1: Research\n- Week 2: Implementation\n- Week 3: Testing",
  "tags": ["api", "planning"],
  "clientId": "6814db523a41d6e755521a91",
  "projectId": "6814e084a53a7ff5fb8192c1"
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/notes" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"title":"API Integration Plan","content":"# API Integration Plan\n\n## Requirements\n- Authentication\n- Endpoint mapping\n- Error handling\n\n## Timeline\n- Week 1: Research\n- Week 2: Implementation\n- Week 3: Testing","tags":["api","planning"],"clientId":"6814db523a41d6e755521a91","projectId":"6814e084a53a7ff5fb8192c1"}'
```

---

## Team Management

### List Teams

Returns all teams the user belongs to.

**Endpoint:** `GET /teams`  
**Required Scope:** `read:teams`

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/teams" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

**Example Response:**
```json
[
  {
    "id": "681495ef6ff5808e7029558b",
    "name": "Acme Team",
    "owner": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-02T12:35:11.456Z",
    "updatedAt": "2025-05-02T12:35:11.456Z",
    "members": [
      {
        "id": "68147ed8a9b5c368514228bf",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "owner"
      }
    ]
  }
]
```

---

## Calendar Events

### List Calendar Events

Returns all calendar events for the current team.

**Endpoint:** `GET /calendar-events`  
**Required Scope:** `read:calendar-events`

**Query Parameters:**
- `start` (optional, ISO date string) - Start date for filtering events
- `end` (optional, ISO date string) - End date for filtering events

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/calendar-events?start=2025-05-01&end=2025-05-31" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

---

## Brain Dump Processing

### Process Brain Dump

Processes a brain dump using Claude AI to generate structured information.

**Endpoint:** `POST /brain-dump-create-items`  
**Required Scope:** `write:braindumps`

**Request Body:**
```json
{
  "content": "Meeting with Acme Corp today. Need to follow up on API integration questions. Schedule demo for next week. Create documentation for the new feature. Update project timeline.",
  "projectId": "6814e084a53a7ff5fb8192c1"
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/brain-dump-create-items" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"content":"Meeting with Acme Corp today. Need to follow up on API integration questions. Schedule demo for next week. Create documentation for the new feature. Update project timeline.","projectId":"6814e084a53a7ff5fb8192c1"}'
```

**Example Response:**
```json
{
  "tasks": [
    {
      "title": "Follow up on API integration questions",
      "status": "To Do",
      "priority": "high",
      "dueDate": "2025-05-09T00:00:00.000Z",
      "projectId": "6814e084a53a7ff5fb8192c1"
    },
    {
      "title": "Schedule demo for next week",
      "status": "To Do",
      "priority": "medium",
      "dueDate": "2025-05-10T00:00:00.000Z",
      "projectId": "6814e084a53a7ff5fb8192c1"
    },
    {
      "title": "Create documentation for the new feature",
      "status": "To Do",
      "priority": "medium",
      "dueDate": "2025-05-15T00:00:00.000Z",
      "projectId": "6814e084a53a7ff5fb8192c1"
    },
    {
      "title": "Update project timeline",
      "status": "To Do",
      "priority": "high",
      "dueDate": "2025-05-08T00:00:00.000Z",
      "projectId": "6814e084a53a7ff5fb8192c1"
    }
  ],
  "summary": "Meeting with Acme Corp occurred today. Action items include following up on API integration questions, scheduling a demo for next week, creating documentation for a new feature, and updating the project timeline."
}
```

---

## API Key Management

### Generate API Key

Generates a new API key (requires JWT authentication).

**Endpoint:** `POST /api-keys`
**Required Scope:** JWT authentication required

**Request Body:**
```json
{
  "name": "Task Integration",
  "scopes": ["read:tasks", "write:tasks", "read:projects"]
}
```

**Example Request:**
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/api-keys" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"name":"Task Integration","scopes":["read:tasks","write:tasks","read:projects"]}'
```

**Example Response:**
```json
{
  "message": "API Key generated successfully. Store it securely - it will not be shown again.",
  "name": "Task Integration",
  "prefix": "lc_sk_Afe4Q",
  "scopes": ["read:tasks", "write:tasks", "read:projects"],
  "createdAt": "2025-05-03T14:25:16.732Z",
  "apiKey": "lc_sk_Afe4QXcX1DIp0GDKfCRi6vtjCcP_Gj-gMbVGsN537Mc"
}
```

### List API Keys

Lists all API keys for the current user (requires JWT authentication).

**Endpoint:** `GET /api-keys`
**Required Scope:** JWT authentication required

**Example Request:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/api-keys" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
``` 