# LaunchCue Security Model

This document describes the security architecture of LaunchCue, covering authentication, authorization, row-level security, rate limiting, CORS, and data protection mechanisms.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [API Key Authentication](#2-api-key-authentication)
3. [Authorization (RBAC)](#3-authorization-rbac)
4. [Row-Level Security (RLS)](#4-row-level-security-rls)
5. [Rate Limiting](#5-rate-limiting)
6. [CORS Policy](#6-cors-policy)
7. [Security Headers](#7-security-headers)
8. [Password Requirements](#8-password-requirements)
9. [Session Management](#9-session-management)
10. [Error Sanitization](#10-error-sanitization)
11. [Audit Logging](#11-audit-logging)

---

## 1. Authentication

LaunchCue delegates all authentication to **Supabase Auth (GoTrue)**. There is no manual JWT signing, verification, or token blocklist management in the application.

### Supported Methods

| Method           | Description                                              |
|------------------|----------------------------------------------------------|
| Email / Password | Standard credential-based login and registration         |

### Token Lifecycle

Supabase Auth issues and manages access tokens and refresh tokens automatically:

- **Access tokens** are short-lived JWTs signed by GoTrue with the project's JWT secret.
- **Refresh tokens** are used by the Supabase JS client to obtain new access tokens before expiry.
- **Auto-refresh** is handled by the `@supabase/supabase-js` client library. The application does not manually decode, verify, or refresh tokens.

### Custom Claims

GoTrue JWTs include custom claims used by RLS policies and the application:

| Claim / Lookup                                       | Description                                                        |
|------------------------------------------------------|--------------------------------------------------------------------|
| `sub`                                                | The authenticated user's Supabase user ID                          |
| `email`                                              | The user's email address                                           |
| `user_metadata.current_team_id`                      | The currently active team's database ID (stored in user metadata)  |
| `auth.current_team_role()` (database function)       | The user's role within the current team, looked up dynamically from the `team_members` table |

Team ID is **not** a top-level JWT claim. It is stored in `user_metadata` and read in RLS via `auth.jwt() -> 'user_metadata' ->> 'current_team_id'`. Role is **not** embedded in the JWT at all — it is resolved at query time by the `auth.current_team_role()` database function, which joins `team_members` on the current user and team.

### Token Verification

All verification is handled by Supabase infrastructure:

- **PostgREST** verifies the JWT signature on every database request and applies RLS policies using the token claims.
- **Kong gateway** validates tokens for GoTrue and PostgREST endpoints.
- **Express API server** verifies tokens via `supabase.auth.getUser()` for server-side endpoints (AI, webhooks, email).

The application never verifies JWT signatures directly. However, the auth store does manually decode JWT payloads using `atob(jwt.split('.')[1])` to check token expiry on initialization.

---

## 2. API Key Authentication

LaunchCue supports API key authentication for programmatic access (scripts, integrations, CI/CD pipelines).

### Key Format

All API keys are prefixed with `lc_sk_` followed by a cryptographically random string:

```
lc_sk_a1b2c3d4e5f6g7h8i9j0...
```

### Key Storage

API keys are **never stored in plaintext**. When a key is created:

1. The full key is returned to the user exactly once.
2. A **bcrypt hash** of the full key is stored in the `api_keys` table as `key_hash`.
3. A **lookup prefix** is stored for efficient retrieval without full-table scans.

> **Note:** The `api_keys` schema exists and the application provides basic CRUD on the table, but key generation, scope validation, and authentication-via-API-key logic are **not yet implemented**.

### Scope-Based Access Control

API keys have an array of scopes that control what operations they can perform. Scopes follow the pattern `action:resource`:

| Scope Pattern    | Example          | Description                        |
|------------------|------------------|------------------------------------|
| `read:<resource>`| `read:tasks`     | Read access to a specific resource |
| `write:<resource>`| `write:clients` | Write access to a specific resource|
| `read:*`         | --               | Read access to all resources       |
| `write:*`        | --               | Write access to all resources      |

### Expiration

API keys optionally support an `expires_at` timestamp. If set and the current time exceeds it, the key is rejected. Keys without an `expires_at` value never expire.

### Last Used Tracking

Every successful API key authentication updates the `last_used_at` timestamp on the key record for auditing purposes.

---

## 3. Authorization (RBAC)

LaunchCue implements role-based access control with five roles within each team.

### Role Hierarchy

```
owner > admin > member > viewer > client
```

### Permission Matrix

| Capability                  | Owner | Admin | Member | Viewer | Client |
|-----------------------------|:-----:|:-----:|:------:|:------:|:------:|
| Read all resources          |   Y   |   Y   |   Y    |   Y    |   N*   |
| Create resources            |   Y   |   Y   |   Y    |   N    |   N    |
| Update resources            |   Y   |   Y   |   Y    |   N    |   N    |
| Delete resources            |   Y   |   Y   |   Y    |   N    |   N    |
| Invite members              |   Y   |   Y   |   N    |   N    |   N    |
| Remove members              |   Y   |   Y** |   N    |   N    |   N    |
| Change member roles         |   Y   |   Y** |   N    |   N    |   N    |
| Manage team settings        |   Y   |   Y   |   N    |   N    |   N    |
| Delete team                 |   Y   |   N   |   N    |   N    |   N    |
| Promote to admin/owner      |   Y   |   N   |   N    |   N    |   N    |
| View audit logs             |   Y   |   Y   |   N    |   N    |   N    |

*Clients have scoped read access to their own projects via the client portal.
**Admins can manage members and viewers but cannot manage other admins or the owner.

### Backend Enforcement

Role enforcement is handled at two levels:

1. **RLS policies** check the `role` claim from the JWT to enforce row-level permissions in the database.
2. **Express API** checks roles via `supabase.auth.getUser()` for server-side endpoints that are not covered by PostgREST.

### Frontend Enforcement

The auth store (`src/stores/auth.ts`) exposes computed properties for role-based UI rendering:

| Computed Property | Description                                         |
|-------------------|-----------------------------------------------------|
| `userRole`        | The raw role string (`'owner'`, `'admin'`, etc.)    |
| `isOwner`         | `true` if `role === 'owner'`                        |
| `isAdmin`         | `true` if `role === 'admin'`                        |
| `canManageTeam`   | `true` if role is `'owner'` or `'admin'`            |
| `canEdit`         | `true` if role is `'owner'`, `'admin'`, or `'member'` |
| `isViewer`        | `true` if `role === 'viewer'`                       |

These properties are used throughout the frontend to conditionally render UI elements. Frontend checks are a UX convenience only; all permissions are enforced by the database and backend.

---

## 4. Row-Level Security (RLS)

Every table containing a `team_id` column has PostgreSQL Row-Level Security enabled. RLS is the primary authorization mechanism — it enforces data isolation at the database level.

### Policy Pattern

All RLS policies follow the same structure:

```sql
-- Read: any team member can SELECT
CREATE POLICY "team_read" ON <table> FOR SELECT
  USING (team_id = auth.current_team_id());

-- Write: owner, admin, or member
CREATE POLICY "team_write" ON <table> FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

-- Admin-only operations (e.g., team settings, webhooks, invites)
CREATE POLICY "team_admin" ON <table> FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.is_admin());
```

`auth.current_team_id()` reads from `auth.jwt() -> 'user_metadata' ->> 'current_team_id'`. `auth.can_write()` checks that the user's role (looked up from `team_members`) is owner, admin, or member. `auth.is_admin()` checks for owner or admin.

This ensures that:

- Users can only read rows belonging to their current team.
- Write and delete operations additionally require a sufficient role via `auth.can_write()`.
- Administrative operations require `auth.is_admin()`.
- **No application-level team filtering is needed.** PostgREST applies policies automatically on every query.

### Soft Delete Views

Tables use soft deletion (`deleted_at` column). Active record views filter out soft-deleted rows:

```sql
CREATE VIEW active_tasks AS
  SELECT * FROM tasks WHERE deleted_at IS NULL;
```

RLS policies apply to the underlying tables, and views inherit the security context.

### Key Guarantees

- A user on Team A can never read or modify data belonging to Team B, regardless of what queries the application issues.
- Even if a bug in the frontend omits a `team_id` filter, the database rejects unauthorized access.
- RLS policies are enforced for all access through PostgREST, including Supabase JS client calls.

---

## 5. Rate Limiting

Rate limiting is applied at two layers: the Express API server and the Supabase Kong gateway.

### Express API Rate Limiting

The Express server uses `express-rate-limit` middleware with in-memory storage:

| Tier       | Max Requests | Window  | Applied To                     |
|------------|:------------:|---------|--------------------------------|
| General    | 100          | 15 min  | All `/api` routes              |

Rate limit responses return `HTTP 429 Too Many Requests` with a `Retry-After` header.

### Supabase Rate Limiting

The Kong API gateway provides rate limiting for all Supabase services (PostgREST, GoTrue, Realtime). These limits are configured at the infrastructure level and apply per-IP.

---

## 6. CORS Policy

CORS is configured at two layers to control cross-origin access.

### Express API Server

The Express server uses the `cors` middleware:

| Environment | Allowed Origins                                     |
|-------------|-----------------------------------------------------|
| Production  | Comma-separated list from `ALLOWED_ORIGINS` env var |
| Development | `http://localhost:5173` (Vite dev server)           |

If `ALLOWED_ORIGINS` is not set, the server falls back to `['http://localhost:5173']` regardless of `NODE_ENV`.

### Supabase (Kong Gateway)

The Kong API gateway handles CORS for PostgREST and GoTrue endpoints. CORS configuration is managed through Supabase project settings.

### CORS Headers

```
Access-Control-Allow-Origin: <matched origin>
Access-Control-Allow-Headers: Content-Type, Authorization, apikey, x-client-info
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Credentials: true
Vary: Origin
```

### Preflight Handling

`OPTIONS` requests are handled with a `204 No Content` response containing the appropriate CORS headers, allowing browsers to complete the CORS preflight before sending the actual request.

---

## 7. Security Headers

Security headers are applied by the DigitalOcean App Platform and CDN at the edge.

### Header Details

| Header                       | Value                                                    | Purpose                                            |
|------------------------------|----------------------------------------------------------|----------------------------------------------------|
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains; preload`           | Enforce HTTPS for 1 year, including subdomains     |
| `X-Frame-Options`            | `DENY`                                                   | Prevent all framing (clickjacking protection)      |
| `X-Content-Type-Options`     | `nosniff`                                                | Prevent MIME type sniffing                         |
| `X-XSS-Protection`           | `1; mode=block`                                          | Enable legacy XSS filter in blocking mode          |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                        | Limit referrer information on cross-origin requests|
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=()`               | Deny access to sensitive browser APIs              |

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://<supabase-project>.supabase.co wss://<supabase-project>.supabase.co;
```

| Directive     | Sources                                          | Notes                                            |
|---------------|--------------------------------------------------|--------------------------------------------------|
| `default-src` | `'self'`                                         | Baseline: only same-origin                       |
| `script-src`  | `'self'`                                         | No inline scripts, no eval                       |
| `style-src`   | `'self'` `'unsafe-inline'` `fonts.googleapis.com`| Inline styles allowed (required by Tailwind)     |
| `font-src`    | `'self'` `fonts.gstatic.com`                     | Google Fonts support                             |
| `img-src`     | `'self'` `data:` `https:`                        | Allows data URIs and any HTTPS image             |
| `connect-src` | `'self'` `<supabase-project>.supabase.co`        | API calls to Supabase (HTTP and WebSocket)       |

### Cache Control

- `/assets/*` (hashed build artifacts): `public, max-age=31536000, immutable` -- cached for 1 year.
- `/index.html`: `no-cache, no-store, must-revalidate` -- never cached, ensuring SPA updates propagate immediately.

---

## 8. Password Requirements

Password policy is configured in Supabase Auth (GoTrue) at the project level.

### Configuration

Password requirements are set via the Supabase dashboard or GoTrue configuration:

| Setting             | Value                          |
|---------------------|--------------------------------|
| Minimum length      | Configured in Supabase Auth    |
| Complexity rules    | Configured in Supabase Auth    |

### Password Handling

- Supabase Auth handles all password hashing internally using bcrypt.
- The application never receives, stores, or processes plaintext passwords.
- Password reset flows are managed entirely by GoTrue (reset email, token verification, password update).

---

## 9. Session Management

### Application-Managed Sessions

Session persistence is managed by the auth store (`src/stores/auth.ts`), not the Supabase JS client's built-in session handling:

- **Storage**: User data, token, teams, and current team are persisted in `sessionStorage` (not `localStorage`). Sessions do **not** survive browser restarts or persist across tabs.
- **Token expiry check**: On initialization, the auth store manually decodes the JWT payload via `atob(jwt.split('.')[1])` and checks the `exp` claim against the current time. Expired tokens are discarded and the user must re-authenticate.
- **No auto-refresh**: The application does not use Supabase's built-in token auto-refresh. If the token expires, the session is cleared.

### Auth State Initialization

On application startup, the auth store reads user and token data from `sessionStorage` (not `supabase.auth.getSession()`). If the token is missing or expired (checked via manual JWT decode), the session is cleared and the user is redirected to login.

### Logout

On logout:

1. `supabase.auth.signOut()` is called via the auth adapter.
2. All `sessionStorage` keys (`token`, `user`, `teams`, `currentTeam`) are removed.
3. All non-auth Pinia stores are disposed to clear stale data.
4. The user is redirected to the landing page.

### Auth State Listener

The auth adapter registers an `onUnauthorized` callback so that 401 responses from the Supabase client trigger a logout. The application does **not** use `onAuthStateChange` for cross-tab sync (since `sessionStorage` is tab-scoped).

---

## 10. Error Sanitization

LaunchCue sanitizes error responses to prevent information leakage in production.

### Express API Error Handling

There is no centralized error-handling middleware in the Express server. Each route handles errors individually with its own try/catch blocks, returning error messages directly in the response. Error sanitization is not consistently applied across routes.

### Supabase Error Handling

PostgREST error responses are caught by the Supabase client and transformed into user-friendly messages. Database constraint names and internal PostgreSQL error details are not exposed to end users.

### Logging

Internal errors are logged server-side regardless of environment, ensuring production issues can be diagnosed from server logs without exposing details to clients.

---

## 11. Audit Logging

All mutation operations (create, update, delete) are logged to the `audit_logs` PostgreSQL table for accountability and compliance.

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,        -- 'create', 'update', 'delete'
  resource_type TEXT NOT NULL,      -- 'task', 'project', 'client', etc.
  resource_id UUID,
  changes     JSONB,                -- { field: { from: old, to: new } }
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Indexing

- Primary index on `(team_id, created_at DESC)` for efficient team-scoped queries.
- Additional index on `resource_type` for filtering by entity type.

### Access Control

- **Write**: Audit log entries are created automatically by PostgreSQL triggers (defined in `004_functions.sql`), not by application code. The `create_audit_log()` trigger fires `AFTER INSERT OR UPDATE` on key entity tables (tasks, projects, clients, invoices, scopes). The Supabase adapter's `create()` method throws an error: "Audit logs are system-generated and cannot be created manually."
- **Read**: Audit logs are accessible via a read-only API restricted to `owner` and `admin` roles (enforced by RLS with `auth.is_admin()`).
- **RLS**: Audit logs have RLS enabled, scoped by `team_id` and restricted to admin roles.

### Design Principles

- **Trigger-based**: Audit logging is handled entirely at the database level via PostgreSQL `AFTER` triggers, ensuring every mutation is captured regardless of which application path performed it.
- **Team-scoped**: Every entry is tagged with `team_id`, and RLS ensures teams can only view their own audit trail.
- **Immutable**: Audit log entries are insert-only. The adapter rejects `update()` and `delete()` calls with errors.

---

## Summary of Security Layers

| Layer               | Mechanism                                          | Enforcement Point        |
|---------------------|----------------------------------------------------|--------------------------|
| Transport           | HSTS, HTTPS enforcement                            | CDN / App Platform       |
| Authentication      | Supabase Auth (GoTrue), API keys                   | GoTrue, Kong, Express    |
| Authorization       | RBAC with 5 roles                                  | RLS policies, Express    |
| Data Isolation      | Row-Level Security on all team-scoped tables       | PostgreSQL               |
| Rate Limiting       | express-rate-limit, Kong gateway                   | Express, Kong            |
| Origin Control      | Strict CORS, no wildcard                           | Express, Kong            |
| Content Security    | CSP, X-Frame-Options, nosniff                      | CDN / App Platform       |
| Password Security   | GoTrue-managed bcrypt hashing and policy           | Supabase Auth            |
| Session Security    | Supabase-managed tokens, auto-refresh              | Supabase JS client       |
| Error Handling      | Production error sanitization                      | Express, Supabase client |
| Audit Trail         | All mutations logged with JSONB diffs              | PostgreSQL               |
