# LaunchCue System Architecture

LaunchCue is a DevRel (Developer Relations) management platform for tracking
clients, projects, tasks, campaigns, notes, resources, calendar events, and
brain dumps. It is built as a Vue 3 SPA backed by Supabase (PostgreSQL, Auth,
Realtime) and an Express API server for AI, webhooks, and email.

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

---

## 1. System Overview

```
                              +---------------------+
                              |                     |
                              |   Anthropic API     |
                              |   (Claude)          |
                              |                     |
                              +---------^-----------+
                                        |
                                        | AI requests only
                                        |
+-------------+        +---------------+---------------+
|             |  HTTPS  |                               |
|   Browser   +-------->+   Express API Server          |
|  (Vue SPA)  |<--------+   (Node.js, port 3001)       |
|             |   /api   |   - /api/ai                  |
+------+------+         |   - /api/webhooks             |
       |                |   - /api/email                |
       |                +---------------+---------------+
       |                                |
       |  Supabase JS Client            | Supabase Service Role
       |                                |
       v                                v
+------+--------------------------------+---------------+
|                                                       |
|                    Supabase Stack                      |
|                                                       |
|  +-------------+  +-----------+  +-----------+        |
|  |             |  |           |  |           |        |
|  |  Kong       |  |  GoTrue   |  | Realtime  |        |
|  |  (Gateway)  |  |  (Auth)   |  | (WS)      |        |
|  |             |  |           |  |           |        |
|  +------+------+  +-----+-----+  +-----+-----+        |
|         |               |              |              |
|         v               v              v              |
|  +------+---------------+--------------+------+       |
|  |                                            |       |
|  |           PostgreSQL                       |       |
|  |           (RLS-enforced, 26 tables)       |       |
|  |                                            |       |
|  +--------------------------------------------+       |
|                                                       |
+-------------------------------------------------------+
```

### Request Lifecycle

1. The browser loads the Vue SPA (static `dist/` folder).
2. For data operations, the SPA uses the Supabase JS client directly --
   PostgREST translates JS queries to SQL, RLS policies enforce access.
3. For AI processing, webhooks, and email, the SPA calls the Express API
   server at `/api/*` (proxied by Vite in dev, reverse-proxied in prod).
4. The Express server uses a Supabase service role key for privileged
   operations (bypassing RLS where needed).
5. Realtime subscriptions push database changes to connected clients via
   WebSockets.

---

## 2. Frontend Architecture

### Technology Stack

| Layer         | Technology                                       |
|---------------|--------------------------------------------------|
| Framework     | Vue 3 (Composition API) + TypeScript (incremental) |
| State         | Pinia (18 typed stores, repository pattern)      |
| Routing       | Vue Router 4 (history mode)                      |
| Data access   | Supabase JS client (no Axios)                    |
| API calls     | Native `fetch` for Express server                |
| Styling       | Tailwind CSS (brutalist design system)           |
| Build         | Vite                                             |
| DI            | ServiceContainer (symbol-keyed)                  |
| Toasts        | vue-toastification                               |
| Charts        | Chart.js + vue-chartjs                           |
| Rich Text     | Tiptap                                           |

### Layer Diagram

```
+---------------------------------------------------------------------+
|                         Vue Router                                   |
|  Route guards check Supabase auth session before navigation          |
|  14 feature modules declare routes as data, collected on demand      |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                    Feature Modules (14)                               |
|  src/modules/{feature}/{pages/, components/, index.ts}               |
|                                                                     |
|  tasks, calendar, clients, projects, campaigns, scopes, invoices,   |
|  notes, brain-dump, resources, team, settings, onboarding,          |
|  notifications + auth pages (dashboard exists as a directory but    |
|  is not a registered feature module)                                |
|                                                                     |
|  Each module exports: routes, nav items, search providers,          |
|  dependencies, setup()                                              |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                    Shared Components                                  |
|  src/components/ui/      -- Badge, Card, FormInput, DataTable,       |
|                             ConfirmDialog, SkeletonLoader, etc.      |
|  src/components/tasks/   -- TaskList, TaskForm, TaskKanban           |
|  src/components/         -- Modal, GlobalSearch, Sidebar,            |
|                             DefaultLayout, CommentThread             |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                 Pinia Stores (src/stores/*.ts)                        |
|  18 stores, ALL use repository pattern via DI container              |
|                                                                     |
|  auth, task, project, client, calendar, team, notification,          |
|  invoice, scope, onboarding, brain-dump, campaign, comment,          |
|  note, webhook, api-key, audit-log, resource                        |
|                                                                     |
|  Pattern: getContainer().resolve(SYMBOL_KEY) -> Repository<T>       |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|                 Core Infrastructure (src/core/)                       |
|                                                                     |
|  ServiceContainer  -- Symbol-keyed DI, lazy singleton resolution     |
|  EventBus          -- Typed pub/sub for cross-module communication   |
|  PluginRegistry    -- Topological dependency sort, module loading    |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|              Adapters (src/adapters/supabase/*.ts)                    |
|                                                                     |
|  Repository<T, CreateDTO, UpdateDTO> interface                       |
|  22 symbol keys in src/adapters/repository-keys.ts                   |
|  Supabase implementations for all repositories                       |
|                                                                     |
|  Extended interfaces:                                                |
|    TeamRepository, BrainDumpRepository,                              |
|    CommentRepository, NotificationRepository                         |
+---------------------------------------------------------------------+
        |
        v
+---------------------------------------------------------------------+
|              Supabase JS Client                                      |
|  supabase.from('table').select/insert/update/delete                  |
|  supabase.auth.signIn/signUp/signOut/getSession                     |
|  Notifications use polling (not Realtime subscriptions)              |
+---------------------------------------------------------------------+
```

### Routing and Feature Modules

The router (`src/router/index.ts`) uses `createWebHistory` for clean URLs.
Feature modules declare their routes, navigation items, and search providers
as plain data objects. The PluginRegistry resolves module dependencies via
topological sort and calls `setup()` during `initialize()`. Routes, nav
items, and search providers are collected on demand via `getRoutes()`,
`getNavGroups()`, and `getSearchProviders()`. A global `beforeEach`
guard checks the Supabase auth session and redirects unauthenticated users
to `/login`.

### Type System

TypeScript definitions live in `src/types/`:

- `models.ts` -- Entity interfaces (User, Team, Client, Project, Task,
  Campaign, Note, BrainDump, CalendarEvent, Resource, ApiKey, Comment,
  Notification, AuditLog, Webhook). All extend `Timestamped` and, where
  applicable, `SoftDeletable`.
- `enums.ts` -- Const objects + derived types for TaskStatus, TaskPriority,
  ProjectStatus, CampaignStatus, TeamRole, EventColor, NotificationType,
  ApiScope, ScopeStatus, DeliverableStatus, InvoiceStatus,
  OnboardingStepType, OnboardingStatus, InviteStatus.
- `api.ts` -- Request/response shapes.
- `index.ts` -- Barrel re-exports.

---

## 3. Backend Architecture

### Supabase Stack

| Component  | Role                                                  |
|------------|-------------------------------------------------------|
| PostgreSQL | Primary database, RLS policies, 26 tables             |
| GoTrue     | Authentication (signup, login, session management)     |
| PostgREST  | Auto-generated REST API from database schema           |
| Realtime   | WebSocket-based change notifications                   |
| Kong       | API gateway, routing, rate limiting                    |

Supabase runs either self-hosted (via Docker Compose) or as a managed
instance. Local development uses `docker-compose.dev.yml` on port 8000.

### Express API Server

The Express server (`server/`) handles operations that cannot run client-side
or through PostgREST:

```
server/src/
  index.ts               -- Entry point, middleware setup
  supabase.ts            -- Supabase client (service role)
  webhook-processor.ts   -- Cron-style webhook queue processor
  middleware/
    auth.ts              -- requireAuth middleware (JWT verification)
  routes/
    ai.ts                -- POST /api/ai/process (Anthropic proxy)
    webhooks.ts          -- Webhook CRUD + dispatch
    email.ts             -- Email sending
```

#### Middleware Stack

```
Request
  |
  +-- cors (dynamic origin whitelist)
  |
  +-- express.json()
  |
  +-- express-rate-limit
  |      global: 100 req / 15 min (all /api routes)
  |
  +-- requireAuth (server/src/middleware/auth.ts, applied per-router)
  |
  +-- Route handler
  |
  v
Response
```

#### Webhook Processor

The webhook system uses a cron-style polling mechanism (every 30 seconds)
that checks for pending webhook events, matches them against registered
webhook subscriptions, and dispatches HTTP POST requests to subscriber URLs
with signed payloads.

### Vite Dev Proxy

During development, Vite proxies `/api` requests to the Express server at
`localhost:3001`, eliminating CORS issues:

```
Browser :5173 --/api/--> Vite proxy ---> Express :3001
Browser :5173 ----------> Supabase :8000 (direct)
```

---

## 4. Authentication and Authorization

### Supabase Auth (GoTrue)

LaunchCue delegates all authentication to Supabase Auth. There is no manual
JWT creation, bcrypt hashing, or token blocklist management.

```
Browser                     Supabase GoTrue           PostgreSQL
  |                              |                        |
  |  supabase.auth.signUp()     |                        |
  |  { email, password }        |                        |
  |---------------------------->|                        |
  |                              |  Create user           |
  |                              |----------------------->|
  |                              |                        |
  |                              |  Issue JWT pair         |
  |                              |  (access + refresh)     |
  |                              |                        |
  |  { session, user }          |                        |
  |<----------------------------|                        |
  |                              |                        |
  |  Supabase JS client stores  |                        |
  |  session, handles refresh   |                        |
```

#### Session Lifecycle

- **Persistence:** The auth store uses `sessionStorage` to persist user,
  token, teams, and currentTeam across page reloads.
- **Manual JWT decoding:** The store decodes JWTs via `atob()` to check
  token expiry (`isTokenExpired`). It does not rely on Supabase's built-in
  session management or auto-refresh.
- **Token sync:** On `initAuth()`, the stored token is validated for expiry
  and synced to the auth adapter via `setToken()`.
- **Team switching:** Updates the active team context, gets a new token
  from the backend, and reloads data across all stores.

### RBAC (Role-Based Access Control)

Roles are stored in the `team_members` table and checked via JWT custom
claims:

| Role     | Permissions                                           |
|----------|-------------------------------------------------------|
| `owner`  | Full access, team deletion, member role changes       |
| `admin`  | Team management, all CRUD operations                  |
| `member` | Standard CRUD on team resources                       |
| `viewer` | Read-only access to team resources                    |
| `client` | Limited access to assigned projects (client portal)   |

**Backend enforcement:** PostgreSQL RLS policies check the user's role from
the JWT claims. Queries that violate policies return empty results or errors
-- no application-level role checks needed for data access.

**Frontend enforcement:** The auth store exposes computed properties:

```typescript
const userRole = computed(() => user.value?.role || null)
const isOwner  = computed(() => userRole.value === 'owner')
const isAdmin  = computed(() => userRole.value === 'admin')
const canManageTeam = computed(() => ['owner', 'admin'].includes(userRole.value))
const canEdit  = computed(() => ['owner', 'admin', 'member'].includes(userRole.value))
const isViewer = computed(() => userRole.value === 'viewer')
```

Components conditionally render UI elements based on these computed values.

---

## 5. Data Flow

### Creating a Task (Representative Example)

```
User clicks          TaskForm.vue        taskStore            Supabase adapter
"Save Task"              |                   |                      |
    |                    |                   |                      |
    +-- @submit -------->|                   |                      |
                         |                   |                      |
                         +-- createTask() -->|                      |
                                             |                      |
                                             |  const repo =        |
                                             |  getContainer()      |
                                             |    .resolve(TASK_REPO)
                                             |                      |
                                             +-- repo.create(data)->|
                                                                    |
                                                              supabase
                                                                .from('tasks')
                                                                .insert(data)
                                                                .select()
                                                                    |
                                                                    v
                                                              PostgREST
                                                              validates via
                                                              RLS policies
                                                                    |
                                                                    v
                                                              PostgreSQL
                                                              INSERT + RETURN
                                                                    |
                                             <----------------------+
                                             |
                                             |  Update local state
                                             |  EventBus.emit('task.created')
                                             |
                         <-------------------+
                         |
    <--------------------+
    Vue reactivity
    updates UI
```

### Data Flow Summary

```
+----------+     resolve()     +------------+     supabase.from()     +----------+
|  Vue     | --> store action --> DI         | --> Supabase adapter --> | Supabase |
|  Component|                  | Container  |                         | (PgREST) |
+----------+     <-- reactive  +------------+     <-- typed result     +----------+
                  state update                                              |
                                                                     RLS enforces
                                                                     team isolation
```

### Data Isolation

Every table includes a `team_id` column. PostgreSQL Row-Level Security
policies filter all queries by the authenticated user's team, extracted from
the JWT. This enforces complete data isolation between teams at the database
level -- no application code can bypass it.

---

## 6. Data Model

### PostgreSQL Tables (26)

```
users                -- id, email, name, avatar_url, ...
teams                -- id, name, owner_id, ...
team_members         -- team_id, user_id, role, joined_at, ...
team_invites         -- id, team_id, email, role, status, expires_at, ...

clients              -- id, team_id, name, industry, contact_name, ...
client_contacts      -- id, client_id, name, email, phone, role, is_primary, ...
projects             -- id, team_id, client_id, title, status, ...
tasks                -- id, team_id, project_id, title, status, priority,
                        assignee_id, due_date, checklist (jsonb), ...
campaigns            -- id, team_id, title, status, types, steps (jsonb), ...
notes                -- id, team_id, title, content, tags, ...
brain_dumps          -- id, team_id, title, content, tags, ...
calendar_events      -- id, team_id, title, start_time, end_time, all_day,
                        recurrence (jsonb), task_id, ...
resources            -- id, team_id, name, type, url, tags, ...

api_keys             -- id, team_id, user_id, prefix, key_hash, scopes, ...
comments             -- id, resource_type, resource_id, user_id, content, ...
notifications        -- id, user_id, type, title, message, read, ...
audit_logs           -- id, team_id, user_id, action, resource_type,
                        resource_id, changes (jsonb), ...
webhooks             -- id, team_id, url, events, secret, active, ...
webhook_queue        -- id, webhook_id, event, payload, attempts, ...
scopes               -- id, team_id, project_id, sections (jsonb), ...
scope_templates      -- id, team_id, name, sections (jsonb), ...
invoices             -- id, team_id, client_id, items (jsonb), status, ...
client_invitations   -- id, team_id, email, role, status, expires_at, ...
onboarding_checklists -- id, team_id, client_id, title, steps (jsonb),
                        status, ...
password_reset_tokens -- id, user_id, token_prefix, token_hash, expires_at, ...
email_verification_tokens -- id, user_id, token_hash, expires_at, ...
```

### Soft Delete Pattern

Entities that support soft delete include `deleted_at` and `deleted_by`
columns. PostgreSQL views prefixed with `active_` filter out soft-deleted
rows. RLS policies reference these views so deleted records are invisible
to normal queries.

### Row-Level Security (RLS)

Every table has RLS enabled. Policies follow a consistent pattern:

```sql
-- Helper function reads team from JWT metadata
CREATE FUNCTION auth.current_team_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'current_team_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Example: tasks table
CREATE POLICY "team_isolation" ON tasks
  USING (team_id = auth.current_team_id() AND deleted_at IS NULL);
```

This ensures users can only access data belonging to teams they are members
of, enforced at the database level regardless of how the query is made.

---

## 7. AI Integration

The Express server (`/api/ai/process`) proxies requests to the Anthropic
Messages API. The API key is stored exclusively as a server-side environment
variable and is never exposed to the client.

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

When enriched mode is enabled, the brain dump page fetches existing context
(clients, projects, tasks, meetings) from Supabase and includes it in the AI
prompt. The system prompt is adjusted to consider conflicts, patterns, and
opportunities relative to existing data.

### Structured Output

The AI response parser extracts JSON using three strategies:

1. JSON inside a fenced code block.
2. A bare JSON array pattern.
3. The entire response as JSON.

Extracted items are normalized (type mapped to `task`, `event`, or `project`)
and returned alongside the text response.

---

## 8. Key Design Decisions

### Plugin-Based Dependency Injection

The ServiceContainer uses symbol keys for type-safe dependency resolution.
Repositories are registered at boot and resolved lazily as singletons.
This decouples stores from specific backend implementations -- swapping
Supabase for another backend requires only new adapter implementations
registered under the same symbol keys.

```
registry.register(module)       -- Stores module (no initialization)

registry.initialize(container)  -- Called once at boot:
  |
  +-- Topological sort on declared dependencies
  |
  +-- For each module (in dependency order):
        +-- Call module.setup(container)  (registers adapters, etc.)

registry.getRoutes()            -- Collected on demand by router
registry.getNavGroups()         -- Collected on demand by Sidebar
registry.getSearchProviders()   -- Collected on demand by GlobalSearch
```

### Repository Pattern

All 18 Pinia stores access data through the `Repository<T, CreateDTO,
UpdateDTO>` interface. No store imports Supabase directly. Extended
interfaces (TeamRepository, BrainDumpRepository, CommentRepository,
NotificationRepository) add domain-specific methods beyond basic CRUD.

### Supabase Over Serverless Functions

Replacing Netlify Functions + MongoDB with Supabase eliminates:

- Manual JWT management (GoTrue handles it)
- MongoDB connection pooling in Lambda (PostgreSQL via PostgREST)
- Custom rate limiting collections (Kong handles it)
- Manual CORS configuration (Supabase client handles it)
- 28 serverless function files (PostgREST auto-generates REST endpoints)

The Express server handles only what Supabase cannot: AI proxying, webhook
dispatch, and email sending.

### Soft Delete via Views

Rather than filtering `deleted_at IS NULL` in every query, PostgreSQL views
(`active_*`) encapsulate the filter. RLS policies reference these views,
making soft delete invisible to application code.

### Team-Scoped Multi-Tenancy

Every table carries a `team_id` column. RLS policies enforce isolation at
the database level. When a user switches teams, all stores reload data for
the new team context.

### Brutalist Design System

| Token       | Value                                            |
|-------------|--------------------------------------------------|
| Primary     | Purple (#7C3AED)                                 |
| Accent      | Coral (#E8503A)                                  |
| Background  | Parchment (#FAF8F5)                              |
| Headings    | Space Grotesk                                    |
| Body        | Inter                                            |
| Data/Code   | JetBrains Mono                                   |
| Borders     | 2px solid, border-radius: 0                      |
| Shadows     | Hard offset (no blur)                            |
| Dark mode   | Class-based, CSS custom properties               |

---

## 9. Environment and Configuration

### Environment Variables

#### Frontend (VITE_ prefix, bundled into client)

| Variable                | Purpose                          |
|-------------------------|----------------------------------|
| `VITE_SUPABASE_URL`    | Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key  |
| `VITE_API_URL`          | Express API server URL           |

#### Express Server

| Variable                    | Purpose                          |
|-----------------------------|----------------------------------|
| `SUPABASE_URL`             | Supabase project URL             |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (privileged) |
| `ANTHROPIC_API_KEY`        | Anthropic API key for Claude     |

#### Supabase (self-hosted)

| Variable                    | Purpose                          |
|-----------------------------|----------------------------------|
| `POSTGRES_PASSWORD`        | PostgreSQL superuser password     |
| `JWT_SECRET`               | JWT signing key for GoTrue       |
| `SUPABASE_ANON_KEY`       | Anonymous key (limited access)   |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (full access) |

### Development Setup

```
npm run dev           -- Vite dev server (port 5173)
npm run dev:server    -- Express API server (port 3001)
npm run dev:supabase  -- Supabase Docker stack (port 8000)
npm run dev:full      -- All three concurrently
```

### Deployment

- **Frontend:** Static SPA deployed to DigitalOcean App Platform (`.do/app.yaml`)
- **Express server:** Dockerized (`server/Dockerfile`), deployed alongside frontend
- **Supabase:** Self-hosted on DigitalOcean Droplet (`infra/droplet-setup.sh`)
  or Supabase Cloud (managed)

### Build

```
npm run build         -- Vite production build (outputs dist/)
npm run type-check    -- vue-tsc type checking
npm test              -- Vitest (441 tests across 33 files)
```
