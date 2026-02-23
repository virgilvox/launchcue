# LaunchCue System Architecture

LaunchCue is a DevRel (Developer Relations) management platform for tracking
clients, projects, tasks, campaigns, notes, resources, calendar events, and
brain dumps. It is built as a single-page application backed by serverless
functions and a managed MongoDB database.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture](#3-backend-architecture)
4. [Authentication and Authorization](#4-authentication-and-authorization)
5. [Data Flow](#5-data-flow)
6. [Data Model](#6-data-model)
7. [AI Integration](#7-ai-integration)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Environment and Configuration](#9-environment-and-configuration)
10. [Security Measures](#10-security-measures)

---

## 1. System Overview

```
 +-------------+        +-------------------+        +--------------------+
 |             |  HTTPS  |                   |  HTTPS  |                    |
 |   Browser   +-------->+   Netlify CDN     +-------->+  Netlify Functions |
 |  (Vue SPA)  |<--------+  (Static Assets)  |<--------+   (Node.js 18)     |
 |             |         |                   |         |                    |
 +-------------+         +-------------------+         +---------+----------+
                                                                 |
                                                                 | MongoDB
                                                                 | Driver
                                                                 v
                                                       +--------------------+
                                                       |                    |
                                                       |  MongoDB Atlas     |
                                                       |  (Document DB)     |
                                                       |                    |
                                                       +--------------------+

                         +-------------------+
                         |                   |
                         |  Anthropic API    |  <-- Called from ai-process
                         |  (Claude)         |      function only
                         |                   |
                         +-------------------+
```

### Request Lifecycle

1. The browser loads the Vue SPA from Netlify's CDN (static `dist/` folder).
2. The SPA makes API calls to `/.netlify/functions/<name>` endpoints.
3. Netlify routes those calls to the corresponding serverless function.
4. Each function authenticates the request, queries MongoDB, and returns JSON.
5. For AI features, the `ai-process` function proxies requests to the Anthropic
   Messages API, keeping the API key server-side.

---

## 2. Frontend Architecture

### Technology Stack

| Layer         | Technology                                      |
|---------------|-------------------------------------------------|
| Framework     | Vue 3 (Composition API, `<script setup>`)       |
| State         | Pinia (typed stores)                             |
| Routing       | Vue Router 4 (history mode)                      |
| HTTP Client   | Axios (singleton `ApiService` class)             |
| Styling       | Tailwind CSS (indigo primary, class-based dark)  |
| Build         | Vite                                             |
| Toasts        | vue-toastification                               |
| Charts        | Chart.js + vue-chartjs                           |
| Rich Text     | Tiptap                                           |
| Types         | TypeScript (incremental, `allowJs: true`)        |

### Layer Diagram

```
+---------------------------------------------------------------------+
|                         Vue Router                                   |
|  (route guards check authStore.isAuthenticated before navigation)    |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                          Pages                                       |
|  src/pages/*.vue                                                     |
|  (Dashboard, Tasks, Projects, Clients, Calendar, Campaigns,         |
|   Notes, Resources, BrainDump, Settings, Team, auth/*)              |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                        Components                                    |
|  src/components/ui/         -- Reusable primitives (Badge, Card,     |
|                                FormInput, DataTable, ConfirmDialog,  |
|                                SkeletonLoader, EmptyState, etc.)     |
|  src/components/tasks/      -- TaskList, TaskForm, TaskFilters,      |
|                                TaskKanban                            |
|  src/components/dashboard/  -- Dashboard widgets                     |
|  src/components/brain-dump/ -- BrainDumpForm                         |
|  src/components/settings/   -- ApiKeyManager, WebhookManager,        |
|                                AuditLogViewer                        |
|  src/components/resource/   -- ResourceDialog                        |
|  src/components/            -- Modal, GlobalSearch, DefaultLayout     |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                     Pinia Stores (src/stores/*.ts)                    |
|  auth.ts    -- user, token, teams, RBAC computed props               |
|  task.ts    -- task CRUD, filtering                                  |
|  project.ts -- project CRUD                                         |
|  client.ts  -- client CRUD                                          |
|  calendar.ts-- calendar event CRUD                                   |
|  resource.ts-- resource CRUD                                        |
|  team.ts    -- team member management                                |
|  notification.js -- notification polling                             |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                   Services (src/services/*.ts)                        |
|  api.service.ts       -- Axios singleton, interceptors, retry logic  |
|  task.service.ts      -- Task API calls                              |
|  project.service.ts   -- Project API calls                           |
|  client.service.ts    -- Client API calls                            |
|  campaign.service.ts  -- Campaign API calls                          |
|  calendar.service.ts  -- Calendar API calls                          |
|  note.service.ts      -- Note API calls                              |
|  brain-dump.service.ts-- Brain dump + AI processing                  |
|  resource.service.ts  -- Resource API calls                          |
|  team.service.ts      -- Team management                             |
|  user.service.ts      -- Profile management                          |
|  apiKey.service.ts    -- API key management                          |
|  settings.service.ts  -- App settings                                |
|  comment.service.js   -- Comment threads                             |
|  notification.service.js -- Notification fetching                    |
|  auditLog.service.js  -- Audit log viewer                            |
|  webhook.service.js   -- Webhook management                          |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                     Axios HTTP Layer                                  |
|  - Request interceptor injects Bearer token from memory              |
|  - Response interceptor strips to .data                              |
|  - 401 triggers onUnauthorized callback -> auth store logout         |
|  - Automatic retry (3x) on 429, 502, 503, 504 with exponential      |
|    backoff and Retry-After header support                            |
+---------------------------------------------------------------------+
        |
        | HTTP (/.netlify/functions/<name>)
        v
     [Backend]
```

### Routing and Navigation Guards

The router (`src/router/index.ts`) uses `createWebHistory` for clean URLs.
All lazy-loaded page components are wrapped in dynamic `import()` for
code-splitting. A global `beforeEach` guard checks `meta.requiresAuth` and
redirects unauthenticated users to `/login`. Authenticated routes are nested
under `DefaultLayout`, which provides the sidebar and top navigation.

### Type System

TypeScript definitions live in `src/types/`:

- `models.ts` -- Entity interfaces (User, Team, Client, Project, Task,
  Campaign, Note, BrainDump, CalendarEvent, Resource, ApiKey, Comment,
  Notification, AuditLog, Webhook). All extend `Timestamped` and, where
  applicable, `SoftDeletable`.
- `enums.ts` -- Const objects + derived types for TaskStatus, TaskPriority,
  ProjectStatus, CampaignStatus, TeamRole, EventColor, NotificationType,
  ApiScope, InviteStatus.
- `api.ts` -- Request/response shapes (AuthResponse, LoginRequest,
  RegisterRequest, SwitchTeamRequest, SearchResult, etc.).
- `index.ts` -- Barrel re-exports.

---

## 3. Backend Architecture

### Technology Stack

| Concern        | Technology                       |
|----------------|----------------------------------|
| Runtime        | Node.js 18 (Netlify Functions)   |
| Module format  | CommonJS (`require`/`module.exports`) |
| Database       | MongoDB (via `mongodb` driver)   |
| Auth           | `jsonwebtoken`, `bcryptjs`       |
| Validation     | Zod                              |
| AI             | Anthropic Messages API (fetch)   |

### Function Layout

All 28 function files live flat (not nested) in `netlify/functions/`:

```
netlify/functions/
  ai-process.js            -- Anthropic Claude proxy
  api-keys.js              -- CRUD for API keys
  audit-logs.js            -- Audit log retrieval
  auth-change-password.js  -- Password change
  auth-forgot-password.js  -- Forgot password token generation
  auth-login.js            -- Email/password login -> JWT
  auth-logout.js           -- Logout / token revocation
  auth-register.js         -- Registration + default team creation
  auth-reset-password.js   -- Token-based password reset
  auth-switch-team.js      -- Switch active team context -> new JWT
  auth-verify-email.js     -- Email verification token check
  brain-dump-context.js    -- Fetch context for AI enrichment
  brain-dump-create-items.js -- Create tasks/events from AI output
  braindumps.js            -- Brain dump CRUD
  calendar-events.js       -- Calendar event CRUD
  campaigns.js             -- Campaign CRUD
  clients.js               -- Client CRUD
  comments.js              -- Comment threads on resources
  notes.js                 -- Note CRUD
  notifications.js         -- In-app notification CRUD
  project-detail.js        -- Single project with aggregated data
  projects.js              -- Project CRUD
  resources.js             -- Resource link CRUD
  search.js                -- Global text search across collections
  tasks.js                 -- Task CRUD with calendar sync
  teams.js                 -- Team CRUD, member/invite management
  user-profile.js          -- Profile read/update
  webhooks.js              -- Webhook CRUD
```

### Utility Modules

Shared utilities in `netlify/functions/utils/`:

```
utils/
  authHandler.js      -- authenticate(), authenticateWithJwt(),
                         authenticateWithApiKey(), revokeToken(),
                         generateJti(), requireRole()
  db.js               -- MongoDB connection pooling, index management
  response.js         -- createResponse(), createErrorResponse(),
                         handleOptionsRequest(), CORS headers
  errorHandler.js     -- withErrorHandling() wrapper (CORS, method
                         check, rate limit, error classification)
  rateLimit.js        -- MongoDB-backed rate limiting with TTL indexes
  softDelete.js       -- notDeleted filter, softDelete(), restoreDocument()
  pagination.js       -- getPaginationParams(), createPaginatedResponse()
  logger.js           -- Leveled logger (error/warn/info/debug),
                         production suppresses info/debug
  validateEnv.js      -- Cold-start env var validation (MONGODB_URI,
                         JWT_SECRET, production-only ALLOWED_ORIGINS)
  auditLog.js         -- Audit log recording helper
  webhookDispatcher.js-- Webhook event dispatching
  auth.js             -- Legacy auth utilities (deprecated)
```

### Standard Function Pattern

Every function follows this structure:

```javascript
const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const { z } = require('zod');

exports.handler = async function(event, context) {
  // 1. CORS preflight
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  // 2. Authentication (JWT or API Key)
  let authContext;
  try {
    authContext = await authenticate(event, {
      requiredScopes: event.httpMethod === 'GET'
        ? ['read:<resource>']
        : ['write:<resource>']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Unauthorized');
  }
  const { userId, teamId } = authContext;

  // 3. Method routing
  const { db } = await connectToDb();

  if (event.httpMethod === 'GET') {
    // ... query with { teamId, ...notDeleted }
  } else if (event.httpMethod === 'POST') {
    // ... Zod validation, insert
  } else if (event.httpMethod === 'PUT') {
    // ... Zod partial validation, update
  } else if (event.httpMethod === 'DELETE') {
    // ... soft delete
  }
};
```

### Database Connection Management

The `db.js` module maintains a singleton `MongoClient` that persists across
warm invocations of the same Lambda container. On cold start it:

1. Validates environment variables via `validateEnv()`.
2. Creates the `MongoClient` with configured timeouts (5s server selection,
   10s connect, 45s socket).
3. Ensures all indexes across every collection (users, teams, clients,
   projects, tasks, campaigns, notes, braindumps, calendarEvents, resources,
   apiKeys, teamInvites, comments, notifications, auditLogs -- including
   text search indexes on title/description/name/content fields).

---

## 4. Authentication and Authorization

LaunchCue supports two authentication methods: JWT tokens (for browser
sessions) and API Keys (for programmatic access). Both flow through a single
`authenticate()` function that returns a unified auth context.

### 4.1 Registration Flow

```
Browser                     auth-register.js              MongoDB
  |                              |                           |
  |  POST /auth-register         |                           |
  |  { name, email, password }   |                           |
  |----------------------------->|                           |
  |                              |  Zod validate             |
  |                              |  (min 10 chars, upper,    |
  |                              |   lower, digit, special)  |
  |                              |                           |
  |                              |  Check existing user      |
  |                              |-------------------------->|
  |                              |                           |
  |                              |  bcrypt hash (salt 10)    |
  |                              |  Insert user              |
  |                              |-------------------------->|
  |                              |                           |
  |                              |  Create default team      |
  |                              |  (user as 'owner')        |
  |                              |-------------------------->|
  |                              |                           |
  |                              |  Generate email           |
  |                              |  verification token       |
  |                              |-------------------------->|
  |                              |                           |
  |                              |  Sign JWT                 |
  |                              |  { userId, teamId, email, |
  |                              |    name, jti }            |
  |                              |  expires: 24h             |
  |                              |                           |
  |  { token, user,              |                           |
  |    currentTeamId }           |                           |
  |<-----------------------------|                           |
  |                              |                           |
  |  Store in sessionStorage     |                           |
  |  (token, user, teams,        |                           |
  |   currentTeam)               |                           |
```

### 4.2 Login Flow

```
Browser                     auth-login.js                MongoDB
  |                              |                          |
  |  POST /auth-login            |                          |
  |  { email, password }         |                          |
  |----------------------------->|                          |
  |                              |  Rate limit check        |
  |                              |  (5 per 15 min)          |
  |                              |                          |
  |                              |  Find user by email      |
  |                              |------------------------->|
  |                              |                          |
  |                              |  bcrypt.compare          |
  |                              |                          |
  |                              |  Find user's teams       |
  |                              |  Look up role in first   |
  |                              |  team's members array    |
  |                              |------------------------->|
  |                              |                          |
  |                              |  Sign JWT                |
  |                              |  { userId, teamId, role, |
  |                              |    email, name, jti }    |
  |                              |  expires: 24h            |
  |                              |                          |
  |  { token, user,              |                          |
  |    currentTeamId }           |                          |
  |<-----------------------------|                          |
  |                              |                          |
  |  auth store: setUserData()   |                          |
  |  auth store: loadUserTeams() |                          |
  |  sessionStorage.setItem(     |                          |
  |    'token', 'user',          |                          |
  |    'teams', 'currentTeam')   |                          |
```

### 4.3 JWT Lifecycle

- **Token ID (jti):** Every JWT includes a `jti` claim (16 random bytes, hex
  encoded) generated by `generateJti()`.
- **Expiry:** 24 hours (`TOKEN_EXPIRY = '24h'`).
- **Client-side expiry check:** The auth store decodes the JWT payload on
  `initAuth()` and compares `exp` against `Date.now()`. Expired tokens are
  cleared from sessionStorage without a server round-trip.
- **Revocation via blocklist:** On logout, the `jti` is inserted into the
  `tokenBlocklist` collection with an `expiresAt` field. A MongoDB TTL index
  automatically cleans up expired entries. On every authenticated request, if
  the JWT contains a `jti`, the server checks this collection. If the blocklist
  check fails (DB unreachable), the system **fails closed** -- treating the
  token as revoked.
- **Team switching:** `auth-switch-team` issues a new JWT with the target
  `teamId` and `role`, effectively replacing the old token. The frontend
  updates sessionStorage and triggers data reloads across all stores.

### 4.4 API Key Flow

```
                    API Key Authentication
                    ======================

1. Key Generation (POST /api-keys):
   - Generate 32 random bytes -> base64url encode
   - Prepend prefix: "lc_sk_" + base64url = full key
   - Store first 14 chars (prefix + 8) as lookup prefix
   - bcrypt hash the full key -> store as hashedKey
   - Return full key to user ONCE (never stored in plaintext)

2. Key Usage (any authenticated endpoint):

   Authorization: Bearer lc_sk_aBcDeFgH...

   authenticate()
     |
     +-- Detects "lc_sk_" prefix
     |
     +-- Extract lookup prefix (first 14 chars)
     |
     +-- Query apiKeys collection by { prefix }
     |
     +-- bcrypt.compare(fullKey, document.hashedKey)
     |
     +-- Check expiration (expiresAt field)
     |
     +-- Derive required scopes from HTTP method + resource:
     |     GET    -> read:<resource>
     |     POST   -> write:<resource>
     |     PUT    -> write:<resource>
     |     DELETE -> write:<resource>
     |
     +-- checkScopes(): every required scope must be present
     |   in the key's scopes array (or key has 'admin' or '*')
     |
     +-- Fire-and-forget: update lastUsedAt timestamp
     |
     +-- Return { userId, teamId, scopes, keyPrefix, authType: 'apiKey' }
```

### 4.5 RBAC (Role-Based Access Control)

Roles are stored in the `members` array of each team document:

| Role     | Permissions                                           |
|----------|-------------------------------------------------------|
| `owner`  | Full access, team deletion, member role changes       |
| `admin`  | Team management, all CRUD operations                  |
| `member` | Standard CRUD on team resources                       |
| `viewer` | Read-only access to team resources                    |

**Backend enforcement:** The `requireRole(authContext, allowedRoles)` function
throws a 403 if the user's role (from the JWT payload) is not in the allowed
list.

**Frontend enforcement:** The auth store exposes computed properties:

```typescript
const userRole = computed(() => user.value?.role || null)
const isOwner  = computed(() => userRole.value === 'owner')
const isAdmin  = computed(() => userRole.value === 'admin')
const canManageTeam = computed(() => ['owner', 'admin'].includes(userRole.value))
const canEdit  = computed(() => ['owner', 'admin', 'member'].includes(userRole.value))
const isViewer = computed(() => userRole.value === 'viewer')
```

Components conditionally render UI elements (edit buttons, delete actions,
settings tabs) based on these computed values.

### 4.6 API Key Scopes

Scopes follow a `read:<resource>` / `write:<resource>` pattern across all
resources: projects, tasks, clients, campaigns, notes, teams, resources,
calendar-events, braindumps, api-keys. The special scope `admin` or `*`
grants access to all resources.

---

## 5. Data Flow

### Typical User Action (e.g., Creating a Task)

```
User clicks          TaskForm.vue        taskStore         task.service.ts
"Save Task"              |                   |                   |
    |                    |                   |                   |
    +-- @submit -------->|                   |                   |
                         |                   |                   |
                         +-- createTask() -->|                   |
                                             |                   |
                                             +-- create(data) -->|
                                                                 |
                                                          apiService.post(
                                                            TASK_ENDPOINT,
                                                            taskData
                                                          )
                                                                 |
                                                                 v
                                                          Axios interceptor
                                                          injects Bearer token
                                                                 |
                                                                 v
                                                    POST /.netlify/functions/tasks
                                                                 |
                                                                 v
                                                          tasks.js handler
                                                                 |
                                                    +------------+------------+
                                                    |                         |
                                              handleOptionsRequest()    authenticate()
                                              (CORS preflight)         (JWT or API Key)
                                                                              |
                                                                              v
                                                                    Zod validation
                                                                    (TaskCreateSchema)
                                                                              |
                                                                              v
                                                                    connectToDb()
                                                                    db.collection('tasks')
                                                                      .insertOne(newTask)
                                                                              |
                                                                              v
                                                                    syncTaskWithCalendar()
                                                                    (creates calendar event
                                                                     if task has dueDate)
                                                                              |
                                                                              v
                                                                    createResponse(201, task)
                                                                              |
                                                                 <------------+
                                                                 |
                                             <-------------------+
                                             |
                         <-------------------+
                         |  Update local state
                         |  (push to tasks array)
    <--------------------+
    UI re-renders via
    Vue reactivity
```

### Data Isolation

Every document includes a `teamId` field. All queries filter by the
authenticated user's `teamId` (extracted from the JWT or API key document).
This ensures complete data isolation between teams without a separate
database per tenant.

---

## 6. Data Model

### MongoDB Collections

```
users               -- { email, name, password (bcrypt), emailVerified, ... }
teams               -- { name, owner, members: [{ userId, email, role, ... }] }
teamInvites         -- { email, teamId, invitedBy, status, role, expiresAt }
clients             -- { name, industry, contacts[], teamId, deletedAt, ... }
projects            -- { title, status, clientId, teamId, deletedAt, ... }
tasks               -- { title, status, priority, assigneeId, projectId,
                         teamId, checklist[], deletedAt, ... }
campaigns           -- { title, status, types[], steps[], metrics{}, teamId, ... }
notes               -- { title, content (HTML), tags[], teamId, deletedAt, ... }
braindumps          -- { title, content, tags[], teamId, ... }
calendarEvents      -- { title, start, end, allDay, recurrence{}, reminders[],
                         taskId, teamId, ... }
resources           -- { name, type, url, tags[], teamId, ... }
apiKeys             -- { prefix, hashedKey, scopes[], expiresAt, userId,
                         teamId, lastUsedAt }
comments            -- { resourceType, resourceId, userId, content, ... }
notifications       -- { userId, type, title, message, read, ... }
auditLogs           -- { userId, teamId, action, resourceType, resourceId,
                         changes{}, timestamp }
webhooks            -- { teamId, url, events[], secret, active, ... }
tokenBlocklist      -- { jti, revokedAt, expiresAt } (TTL auto-cleanup)
rateLimits          -- { key, createdAt, expiresAt } (TTL auto-cleanup)
emailVerifications  -- { userId, tokenHash, expiresAt }
```

### Soft Delete Pattern

Entities that support soft delete (clients, projects, tasks, campaigns, notes)
include `deletedAt` and `deletedBy` fields. The `softDelete.js` utility
provides:

- `notDeleted` -- A query filter `{ deletedAt: null }` applied to all list
  queries to exclude soft-deleted documents.
- `softDelete(collection, filter, userId)` -- Sets `deletedAt` to the current
  timestamp and `deletedBy` to the acting user's ID.
- `restoreDocument(collection, filter)` -- Resets both fields to `null`.

### Indexes

Indexes are ensured once per cold start in `db.js`. Key indexes include:

- `users.email` (unique)
- `teams.members.userId`
- `tasks.{teamId, projectId, status, dueDate, assigneeId}`
- `projects.{teamId, clientId, status, dueDate}`
- `apiKeys.prefix` (unique)
- `comments.{resourceType, resourceId}`
- `notifications.{userId + read, userId + createdAt}`
- `auditLogs.{teamId + timestamp, resourceType + resourceId}`
- Text search indexes on tasks, projects, clients, notes
  (title/description/name/content fields)

---

## 7. AI Integration

The `ai-process.js` function serves as a secure proxy to the Anthropic
Messages API. The Anthropic API key is stored exclusively as a server-side
environment variable (`ANTHROPIC_API_KEY`) and is never exposed to the client.

### Processing Types

| Type           | Behavior                                             |
|----------------|------------------------------------------------------|
| `summarize`    | Concise summary of input text                        |
| `keyPoints`    | Extract bullet-point key takeaways                   |
| `organize`     | Restructure into headings and bullets                |
| `actionItems`  | Generate action items + JSON array of tasks/events   |
| `meetingNotes` | Summary, decisions, action items + structured JSON   |
| `patterns`     | Identify themes and connections across context        |
| `creative`     | Creative expansion on input ideas                    |

### Context Enrichment

When `processingDetails.enriched` is true, the brain dump page fetches
existing context (clients, projects, tasks, meetings) from the
`brain-dump-context` endpoint and includes it in the prompt. The AI system
prompt is adjusted to consider conflicts, patterns, and opportunities relative
to existing data.

### Structured Output Parsing

The `parseAIResponse()` function extracts JSON from the AI response using
three strategies in order:

1. JSON inside a fenced code block (` ```json ... ``` `).
2. A bare JSON array pattern (`[ { ... } ]`).
3. The entire response as JSON.

Extracted items are normalized (type mapped to `task`, `event`, or `project`)
and returned alongside the text response.

### Model and Rate Limiting

- Default model: `claude-haiku-4-5-20251001`
- Default max tokens: 1500
- Rate limit: 10 requests per minute per user (AI category)

---

## 8. Key Design Decisions

### Serverless Architecture

All backend logic runs as Netlify Functions (AWS Lambda under the hood). There
are no long-running servers. The MongoDB driver maintains a connection pool
within each warm Lambda container via a module-level singleton. This approach
trades cold-start latency for zero infrastructure management.

### Flat Function Files

Function files are flat in `netlify/functions/` (not nested in subdirectories).
Netlify deploys each `.js` file as a separate function endpoint. The file name
becomes the URL path segment: `tasks.js` maps to
`/.netlify/functions/tasks`. Hyphenated names like `auth-login.js` map to
`/.netlify/functions/auth-login`. This keeps the mapping between filenames
and API endpoints unambiguous.

### Zod Validation

Every mutating endpoint validates request bodies using Zod schemas defined
alongside the handler. Schemas enforce types, string lengths, enum values,
and ObjectId format. Validation errors return structured error details via
`safeParse().error.format()`.

### Soft Delete Pattern

Destructive deletes are avoided. Instead, `deletedAt` and `deletedBy` fields
mark documents as deleted. All list queries include `{ deletedAt: null }` to
filter them out. This allows recovery and audit trails.

### sessionStorage for Tokens

Auth tokens and user data are stored in `sessionStorage` (not
`localStorage`). This means:

- Tokens are scoped to the browser tab/window.
- Closing the tab clears the session.
- Tokens are not shared across tabs (each tab has its own session).
- XSS impact is reduced compared to localStorage (attacker would need to be
  in the same tab context).

The `ApiService` class also keeps the token in memory (`this._token`) and
syncs it to sessionStorage. On page reload, the auth store reads from
sessionStorage and validates the token's `exp` claim client-side before
accepting it.

### Team-Scoped Multi-Tenancy

Rather than database-per-tenant, every document carries a `teamId` field and
every query filters by it. When a user switches teams, a new JWT is issued
with the new `teamId` and `role`, and all frontend stores reload their data.

### CORS Configuration

The `response.js` utility dynamically sets `Access-Control-Allow-Origin`
based on a whitelist. In development, `localhost:5173` (Vite) and
`localhost:8888` (Netlify CLI) are allowed. In production, the
`ALLOWED_ORIGINS` environment variable must be set; without it, all CORS
requests are denied.

### MongoDB Rate Limiting

Rate limiting is implemented via MongoDB documents with TTL indexes rather
than in-memory stores. This is necessary in a serverless environment where
Lambda containers are ephemeral and do not share memory. Three tiers exist:

| Category  | Max Requests | Window     |
|-----------|-------------|------------|
| `auth`    | 5           | 15 minutes |
| `general` | 100         | 1 minute   |
| `ai`      | 10          | 1 minute   |

Auth endpoints fail closed (block if DB unreachable). Other endpoints fail
open (allow if DB unreachable) to preserve availability.

---

## 9. Environment and Configuration

### Required Environment Variables

| Variable          | Purpose                          | Required |
|-------------------|----------------------------------|----------|
| `MONGODB_URI`     | MongoDB Atlas connection string  | Always   |
| `JWT_SECRET`      | JWT signing key (min 64 chars)   | Always   |
| `ALLOWED_ORIGINS` | Comma-separated origin whitelist | Prod     |
| `ANTHROPIC_API_KEY`| Anthropic API key for Claude    | For AI   |

### Build and Deploy Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  external_node_modules = ["jsonwebtoken", "mongodb", "bcryptjs", "zod"]
```

External node modules are bundled separately to avoid issues with Netlify's
default esbuild bundling of native/complex modules.

### Security Headers

All responses include:

- `Strict-Transport-Security` (HSTS with preload)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera, microphone, geolocation disabled)
- `Content-Security-Policy` (restricts script-src, connect-src, font-src, etc.)

### Caching

- `/assets/*` (Vite hashed output): `Cache-Control: public, max-age=31536000, immutable`
- `/index.html`: `Cache-Control: no-cache, no-store, must-revalidate`
- SPA fallback: `/* -> /index.html` with status 200

---

## 10. Security Measures

### Password Requirements

Enforced via Zod schema on registration:

- Minimum 10 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one digit
- At least one special character
- Hashed with bcrypt (salt rounds: 10)

### Token Security

- JWTs include a unique `jti` for revocation support.
- Token blocklist uses MongoDB TTL indexes for automatic cleanup.
- Blocklist checks fail closed (if DB is unreachable, token is treated as
  revoked).
- Client-side expiry checking prevents use of expired tokens without a
  server round-trip.

### API Key Security

- Full key is shown once at creation, then only the prefix is stored.
- Keys are bcrypt-hashed before storage.
- Scope-based access control limits key permissions.
- Optional expiration date with server-side enforcement.
- `lastUsedAt` tracking for key auditing.

### Input Validation

- All mutating endpoints validate request bodies with Zod schemas.
- ObjectId format is validated before MongoDB queries.
- Error details are suppressed in production (`safeErrorDetails()`).

### Error Handling

- Production error responses never leak stack traces or internal details.
- The `withErrorHandling()` wrapper classifies errors (Zod, BSON, duplicate
  key, JSON parse) and returns appropriate status codes.
- Unhandled promise rejections are caught at the Vue app level.

### Audit Trail

The `auditLog.js` utility records user actions (CRUD operations) with
before/after change diffs, enabling compliance and forensic analysis.
Audit logs are scoped to teams and indexed by `{teamId, timestamp}` and
`{resourceType, resourceId}`.
