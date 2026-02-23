# LaunchCue API Reference

Complete API reference for the LaunchCue DevRel management platform.

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Key Scopes](#api-key-scopes)
- [Error Format](#error-format)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Soft Delete](#soft-delete)
- [Endpoints](#endpoints)
  - [Auth](#auth)
  - [Tasks](#tasks)
  - [Projects](#projects)
  - [Clients](#clients)
  - [Campaigns](#campaigns)
  - [Notes](#notes)
  - [Resources](#resources)
  - [Calendar Events](#calendar-events)
  - [Brain Dumps](#brain-dumps)
  - [Comments](#comments)
  - [Notifications](#notifications)
  - [Teams](#teams)
  - [API Keys](#api-keys)
  - [Webhooks](#webhooks)
  - [Search](#search)
  - [AI Process](#ai-process)
  - [Audit Logs](#audit-logs)

---

## Overview

**Base URLs:**

| Environment  | URL                                                    |
|-------------|--------------------------------------------------------|
| Local Dev   | `http://localhost:8888/.netlify/functions`              |
| Production  | `https://launchcue.netlify.app/.netlify/functions`     |

All endpoint paths in this document are relative to the base URL. For example, `POST /auth-login` means `POST /.netlify/functions/auth-login`.

---

## Authentication

API requests can be authenticated in two ways:

### 1. JWT Token (User Session)

Obtained by calling `/auth-login` or `/auth-register`. Include it in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT tokens contain the user's `userId`, `teamId`, `role`, `email`, and `name`. Tokens expire after a configured duration and include a unique `jti` (JWT ID) for revocation support.

### 2. API Key (External Integrations)

Generated via the `/api-keys` endpoint. API keys use the prefix `lc_sk_` and are sent in the same `Authorization` header:

```
Authorization: Bearer lc_sk_YOUR_API_KEY_HERE
```

API keys are scoped -- they can only access endpoints matching their assigned scopes. Keys can have an optional expiration date. The full key is only shown once at creation time; afterwards only a prefix is visible.

---

## API Key Scopes

LaunchCue uses a granular scope-based permission system for API keys. Each resource has a read and write scope:

| Resource         | Read Scope              | Write Scope              |
|-----------------|-------------------------|--------------------------|
| Tasks           | `read:tasks`            | `write:tasks`            |
| Projects        | `read:projects`         | `write:projects`         |
| Clients         | `read:clients`          | `write:clients`          |
| Notes           | `read:notes`            | `write:notes`            |
| Teams           | `read:teams`            | `write:teams`            |
| Resources       | `read:resources`        | `write:resources`        |
| Campaigns       | `read:campaigns`        | `write:campaigns`        |
| Calendar Events | `read:calendar-events`  | `write:calendar-events`  |
| Brain Dumps     | `read:braindumps`       | `write:braindumps`       |
| API Keys        | `read:api-keys`         | `write:api-keys`         |

- `GET` requests require the `read:*` scope for the resource.
- `POST`, `PUT`, and `DELETE` requests require the `write:*` scope.

---

## Error Format

All errors follow a consistent JSON format:

```json
{
  "error": "Error message",
  "details": "Additional details or validation object"
}
```

The `details` field may be a string, an object (for Zod validation errors), or omitted entirely.

### HTTP Status Codes

| Code | Meaning                                                       |
|------|---------------------------------------------------------------|
| 200  | Request succeeded                                             |
| 201  | Resource created successfully                                 |
| 400  | Invalid request parameters or validation failure              |
| 401  | Authentication required or credentials invalid                |
| 403  | Insufficient permissions (wrong role or missing API key scope)|
| 404  | Resource not found                                            |
| 405  | HTTP method not allowed for this endpoint                     |
| 409  | Conflict (e.g., deleting a client with active projects)       |
| 429  | Rate limit exceeded                                           |
| 500  | Internal server error                                         |

### Example Error Responses

**Scope error (API key missing required scope):**
```json
{
  "error": "Forbidden",
  "details": "API key does not have sufficient permissions. Required scopes: read:teams"
}
```

**Validation error:**
```json
{
  "error": "Validation failed",
  "details": {
    "title": { "_errors": ["Title is required"] }
  }
}
```

---

## Rate Limiting

Three rate-limiting tiers are enforced, backed by MongoDB with TTL indexes (serverless-compatible):

| Tier      | Limit               | Applied To                                    |
|-----------|---------------------|-----------------------------------------------|
| `auth`    | 5 requests / 15 min | Login, register, forgot/reset password, email verification |
| `general` | 100 requests / min  | Standard CRUD endpoints                       |
| `ai`      | 10 requests / min   | AI processing (`/ai-process`)                 |

When the rate limit is exceeded, the API returns `429 Too Many Requests`:

```json
{
  "error": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": 42,
    "resetAt": "2026-02-22T14:30:00.000Z"
  }
}
```

- `retryAfter`: seconds until the rate limit resets.
- `resetAt`: ISO 8601 timestamp when the limit resets.

Rate limit keys are based on `userId` (when authenticated) or the client IP address (for unauthenticated endpoints like login/register).

---

## Pagination

Most list endpoints support optional pagination via query parameters:

| Parameter | Default | Max  | Description               |
|-----------|---------|------|---------------------------|
| `page`    | 1       | --   | Page number (1-based)     |
| `limit`   | 25      | 100  | Items per page            |

**Without pagination** (no `page` parameter): the endpoint returns a flat JSON array of all matching items.

**With pagination** (`?page=1&limit=20`): the endpoint returns a paginated envelope:

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 57,
    "totalPages": 3,
    "hasMore": true
  }
}
```

Endpoints that support pagination: Tasks, Clients, Campaigns, Brain Dumps, Notifications, Audit Logs.

---

## Soft Delete

Most resource endpoints use soft deletion instead of permanent removal:

- `DELETE` sets `deletedAt` (timestamp) and `deletedBy` (user ID) on the document.
- All `GET` queries filter out documents where `deletedAt` is not null.
- Documents can be restored by unsetting `deletedAt` and `deletedBy`.

Resources using soft delete: Tasks, Clients, Campaigns, Brain Dumps, Comments.

Resources using hard delete: Calendar Events, Notifications, Webhooks, API Keys, Teams.

---

## Endpoints

---

### Auth

Authentication endpoints handle user registration, login, team switching, password management, and email verification. Auth endpoints do not require prior authentication (except `auth-switch-team`). All auth endpoints are rate-limited under the `auth` tier (5 requests / 15 min).

---

#### Register

Creates a new user account and a default team.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth-register` |
| **Auth** | None |
| **Rate Limit** | `auth` (5 / 15 min) |

**Request Body:**

| Field      | Type   | Required | Description                                  |
|-----------|--------|----------|----------------------------------------------|
| `name`    | string | Yes      | User's display name (1-100 chars)            |
| `email`   | string | Yes      | Valid email address                          |
| `password`| string | Yes      | Min 10 chars, must include lowercase, uppercase, number, special char |

**Response (201):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "68147ed8a9b5c368514228bf",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "currentTeamId": "681495ef6ff5808e7029558b"
}
```

In non-production environments, the response also includes a `verificationToken` field for testing email verification.

---

#### Login

Authenticates a user and returns a JWT token.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth-login` |
| **Auth** | None |
| **Rate Limit** | `auth` (5 / 15 min) |

**Request Body:**

| Field      | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `email`   | string | Yes      | Registered email   |
| `password`| string | Yes      | Account password   |

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "68147ed8a9b5c368514228bf",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  },
  "currentTeamId": "681495ef6ff5808e7029558b"
}
```

---

#### Switch Team

Switches the user's active team context and issues a new JWT token.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth-switch-team` |
| **Auth** | JWT only |

**Request Body:**

| Field     | Type   | Required | Description                     |
|----------|--------|----------|---------------------------------|
| `teamId` | string | Yes      | Target team ID (must be a member) |

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "currentTeam": {
    "id": "681495ef6ff5808e7029558b",
    "name": "Acme Team",
    "role": "owner"
  }
}
```

The previous JWT is revoked upon successful switch.

---

#### Forgot Password

Initiates a password reset. Always returns a success message to avoid leaking whether an email exists.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth-forgot-password` |
| **Auth** | None |
| **Rate Limit** | `auth` (5 / 15 min) |

**Request Body:**

| Field   | Type   | Required | Description          |
|---------|--------|----------|----------------------|
| `email` | string | Yes      | Registered email     |

**Response (200):**

```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

In non-production environments, the response includes a `token` field. In production, the token would be sent via email (email integration not yet implemented).

---

#### Reset Password

Resets a user's password using the token from forgot-password.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/auth-reset-password` |
| **Auth** | None |
| **Rate Limit** | `auth` (5 / 15 min) |

**Request Body:**

| Field         | Type   | Required | Description                                  |
|--------------|--------|----------|----------------------------------------------|
| `token`      | string | Yes      | Reset token from forgot-password             |
| `newPassword`| string | Yes      | Min 10 chars, must include lowercase, uppercase, number, special char |

**Response (200):**

```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

Reset tokens expire after 1 hour and can only be used once.

---

#### Verify Email

Verifies a user's email address using the token generated at registration.

| | |
|---|---|
| **Method** | `GET` or `POST` |
| **Path** | `/auth-verify-email` |
| **Auth** | None |
| **Rate Limit** | `auth` (5 / 15 min) |

**GET:** Pass the token as a query parameter: `?token=abc123...`

**POST Request Body:**

| Field   | Type   | Required | Description            |
|---------|--------|----------|------------------------|
| `token` | string | Yes      | Verification token     |

**Response (200):**

```json
{
  "message": "Email has been verified successfully."
}
```

Verification tokens expire after 24 hours.

---

### Tasks

CRUD operations for tasks. Tasks are scoped to the authenticated user's team and auto-sync with calendar events when they have a due date.

---

#### List Tasks

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/tasks` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:tasks` |

**Query Parameters:**

| Parameter    | Type   | Description                                      |
|-------------|--------|--------------------------------------------------|
| `projectId` | string | Filter by project ID                             |
| `status`    | string | Filter by status: `To Do`, `In Progress`, `Blocked`, `Done` |
| `type`      | string | Filter by task type                              |
| `priority`  | string | Filter by priority: `low`, `medium`, `high`, `urgent` |
| `assigneeId`| string | Filter by assignee user ID                       |
| `page`      | number | Page number for pagination                       |
| `limit`     | number | Items per page (default 25, max 100)             |

**Response (200):** Array of task objects (or paginated envelope if `page` is provided).

```json
[
  {
    "id": "6814e8c52f109aacb22d79ee",
    "title": "Meeting with Client",
    "description": "Discuss project requirements",
    "status": "To Do",
    "type": "task",
    "priority": "medium",
    "assigneeId": null,
    "tags": [],
    "projectId": "6814e084a53a7ff5fb8192c1",
    "dueDate": "2025-05-20T00:00:00.000Z",
    "checklist": [
      { "title": "Prepare agenda", "completed": false }
    ],
    "teamId": "681495ef6ff5808e7029558b",
    "createdAt": "2025-05-02T15:46:13.089Z",
    "updatedAt": "2025-05-02T18:40:44.324Z",
    "createdBy": "68147ed8a9b5c368514228bf"
  }
]
```

---

#### Get Task

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/tasks/:taskId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:tasks` |

**Response (200):** Single task object.

---

#### Create Task

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/tasks` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:tasks` |

**Request Body:**

| Field        | Type     | Required | Description                                |
|-------------|----------|----------|--------------------------------------------|
| `title`     | string   | Yes      | Task title (1-200 chars)                   |
| `description`| string  | No       | Task description (max 5000 chars)          |
| `status`    | string   | No       | `To Do` (default), `In Progress`, `Blocked`, `Done` |
| `type`      | string   | No       | Task type (default: `task`)                |
| `priority`  | string   | No       | `low`, `medium` (default), `high`, `urgent`|
| `assigneeId`| string   | No       | User ID of assignee                        |
| `tags`      | string[] | No       | Array of tag strings                       |
| `projectId` | string   | No       | Associated project ID (validated)          |
| `dueDate`   | string   | No       | ISO 8601 datetime (nullable)               |
| `checklist` | object[] | No       | Array of `{ title, completed }` items      |

If `projectId` is provided, the server verifies the project exists and belongs to the same team.

**Response (201):** Created task object.

---

#### Update Task

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/tasks/:taskId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:tasks` |

**Request Body:** Partial task object. Any subset of the create fields. Immutable fields (`teamId`, `userId`, `createdAt`, `id`) are ignored.

**Response (200):** Updated task object.

---

#### Delete Task

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/tasks/:taskId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:tasks` |

Soft deletes the task and removes the associated calendar event (if any).

**Response (200):**

```json
{ "message": "Task deleted successfully" }
```

---

### Projects

CRUD operations for projects. Projects can be associated with a client.

---

#### List Projects

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/projects` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:projects` |

**Query Parameters:**

| Parameter  | Type   | Description            |
|-----------|--------|------------------------|
| `clientId`| string | Filter by client ID    |

**Response (200):** Array of project objects.

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

---

#### Get Project

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/projects/:projectId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:projects` |

**Response (200):** Single project object.

---

#### Create Project

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/projects` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:projects` |

**Request Body:**

| Field        | Type     | Required | Description                     |
|-------------|----------|----------|---------------------------------|
| `title`     | string   | Yes      | Project title                   |
| `description`| string  | No       | Project description             |
| `status`    | string   | No       | Project status                  |
| `clientId`  | string   | No       | Associated client ID            |
| `startDate` | string   | No       | ISO 8601 datetime               |
| `dueDate`   | string   | No       | ISO 8601 datetime               |
| `tags`      | string[] | No       | Array of tag strings            |

**Response (201):** Created project object.

---

#### Update Project

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/projects/:projectId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:projects` |

**Request Body:** Partial project object.

**Response (200):** Updated project object.

---

#### Delete Project

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/projects/:projectId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:projects` |

**Response (200):**

```json
{ "message": "Project deleted successfully" }
```

---

### Clients

CRUD operations for clients. Clients can have multiple contacts and are linked to projects.

---

#### List Clients

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/clients` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:clients` |

**Query Parameters:**

| Parameter | Type   | Description                       |
|----------|--------|-----------------------------------|
| `page`   | number | Page number for pagination        |
| `limit`  | number | Items per page (default 25, max 100) |

**Response (200):** Array of client objects with nested `contacts` array.

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
    "teamId": "681495ef6ff5808e7029558b",
    "createdAt": "2025-05-02T14:48:50.318Z",
    "updatedAt": "2025-05-02T16:49:00.944Z",
    "createdBy": "68147ed8a9b5c368514228bf"
  }
]
```

---

#### Get Client

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/clients/:clientId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:clients` |

**Response (200):** Single client object.

---

#### Create Client

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/clients` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

**Request Body:**

| Field          | Type     | Required | Description                      |
|---------------|----------|----------|----------------------------------|
| `name`        | string   | Yes      | Client name (1-200 chars)        |
| `industry`    | string   | No       | Industry (max 100 chars)         |
| `website`     | string   | No       | Valid URL                        |
| `description` | string   | No       | Description (max 5000 chars)     |
| `contactName` | string   | No       | Legacy contact name (max 100)    |
| `contactEmail`| string   | No       | Legacy contact email             |
| `contactPhone`| string   | No       | Legacy contact phone (max 50)    |
| `address`     | string   | No       | Address (max 500 chars)          |
| `notes`       | string   | No       | Notes (max 5000 chars)           |
| `contacts`    | object[] | No       | Array of contact objects         |

**Contact object:**

| Field       | Type    | Required | Description              |
|------------|---------|----------|--------------------------|
| `name`     | string  | Yes      | Contact name (1-200)     |
| `email`    | string  | No       | Valid email              |
| `phone`    | string  | No       | Phone (max 50)           |
| `role`     | string  | No       | Role (max 100)           |
| `isPrimary`| boolean | No       | Primary contact flag     |
| `notes`    | string  | No       | Notes (max 2000)         |

**Response (201):** Created client object.

---

#### Update Client

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/clients/:clientId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

**Request Body:** Partial client object.

**Response (200):** Updated client object.

---

#### Delete Client

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/clients/:clientId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

Cascade protection: returns `409 Conflict` if the client has active projects (not Completed or Cancelled). Complete or remove those projects first.

**Response (200):**

```json
{ "success": true, "message": "Client deleted" }
```

---

#### Add Contact to Client

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/clients/:clientId?action=addContact` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

**Request Body:**

| Field       | Type    | Required | Description          |
|------------|---------|----------|----------------------|
| `name`     | string  | Yes      | Contact name         |
| `email`    | string  | No       | Email address        |
| `phone`    | string  | No       | Phone number         |
| `role`     | string  | No       | Role / title         |
| `isPrimary`| boolean | No       | Primary contact flag |

**Response (201):** Created contact object with generated `id`.

---

#### Update Contact

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/clients/:clientId?action=updateContact&contactId=CONTACT_ID` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

**Request Body:** Partial contact fields to update.

**Response (200):** Updated contact object.

---

#### Delete Contact

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/clients/:clientId?action=deleteContact&contactId=CONTACT_ID` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:clients` |

**Response (200):**

```json
{ "success": true, "message": "Contact deleted" }
```

---

#### Get Contacts

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/clients/:clientId?action=getContacts` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:clients` |

**Response (200):** Array of contact objects for the client.

---

### Campaigns

CRUD operations for marketing/DevRel campaigns. Campaigns support steps, budgets, and metrics tracking.

---

#### List Campaigns

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/campaigns` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:campaigns` |

**Query Parameters:**

| Parameter   | Type   | Description                                    |
|------------|--------|------------------------------------------------|
| `clientId` | string | Filter by client ID                            |
| `projectId`| string | Filter by project ID                           |
| `status`   | string | Filter by status: `draft`, `active`, `paused`, `completed` |
| `page`     | number | Page number for pagination                     |
| `limit`    | number | Items per page (default 25, max 100)           |

**Response (200):** Array of campaign objects (or paginated envelope).

```json
[
  {
    "id": "681a2f5d2c441fae99b72a11",
    "title": "Developer Workshop Series",
    "description": "Monthly workshops for developers",
    "types": ["Workshop", "Docs"],
    "clientId": "6814db523a41d6e755521a91",
    "projectId": "6814e084a53a7ff5fb8192c1",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-12-31T00:00:00.000Z",
    "status": "draft",
    "budget": 5000,
    "metrics": {
      "reach": 0,
      "engagement": 0,
      "conversions": 0
    },
    "steps": [
      {
        "id": "681a2f5d2c441fae99b72a12",
        "title": "Create landing page",
        "description": "Design and build event landing page",
        "date": "2025-06-01T00:00:00.000Z",
        "assigneeId": null
      }
    ],
    "teamId": "681495ef6ff5808e7029558b",
    "userId": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-04T10:15:25.481Z",
    "updatedAt": "2025-05-04T10:15:25.481Z"
  }
]
```

---

#### Get Campaign

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/campaigns/:campaignId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:campaigns` |

**Response (200):** Single campaign object.

---

#### Create Campaign

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/campaigns` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:campaigns` |

**Request Body:**

| Field        | Type     | Required | Description                                       |
|-------------|----------|----------|---------------------------------------------------|
| `title`     | string   | Yes      | Campaign title (1-200 chars)                      |
| `description`| string  | No       | Campaign description                              |
| `types`     | string[] | No       | Content types (e.g., `["Docs", "Blog"]`)          |
| `clientId`  | string   | No       | Associated client ID (validated)                  |
| `projectId` | string   | No       | Associated project ID (validated)                 |
| `startDate` | string   | No       | ISO 8601 datetime                                 |
| `endDate`   | string   | No       | ISO 8601 datetime                                 |
| `status`    | string   | No       | `draft` (default), `active`, `paused`, `completed`|
| `budget`    | number   | No       | Budget amount (min 0)                             |
| `metrics`   | object   | No       | `{ reach, engagement, conversions }` (all numbers)|
| `steps`     | object[] | No       | Array of step objects (see below)                 |

**Step object:**

| Field         | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| `title`      | string | Yes      | Step title               |
| `description`| string | No       | Step description         |
| `date`       | string | Yes      | ISO 8601 datetime        |
| `assigneeId` | string | No       | Assigned user ID         |

**Response (201):** Created campaign object.

---

#### Update Campaign

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/campaigns/:campaignId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:campaigns` |

**Request Body:** Partial campaign object.

**Response (200):** Updated campaign object.

---

#### Delete Campaign

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/campaigns/:campaignId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:campaigns` |

**Response (200):**

```json
{ "message": "Campaign deleted successfully" }
```

---

### Notes

CRUD operations for notes. Notes support Markdown/rich text content, tags, and linking to clients and projects.

---

#### List Notes

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/notes` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:notes` |

**Query Parameters:**

| Parameter   | Type   | Description             |
|------------|--------|-------------------------|
| `clientId` | string | Filter by client ID     |
| `projectId`| string | Filter by project ID    |
| `tag`      | string | Filter by tag           |

**Response (200):** Array of note objects.

```json
[
  {
    "id": "6814f5be2f3b3244f4322047",
    "title": "Meeting Notes - Project Kickoff",
    "content": "# Project Kickoff Meeting\n\n- Discussed timeline...",
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

---

#### Get Note

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/notes/:noteId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:notes` |

**Response (200):** Single note object.

---

#### Create Note

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/notes` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

**Request Body:**

| Field        | Type     | Required | Description               |
|-------------|----------|----------|---------------------------|
| `title`     | string   | Yes      | Note title                |
| `content`   | string   | No       | Note content (Markdown)   |
| `tags`      | string[] | No       | Array of tag strings      |
| `clientId`  | string   | No       | Associated client ID      |
| `projectId` | string   | No       | Associated project ID     |

**Response (201):** Created note object.

---

#### Update Note

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/notes/:noteId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

**Request Body:** Partial note object.

**Response (200):** Updated note object.

---

#### Delete Note

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/notes/:noteId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

**Response (200):**

```json
{ "message": "Note deleted successfully" }
```

---

### Resources

CRUD operations for resource links and files.

---

#### List Resources

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/resources` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:resources` |

**Response (200):** Array of resource objects.

---

#### Get Resource

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/resources/:resourceId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:resources` |

**Response (200):** Single resource object.

---

#### Create Resource

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/resources` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:resources` |

**Request Body:**

| Field        | Type     | Required | Description               |
|-------------|----------|----------|---------------------------|
| `title`     | string   | Yes      | Resource title            |
| `url`       | string   | No       | Resource URL              |
| `type`      | string   | No       | Resource type             |
| `description`| string  | No       | Description               |
| `tags`      | string[] | No       | Array of tags             |
| `clientId`  | string   | No       | Associated client ID      |
| `projectId` | string   | No       | Associated project ID     |

**Response (201):** Created resource object.

---

#### Update Resource

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/resources/:resourceId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:resources` |

**Request Body:** Partial resource object.

**Response (200):** Updated resource object.

---

#### Delete Resource

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/resources/:resourceId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:resources` |

**Response (200):**

```json
{ "message": "Resource deleted successfully" }
```

---

### Calendar Events

CRUD operations for calendar events. Supports recurring events with daily, weekly, monthly, and yearly frequency. Tasks with due dates auto-sync as calendar events.

---

#### List Calendar Events

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/calendar-events` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:calendar-events` |

**Query Parameters:**

| Parameter   | Type   | Description                                        |
|------------|--------|----------------------------------------------------|
| `start`    | string | ISO date -- filter events starting on or after     |
| `end`      | string | ISO date -- filter events ending on or before      |
| `clientId` | string | Filter by client ID                                |
| `projectId`| string | Filter by project ID                               |

When both `start` and `end` are provided, recurring events are expanded into individual occurrences within that range.

**Response (200):** Array of event objects.

```json
[
  {
    "id": "681b3f5d2c441fae99b72a22",
    "title": "Weekly Standup",
    "start": "2025-06-01T09:00:00.000Z",
    "end": "2025-06-01T09:30:00.000Z",
    "allDay": false,
    "description": "Team standup meeting",
    "color": "blue",
    "clientId": null,
    "projectId": null,
    "recurrence": {
      "frequency": "weekly",
      "interval": 1,
      "endDate": "2025-12-31T00:00:00.000Z"
    },
    "reminders": [
      { "type": "inApp", "minutesBefore": 15 }
    ],
    "teamId": "681495ef6ff5808e7029558b",
    "userId": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-04T10:15:25.481Z",
    "updatedAt": "2025-05-04T10:15:25.481Z"
  }
]
```

---

#### Get Calendar Event

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/calendar-events/:eventId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:calendar-events` |

**Response (200):** Single event object.

---

#### Create Calendar Event

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/calendar-events` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:calendar-events` |

**Request Body:**

| Field        | Type     | Required | Description                           |
|-------------|----------|----------|---------------------------------------|
| `title`     | string   | Yes      | Event title (1-200 chars)             |
| `start`     | string   | Yes      | ISO 8601 datetime                     |
| `end`       | string   | No       | ISO 8601 datetime                     |
| `allDay`    | boolean  | No       | All-day event (default: `false`)      |
| `description`| string  | No       | Event description                     |
| `color`     | string   | No       | Display color (e.g., `blue`, `green`) |
| `clientId`  | string   | No       | Associated client ID (validated)      |
| `projectId` | string   | No       | Associated project ID (validated)     |
| `recurrence`| object   | No       | Recurrence configuration (see below)  |
| `reminders` | object[] | No       | Array of reminder objects (see below) |

**Recurrence object:**

| Field       | Type   | Required | Description                                  |
|------------|--------|----------|----------------------------------------------|
| `frequency`| string | Yes      | `daily`, `weekly`, `monthly`, `yearly`       |
| `interval` | number | No       | Repeat every N periods (default: 1)          |
| `endDate`  | string | No       | ISO 8601 datetime when recurrence ends       |

**Reminder object:**

| Field           | Type   | Required | Description                   |
|----------------|--------|----------|-------------------------------|
| `type`         | string | Yes      | `email` or `inApp`           |
| `minutesBefore`| number | Yes      | Minutes before the event      |

**Response (201):** Created event object.

---

#### Update Calendar Event

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/calendar-events/:eventId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:calendar-events` |

**Request Body:** Partial event object.

**Response (200):** Updated event object.

---

#### Delete Calendar Event

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/calendar-events/:eventId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:calendar-events` |

Hard deletes the event (not soft delete).

**Response (200):**

```json
{ "message": "Event deleted successfully" }
```

---

### Brain Dumps

CRUD operations for brain dumps -- raw text entries that can be processed by AI into structured tasks and insights.

---

#### List Brain Dumps

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/braindumps` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:braindumps` |

**Query Parameters:**

| Parameter | Type   | Description                       |
|----------|--------|-----------------------------------|
| `page`   | number | Page number for pagination        |
| `limit`  | number | Items per page (default 25, max 100) |

**Response (200):** Array of brain dump objects (or paginated envelope).

```json
[
  {
    "id": "681c4f5d2c441fae99b72a33",
    "title": "Meeting thoughts",
    "content": "Need to follow up on API integration...",
    "tags": ["meeting"],
    "clientId": null,
    "projectId": "6814e084a53a7ff5fb8192c1",
    "teamId": "681495ef6ff5808e7029558b",
    "userId": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-04T10:15:25.481Z",
    "updatedAt": "2025-05-04T10:15:25.481Z"
  }
]
```

---

#### Get Brain Dump

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/braindumps/:dumpId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:braindumps` |

**Response (200):** Single brain dump object.

---

#### Create Brain Dump

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/braindumps` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:braindumps` |

**Request Body:**

| Field        | Type     | Required | Description                       |
|-------------|----------|----------|-----------------------------------|
| `title`     | string   | Yes      | Brain dump title (1-200 chars)    |
| `content`   | string   | No       | Raw text content                  |
| `tags`      | string[] | No       | Array of tag strings              |
| `clientId`  | string   | No       | Associated client ID              |
| `projectId` | string   | No       | Associated project ID             |

**Response (201):** Created brain dump object.

---

#### Update Brain Dump

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/braindumps/:dumpId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:braindumps` |

**Request Body:** Partial brain dump object.

**Response (200):** Updated brain dump object.

---

#### Delete Brain Dump

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/braindumps/:dumpId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:braindumps` |

**Response (200):**

```json
{ "message": "Brain dump deleted successfully" }
```

---

### Comments

Comments can be attached to tasks, projects, clients, or notes. Users can only edit or delete their own comments.

---

#### List Comments

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/comments` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:notes` |

**Query Parameters:**

| Parameter      | Type   | Description                                      |
|---------------|--------|--------------------------------------------------|
| `resourceType`| string | Filter by resource type: `task`, `project`, `client`, `note` |
| `resourceId`  | string | Filter by resource ID                            |

When both `resourceType` and `resourceId` are provided, comments are sorted chronologically (oldest first). Without filters, it returns the 20 most recent comments (feed mode, newest first).

**Response (200):** Array of comment objects.

```json
[
  {
    "id": "681d5f5d2c441fae99b72a44",
    "resourceType": "task",
    "resourceId": "6814e8c52f109aacb22d79ee",
    "userId": "68147ed8a9b5c368514228bf",
    "userName": "John Doe",
    "content": "Started working on this today.",
    "createdAt": "2025-05-04T10:15:25.481Z",
    "updatedAt": "2025-05-04T10:15:25.481Z"
  }
]
```

---

#### Create Comment

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/comments` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

**Request Body:**

| Field          | Type   | Required | Description                                      |
|---------------|--------|----------|--------------------------------------------------|
| `resourceType`| string | Yes      | `task`, `project`, `client`, or `note`           |
| `resourceId`  | string | Yes      | ID of the resource to attach the comment to      |
| `content`     | string | Yes      | Comment text (1-5000 chars)                      |

**Response (201):** Created comment object with `userName` resolved.

---

#### Update Comment

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/comments/:commentId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

Only the comment author can update their comment. Returns `403` if you try to edit someone else's comment.

**Request Body:**

| Field     | Type   | Required | Description                 |
|----------|--------|----------|-----------------------------|
| `content`| string | Yes      | Updated content (1-5000)    |

**Response (200):** Updated comment object.

---

#### Delete Comment

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/comments/:commentId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:notes` |

Only the comment author can delete their comment. Returns `403` if you try to delete someone else's comment. Uses soft delete.

**Response (200):**

```json
{ "message": "Comment deleted successfully" }
```

---

### Notifications

In-app notifications for events such as task assignments, deadline reminders, team invites, mentions, and comments.

---

#### List Notifications

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/notifications` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:teams` |

Returns notifications for the authenticated user only.

**Query Parameters:**

| Parameter    | Type    | Description                                 |
|-------------|---------|---------------------------------------------|
| `unreadOnly`| string  | Set to `"true"` to show only unread         |
| `limit`     | number  | Max notifications to return (default 20)    |
| `page`      | number  | Page number for pagination                  |

**Response (200):** Array of notification objects (or paginated envelope).

```json
[
  {
    "id": "681e6f5d2c441fae99b72a55",
    "userId": "68147ed8a9b5c368514228bf",
    "type": "task_assigned",
    "title": "Task Assigned",
    "message": "You have been assigned to 'API Documentation'",
    "read": false,
    "resourceType": "task",
    "resourceId": "6814e8c52f109aacb22d79ee",
    "createdAt": "2025-05-04T10:15:25.481Z"
  }
]
```

**Notification types:** `task_assigned`, `deadline_approaching`, `team_invite`, `mention`, `comment`.

---

#### Mark Notification as Read

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/notifications/:notificationId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

Marks a single notification as read.

**Response (200):** Updated notification object with `read: true`.

---

#### Mark All Notifications as Read

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/notifications?action=markAllRead` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

**Response (200):**

```json
{
  "message": "All notifications marked as read",
  "modified": 5
}
```

---

#### Delete Notification

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/notifications/:notificationId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

Hard deletes the notification.

**Response (200):**

```json
{ "message": "Notification deleted successfully" }
```

---

### Teams

Team management including creating teams, inviting members, managing roles, and leaving teams. LaunchCue uses RBAC with four roles: `owner`, `admin`, `member`, `viewer`.

---

#### List Teams

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/teams` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:teams` |

Returns all teams the authenticated user is a member of.

**Response (200):** Array of team objects.

```json
[
  {
    "id": "681495ef6ff5808e7029558b",
    "name": "Acme Team",
    "owner": "68147ed8a9b5c368514228bf",
    "createdAt": "2025-05-02T12:35:11.456Z",
    "members": [
      {
        "userId": "68147ed8a9b5c368514228bf",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "owner",
        "joinedAt": "2025-05-02T12:35:11.456Z"
      }
    ]
  }
]
```

---

#### Get Team

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/teams/:teamId` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:teams` |

Returns details for a specific team (user must be a member). Member details are enriched with user profile data.

**Response (200):** Single team object with populated member details.

---

#### Get Team Members

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/teams/:teamId?action=members` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:teams` |

Returns only the members array for a team.

**Response (200):** Array of member objects.

---

#### Create Team

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/teams` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

**Request Body:**

| Field  | Type   | Required | Description               |
|--------|--------|----------|---------------------------|
| `name` | string | Yes      | Team name (1-100 chars)   |

The authenticated user is automatically added as the team `owner`.

**Response (201):** Created team object.

---

#### Update Team

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/teams/:teamId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

Only the team owner can update team details.

**Request Body:**

| Field  | Type   | Required | Description               |
|--------|--------|----------|---------------------------|
| `name` | string | Yes      | Updated team name         |

**Response (200):** Updated team object.

---

#### Delete Team

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/teams/:teamId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

Only the team owner can delete the team. Hard deletes the team document.

**Response (200):**

```json
{ "message": "Team deleted successfully" }
```

---

#### Invite Member

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/teams/:teamId?action=invite` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |
| **Role Required** | `owner` or `admin` |

Adds a user to the team by email. The user must already have a LaunchCue account.

**Request Body:**

| Field   | Type   | Required | Description                  |
|---------|--------|----------|------------------------------|
| `email` | string | Yes      | Email of user to invite      |

**Response (200):**

```json
{
  "message": "User added to team successfully",
  "member": {
    "userId": "68147ed8a9b5c368514228bf",
    "email": "newmember@example.com",
    "name": "Jane Smith",
    "role": "member",
    "joinedAt": "2025-05-04T10:15:25.481Z"
  }
}
```

---

#### Update Member Role

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/teams/:teamId?action=updateRole` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |
| **Role Required** | `owner` or `admin` |

Changes a team member's role. Constraints:
- Cannot change your own role.
- Only `owner` can promote to `admin` or `owner`.
- Cannot demote the last `owner`.
- `admin` cannot change roles of other admins or the owner.

**Request Body:**

| Field      | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `memberId`| string | Yes      | User ID of the member to update                |
| `newRole` | string | Yes      | `owner`, `admin`, `member`, or `viewer`        |

**Response (200):**

```json
{
  "message": "Member role updated to admin",
  "memberId": "68147ed8a9b5c368514228bf",
  "newRole": "admin"
}
```

---

#### Leave Team

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/teams/:teamId/leave` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:teams` |

Removes the authenticated user from the team. Team owners cannot leave; they must delete the team or transfer ownership first.

**Response (200):**

```json
{ "message": "You have successfully left the team" }
```

---

### API Keys

Manage API keys for external integrations. API key management endpoints require authentication (JWT or API Key with the `api-keys` scope).

---

#### List API Keys

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api-keys` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:api-keys` |

Returns all API keys for the authenticated user in the current team. The hashed key is never returned.

**Response (200):**

```json
[
  {
    "id": "681f7f5d2c441fae99b72a66",
    "name": "CI/CD Integration",
    "prefix": "lc_sk_Afe4Q",
    "scopes": ["read:tasks", "write:tasks", "read:projects"],
    "expiresAt": "2026-06-01T00:00:00.000Z",
    "createdAt": "2025-05-03T14:25:16.732Z",
    "lastUsedAt": "2025-05-04T09:12:00.000Z"
  }
]
```

---

#### Create API Key

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api-keys` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:api-keys` |

Generates a new API key. The full key is returned **only once** in the response.

**Request Body:**

| Field       | Type     | Required | Description                                  |
|------------|----------|----------|----------------------------------------------|
| `name`     | string   | Yes      | Key name (1-100 chars)                       |
| `scopes`   | string[] | No       | Array of scopes (defaults to `read:projects`, `read:tasks`, `read:clients`) |
| `expiresAt`| string   | No       | ISO 8601 datetime for key expiration         |

**Response (201):**

```json
{
  "message": "API Key generated successfully. Store it securely - it will not be shown again.",
  "name": "CI/CD Integration",
  "prefix": "lc_sk_Afe4Q",
  "scopes": ["read:tasks", "write:tasks", "read:projects"],
  "expiresAt": null,
  "createdAt": "2025-05-03T14:25:16.732Z",
  "apiKey": "lc_sk_Afe4QXcX1DIp0GDKfCRi6vtjCcP_Gj-gMbVGsN537Mc"
}
```

---

#### Delete API Key

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api-keys/:keyPrefix` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:api-keys` |

Deletes an API key by its prefix. The key must belong to the authenticated user and team.

**Response (200):**

```json
{ "message": "API Key deleted successfully" }
```

---

### Webhooks

Configure outgoing webhooks that fire when events occur in LaunchCue. Webhooks are scoped to the team.

**Available webhook events:**

| Event                  | Triggered When                  |
|-----------------------|---------------------------------|
| `task.created`        | A task is created               |
| `task.updated`        | A task is updated               |
| `task.deleted`        | A task is deleted               |
| `project.created`     | A project is created            |
| `project.updated`     | A project is updated            |
| `project.deleted`     | A project is deleted            |
| `client.created`      | A client is created             |
| `client.updated`      | A client is updated             |
| `client.deleted`      | A client is deleted             |
| `campaign.created`    | A campaign is created           |
| `campaign.updated`    | A campaign is updated           |

---

#### List Webhooks

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/webhooks` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:api-keys` |

**Response (200):**

```json
[
  {
    "id": "682a8f5d2c441fae99b72a77",
    "url": "https://example.com/webhook",
    "events": ["task.created", "task.updated"],
    "active": true,
    "secretMask": "a1b2c3d4...",
    "createdAt": "2025-05-04T10:15:25.481Z",
    "updatedAt": "2025-05-04T10:15:25.481Z"
  }
]
```

---

#### Create Webhook

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/webhooks` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:api-keys` |

**Request Body:**

| Field    | Type     | Required | Description                                  |
|---------|----------|----------|----------------------------------------------|
| `url`   | string   | Yes      | Webhook delivery URL (valid URL)             |
| `events`| string[] | Yes      | Array of events to subscribe to              |
| `secret`| string   | No       | Signing secret (min 16 chars; auto-generated if omitted) |
| `active`| boolean  | No       | Whether the webhook is active (default: `true`) |

The full `secret` is returned **only once** at creation time.

**Response (201):**

```json
{
  "id": "682a8f5d2c441fae99b72a77",
  "url": "https://example.com/webhook",
  "events": ["task.created", "task.updated"],
  "active": true,
  "secret": "full-secret-shown-only-once",
  "createdAt": "2025-05-04T10:15:25.481Z",
  "updatedAt": "2025-05-04T10:15:25.481Z"
}
```

---

#### Update Webhook

| | |
|---|---|
| **Method** | `PUT` |
| **Path** | `/webhooks/:webhookId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:api-keys` |

**Request Body:** Partial webhook object. The `secret`, `teamId`, and `userId` fields cannot be changed via update.

| Field    | Type     | Required | Description                   |
|---------|----------|----------|-------------------------------|
| `url`   | string   | No       | Updated delivery URL          |
| `events`| string[] | No       | Updated event subscriptions   |
| `active`| boolean  | No       | Enable or disable the webhook |

**Response (200):** Updated webhook object (secret is masked).

---

#### Delete Webhook

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/webhooks/:webhookId` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:api-keys` |

Hard deletes the webhook.

**Response (200):**

```json
{ "message": "Webhook deleted successfully" }
```

---

### Search

Cross-resource search across tasks, projects, clients, notes, and campaigns.

---

#### Search Resources

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/search` |
| **Auth** | JWT or API Key |
| **Scopes** | None (scope check skipped; results are scoped to the user's team) |

**Query Parameters:**

| Parameter | Type   | Required | Description                                     |
|----------|--------|----------|-------------------------------------------------|
| `q`      | string | Yes      | Search query (min 2 characters)                 |
| `types`  | string | No       | Comma-separated list of types to search: `tasks`, `projects`, `clients`, `notes`, `campaigns` |

**Searchable fields by type:**

| Type       | Fields Searched                   |
|-----------|-----------------------------------|
| `tasks`   | `title`, `description`            |
| `projects`| `title`, `description`            |
| `clients` | `name`, `description`, `industry` |
| `notes`   | `title`, `content`                |
| `campaigns`| `title`, `description`           |

Returns up to 5 results per collection and 20 total results.

**Response (200):**

```json
{
  "results": [
    {
      "type": "task",
      "id": "6814e8c52f109aacb22d79ee",
      "title": "API Documentation Review",
      "description": "Review and update API docs",
      "status": "To Do",
      "matchField": "title"
    },
    {
      "type": "client",
      "id": "6814db523a41d6e755521a91",
      "title": "Thistle Technologies",
      "description": "IoT device manufacturer",
      "matchField": "name"
    }
  ]
}
```

---

### AI Process

Processes text through Claude AI for summarization, key point extraction, organizing, action item generation, meeting note processing, pattern analysis, and creative expansion.

---

#### Process Text with AI

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/ai-process` |
| **Auth** | JWT or API Key |
| **Scopes** | `write:braindumps` |
| **Rate Limit** | `ai` (10 / min) |

**Request Body:**

| Field               | Type   | Required | Description                                  |
|--------------------|--------|----------|----------------------------------------------|
| `prompt`           | string | Yes      | The input text to process                    |
| `processingDetails`| object | Yes      | Processing configuration (see below)         |
| `model`            | string | No       | Claude model to use (default: `claude-haiku-4-5-20251001`) |
| `max_tokens`       | number | No       | Max response tokens (default: 1500)          |

**`processingDetails` object:**

| Field      | Type    | Required | Description                                    |
|-----------|---------|----------|------------------------------------------------|
| `type`    | string  | Yes      | Processing type (see table below)              |
| `context` | string  | No       | Additional context to inform the AI            |
| `enriched`| boolean | No       | Use enriched system prompt with context awareness (default: `false`) |

**Processing types:**

| Type            | Description                                           |
|----------------|-------------------------------------------------------|
| `summarize`    | Summarize text concisely                              |
| `keyPoints`    | Extract key points as a list                          |
| `organize`     | Restructure text with headings and bullets            |
| `actionItems`  | Extract action items as tasks (returns structured JSON)|
| `meetingNotes` | Process meeting notes with summary, decisions, actions|
| `patterns`     | Identify patterns and themes across text and context  |
| `creative`     | Creative expansion of ideas                           |

**Response (200):**

```json
{
  "response": "Processed text output from the AI...",
  "structuredData": [
    {
      "title": "Follow up on API integration",
      "description": "Contact client about API questions",
      "type": "task",
      "dueDate": "2025-05-09",
      "priority": "high"
    }
  ]
}
```

For `actionItems` and `meetingNotes` types, the `structuredData` array contains parsed task/event objects. Item types are normalized to `task`, `event`, or `project`.

---

### Audit Logs

Read-only access to the team's audit log. Actions across the platform (team member changes, resource CRUD) are logged automatically.

---

#### List Audit Logs

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/audit-logs` |
| **Auth** | JWT or API Key |
| **Scopes** | `read:teams` |

Always returns paginated results.

**Query Parameters:**

| Parameter      | Type   | Description                          |
|---------------|--------|--------------------------------------|
| `resourceType`| string | Filter by resource type (e.g., `team`, `teamMember`) |
| `resourceId`  | string | Filter by resource ID                |
| `userId`      | string | Filter by user who performed the action |
| `action`      | string | Filter by action: `create`, `update`, `delete` |
| `page`        | number | Page number (default: 1)             |
| `limit`       | number | Items per page (default: 25, max: 100) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "682b9f5d2c441fae99b72a88",
      "teamId": "681495ef6ff5808e7029558b",
      "userId": "68147ed8a9b5c368514228bf",
      "action": "create",
      "resourceType": "teamMember",
      "resourceId": "68147ed8a9b5c368514228c0",
      "changes": {
        "email": { "to": "newmember@example.com" },
        "role": { "to": "member" }
      },
      "timestamp": "2025-05-04T10:15:25.481Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "totalPages": 2,
    "hasMore": true
  }
}
```
