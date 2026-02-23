# LaunchCue Security Model

This document describes the security architecture of LaunchCue, covering authentication, authorization, rate limiting, transport security, and data protection mechanisms.

---

## Table of Contents

1. [JWT Authentication Flow](#1-jwt-authentication-flow)
2. [API Key Authentication Flow](#2-api-key-authentication-flow)
3. [RBAC Model](#3-rbac-model)
4. [Rate Limiting](#4-rate-limiting)
5. [CORS Policy](#5-cors-policy)
6. [Security Headers](#6-security-headers)
7. [Password Requirements](#7-password-requirements)
8. [Token Storage](#8-token-storage)
9. [Error Sanitization](#9-error-sanitization)
10. [Audit Logging](#10-audit-logging)

---

## 1. JWT Authentication Flow

LaunchCue uses JSON Web Tokens (JWT) as the primary authentication mechanism for browser-based sessions.

### Token Issuance

Tokens are issued on two occasions:

- **Registration** (`auth-register`): After creating the user and their default team, a JWT is signed and returned in the response body.
- **Login** (`auth-login`): After verifying credentials, a JWT is signed and returned.

Each token is signed with the `JWT_SECRET` environment variable using the default HS256 algorithm (via the `jsonwebtoken` library).

### Token Payload

Every issued JWT contains the following claims:

| Claim     | Description                                        |
|-----------|----------------------------------------------------|
| `userId`  | The authenticated user's database ID               |
| `teamId`  | The currently active team's database ID            |
| `email`   | The user's email address                           |
| `name`    | The user's display name                            |
| `role`    | The user's role within the current team (optional) |
| `jti`     | A unique token identifier (32-byte hex string)     |
| `exp`     | Expiration timestamp (24 hours from issuance)      |

The `jti` (JWT ID) claim is generated via `crypto.randomBytes(16).toString('hex')` and is used for token revocation tracking.

### Token Expiry

All JWTs expire after **24 hours** (`TOKEN_EXPIRY = '24h'`). The frontend also performs client-side expiry checking by decoding the `exp` claim from the token payload on initialization (`initAuth`). If the token is expired, the auth state is cleared and the user is redirected to login.

### Token Verification

On every authenticated request, the `authenticate()` function in `authHandler.js`:

1. Extracts the `Authorization: Bearer <token>` header.
2. Verifies the JWT signature and expiration via `jwt.verify()`.
3. Validates that both `userId` and `teamId` are present in the decoded payload.
4. If the token contains a `jti` claim, checks the `tokenBlocklist` MongoDB collection to see if the token has been revoked.

### Token Revocation

Tokens can be revoked before their natural expiry by adding their `jti` to the `tokenBlocklist` collection in MongoDB.

```
tokenBlocklist document:
{
  jti: string,         // The JWT ID being revoked
  revokedAt: Date,     // When the revocation occurred
  expiresAt: Date      // When the original token would have expired (for TTL cleanup)
}
```

The collection uses a MongoDB TTL index on `expiresAt` with `expireAfterSeconds: 0`, so blocklist entries are automatically cleaned up by MongoDB once the original token would have expired anyway. This prevents the blocklist from growing unboundedly.

### Fail-Closed Blocklist Check

If the database is unreachable during the blocklist check, the system **fails closed** -- the token is treated as potentially revoked and the request is rejected with a 401. This is a deliberate security-first design choice: availability is sacrificed to prevent a revoked token from being accepted during a database outage.

---

## 2. API Key Authentication Flow

LaunchCue supports API key authentication for programmatic access (scripts, integrations, CI/CD pipelines).

### Key Format

All API keys are prefixed with `lc_sk_` followed by a cryptographically random string. Example:

```
lc_sk_a1b2c3d4e5f6g7h8i9j0...
```

### Key Storage

API keys are **never stored in plaintext**. When a key is created:

1. The full key is returned to the user exactly once.
2. A **bcrypt hash** of the full key is stored in the `apiKeys` collection as `hashedKey`.
3. A **lookup prefix** is stored as `prefix` -- the first 8 characters after the `lc_sk_` prefix (i.e., `lc_sk_` + 8 chars = 14 characters total).

### Authentication Process

When a request arrives with a Bearer token starting with `lc_sk_`:

1. The lookup prefix (first 14 characters) is extracted.
2. The `apiKeys` collection is queried by `{ prefix: lookupPrefix }`.
3. The full API key is compared against the stored `hashedKey` using `bcrypt.compare()`.
4. If the key has an `expiresAt` field and that date is in the past, the key is rejected with a 401.
5. Scope checking is performed (see below).
6. The `lastUsedAt` field is updated (fire-and-forget, does not block the response).

### Scope Checking

API keys have an array of scopes that control what operations they can perform. Scopes follow the pattern `action:resource` (e.g., `read:tasks`, `write:clients`).

Scope derivation from the request:
- `GET` requests require `read:<resourceType>`.
- `POST`, `PUT`, `DELETE`, `PATCH` requests require `write:<resourceType>`.

The resource type is derived from the function path (e.g., `/tasks` maps to `tasks`).

Special scopes:
- `admin` -- grants access to all resources regardless of specific scope requirements.
- `*` (wildcard) -- same as `admin`, grants universal access.

Scope checking can be bypassed per-endpoint with `options.skipScopeCheck = true`, or overridden with explicit `options.requiredScopes`.

### Expiration Support

API keys optionally support an `expiresAt` date. If set and the current date exceeds it, the key is rejected with `401 - API Key has expired`. Keys without an `expiresAt` field never expire.

### Last Used Tracking

Every successful API key authentication updates the `lastUsedAt` timestamp on the key document. This is done as a fire-and-forget operation (the response is not blocked by the update).

---

## 3. RBAC Model

LaunchCue implements role-based access control (RBAC) with four hierarchical roles within each team.

### Role Hierarchy

```
owner > admin > member > viewer
```

### Permission Matrix

| Capability                  | Owner | Admin | Member | Viewer |
|-----------------------------|:-----:|:-----:|:------:|:------:|
| Read all resources          |   Y   |   Y   |   Y    |   Y    |
| Create resources            |   Y   |   Y   |   Y    |   N    |
| Update resources            |   Y   |   Y   |   Y    |   N    |
| Delete resources            |   Y   |   Y   |   Y    |   N    |
| Invite members              |   Y   |   Y   |   N    |   N    |
| Remove members              |   Y   |   Y*  |   N    |   N    |
| Change member roles         |   Y   |   Y*  |   N    |   N    |
| Manage team settings        |   Y   |   Y   |   N    |   N    |
| Delete team                 |   Y   |   N   |   N    |   N    |
| Promote to admin/owner      |   Y   |   N   |   N    |   N    |

*Admins can manage members and viewers but cannot manage other admins or the owner.

### Backend Enforcement

The `requireRole(authContext, allowedRoles)` function in `authHandler.js` enforces role requirements on the backend. It checks the `role` field from the authenticated JWT payload against the provided list of allowed roles.

```javascript
// Example: Only owners and admins can access this endpoint
requireRole(authContext, ['owner', 'admin']);
```

If the user's role is not in the `allowedRoles` array, a `403 Forbidden` response is returned with the message: `Insufficient permissions. Required role: owner or admin`.

The user's role is embedded in the JWT at login time and updated when switching teams. It reflects their role within the currently active team.

### Frontend Enforcement

The auth store (`src/stores/auth.ts`) provides computed properties for role-based UI rendering:

| Computed Property | Description                                        |
|-------------------|----------------------------------------------------|
| `userRole`        | The raw role string (`'owner'`, `'admin'`, etc.)   |
| `isOwner`         | `true` if `role === 'owner'`                       |
| `isAdmin`         | `true` if `role === 'admin'`                       |
| `canManageTeam`   | `true` if role is `'owner'` or `'admin'`           |
| `canEdit`         | `true` if role is `'owner'`, `'admin'`, or `'member'` |
| `isViewer`        | `true` if `role === 'viewer'`                      |

These computed properties are used throughout the frontend to conditionally render UI elements (edit buttons, delete actions, team management sections, etc.). Frontend checks are a UX convenience only; all permissions are enforced on the backend.

---

## 4. Rate Limiting

LaunchCue implements MongoDB-backed rate limiting with three tiers, designed for serverless environments (no in-memory state).

### Rate Limit Tiers

| Tier      | Max Requests | Window   | Failure Mode | Use Case                    |
|-----------|:------------:|----------|:------------:|-----------------------------|
| `auth`    | 5            | 15 min   | Fail-closed  | Login, registration         |
| `general` | 100          | 1 min    | Fail-open    | Standard API requests       |
| `ai`      | 10           | 1 min    | Fail-open    | AI processing (Claude API)  |

### Implementation

Rate limit records are stored in the `rateLimits` MongoDB collection. Each request inserts a document:

```
{
  key: string,        // Format: "<category>:<userId-or-IP>"
  createdAt: Date,    // When the request occurred
  expiresAt: Date     // For TTL cleanup (createdAt + windowMs)
}
```

A MongoDB TTL index on `expiresAt` with `expireAfterSeconds: 0` automatically removes expired records.

### Rate Limit Key

The rate limit key is resolved in the following order of preference:
1. Authenticated user's `userId` (if provided).
2. `X-Forwarded-For` header (proxy/load balancer client IP).
3. `Client-IP` header.
4. `'unknown'` (fallback).

### Failure Modes

- **Fail-closed (auth tier)**: If the database is unreachable during a rate limit check for authentication endpoints, the request is **denied**. This prevents brute-force attacks from succeeding during database outages.
- **Fail-open (general and ai tiers)**: If the database is unreachable, the request is **allowed**. Availability is prioritized over strict enforcement for non-security-critical endpoints.

### Response on Rate Limit

When a request is rate limited, the server returns:

```
HTTP 429 Too Many Requests
{
  "error": "Too many requests. Please try again later.",
  "details": {
    "retryAfter": <seconds>,
    "resetAt": "<ISO 8601 timestamp>"
  }
}
```

### Client-Side Retry

The frontend API service (`api.service.ts`) automatically retries on 429 responses up to 3 times with exponential backoff. If a `Retry-After` header is present, it is respected instead of the default backoff calculation.

---

## 5. CORS Policy

CORS (Cross-Origin Resource Sharing) is configured in `response.js` and applied to all function responses.

### Origin Resolution

The allowed origins are determined by the `ALLOWED_ORIGINS` environment variable:

| Environment                           | Allowed Origins                                      |
|---------------------------------------|------------------------------------------------------|
| Production with `ALLOWED_ORIGINS` set | Comma-separated list from the env var                |
| Production without `ALLOWED_ORIGINS`  | **Empty list -- all cross-origin requests denied**   |
| Development (NODE_ENV != production)  | `http://localhost:5173`, `http://localhost:8888`      |

### Strict Origin Matching

The CORS handler performs exact-match origin validation. The request's `Origin` header is checked against the allowed list:

- If the origin is in the allowed list, it is reflected back in the `Access-Control-Allow-Origin` header.
- If the origin is **not** in the allowed list, the `Access-Control-Allow-Origin` header is set to an **empty string** (effectively denying the cross-origin request).
- There is no fallback to the first allowed origin or wildcard `*`.

### CORS Headers

All responses include:

```
Access-Control-Allow-Origin: <matched origin or empty>
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
Vary: Origin
```

The `Vary: Origin` header ensures that caches (CDN, browser) do not serve a response with the wrong `Access-Control-Allow-Origin` value.

### Preflight Handling

`OPTIONS` requests are handled by `handleOptionsRequest()`, which returns a `204 No Content` response with the appropriate CORS headers. This allows browsers to complete the CORS preflight before sending the actual request.

---

## 6. Security Headers

All responses from the Netlify CDN include the following security headers, configured in `netlify.toml`:

### Header Details

| Header                       | Value                                                                                                   | Purpose                                                 |
|------------------------------|----------------------------------------------------------------------------------------------------------|---------------------------------------------------------|
| `Strict-Transport-Security`  | `max-age=31536000; includeSubDomains; preload`                                                          | Enforce HTTPS for 1 year, including subdomains          |
| `X-Frame-Options`            | `DENY`                                                                                                  | Prevent all framing (clickjacking protection)           |
| `X-Content-Type-Options`     | `nosniff`                                                                                               | Prevent MIME type sniffing                              |
| `X-XSS-Protection`           | `1; mode=block`                                                                                         | Enable legacy XSS filter in blocking mode               |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                       | Send origin only on cross-origin requests, full URL on same-origin |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=()`                                                              | Deny access to camera, microphone, and geolocation APIs |
| `Content-Security-Policy`    | See breakdown below                                                                                     | Restrict resource loading sources                       |

### Content Security Policy Breakdown

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https:;
connect-src 'self' https://*.netlify.app https://*.mongodb.net;
```

| Directive     | Sources                                                | Notes                                          |
|---------------|--------------------------------------------------------|------------------------------------------------|
| `default-src` | `'self'`                                               | Baseline: only same-origin                     |
| `script-src`  | `'self'`                                               | No inline scripts, no eval                     |
| `style-src`   | `'self'` `'unsafe-inline'` `fonts.googleapis.com`      | Inline styles allowed (required by Tailwind)   |
| `font-src`    | `'self'` `fonts.gstatic.com`                           | Google Fonts support                           |
| `img-src`     | `'self'` `data:` `https:`                              | Allows data URIs and any HTTPS image           |
| `connect-src` | `'self'` `*.netlify.app` `*.mongodb.net`               | API calls to Netlify Functions and MongoDB      |

### Cache Control

- `/assets/*` (hashed build artifacts): `public, max-age=31536000, immutable` -- cached for 1 year, browser never revalidates.
- `/index.html`: `no-cache, no-store, must-revalidate` -- never cached, ensuring SPA updates propagate immediately.

---

## 7. Password Requirements

Passwords are validated on registration using a Zod schema with the following rules:

| Requirement                | Rule                               |
|----------------------------|------------------------------------|
| Minimum length             | 10 characters                      |
| Uppercase letter           | At least one (`/[A-Z]/`)           |
| Lowercase letter           | At least one (`/[a-z]/`)           |
| Number                     | At least one (`/[0-9]/`)           |
| Special character          | At least one (`/[^a-zA-Z0-9]/`)   |

### Password Hashing

Passwords are hashed using **bcrypt** with a cost factor (salt rounds) of **10**. The `bcryptjs` library is used, which is a pure JavaScript implementation compatible with serverless environments.

```javascript
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);
```

Plaintext passwords are never stored, logged, or returned in API responses.

---

## 8. Token Storage

### sessionStorage (Not localStorage)

JWT tokens and auth state are stored in the browser's `sessionStorage`, not `localStorage`. This is a deliberate security choice:

- **sessionStorage** is scoped to the browser tab and is cleared when the tab is closed. If a user closes the browser or the tab, their session ends immediately.
- **localStorage** persists across browser sessions and tabs, which increases the window of exposure if a token is compromised.

### Stored Items

| Key            | Content                     |
|----------------|-----------------------------|
| `token`        | The raw JWT string          |
| `user`         | JSON-serialized user object |
| `teams`        | JSON-serialized team list   |
| `currentTeam`  | JSON-serialized active team |

### Token Lifecycle in the Frontend

1. On login/register, the token is saved to `sessionStorage` and set in the `ApiService` instance's in-memory `_token` field.
2. The Axios request interceptor reads `_token` from memory and attaches it as the `Authorization: Bearer <token>` header on every outgoing request.
3. On `initAuth()` (called on app startup), the token is read from `sessionStorage` back into memory. If the token's `exp` claim is in the past, all auth state is cleared.
4. On logout, `sessionStorage` is cleared and `_token` is set to `null`.
5. On 401 responses from auth-related endpoints, the `onUnauthorized` callback triggers automatic logout.

---

## 9. Error Sanitization

LaunchCue sanitizes error responses to prevent information leakage in production.

### Backend Error Handling

In catch blocks, error details are conditionally included based on the environment:

```javascript
const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
return createErrorResponse(500, 'Internal Server Error', safeDetails);
```

- **Production** (`NODE_ENV === 'production'`): 500 responses contain only the generic message `"Internal Server Error"`. The `error.message` is never sent to the client.
- **Development**: The actual `error.message` is included in the `details` field for debugging convenience.

### Email Verification Token Exposure

Similarly, email verification tokens are only included in API responses when `NODE_ENV !== 'production'`:

```javascript
if (process.env.NODE_ENV !== 'production') {
  responseBody.verificationToken = verificationToken;
}
```

### Logging

Internal errors are always logged server-side via the logger utility regardless of environment, ensuring that production issues can still be diagnosed from server logs without exposing details to clients.

---

## 10. Audit Logging

All mutation operations (create, update, delete) are logged to the `auditLogs` MongoDB collection for accountability and compliance.

### Audit Log Schema

```
{
  userId: string,         // Who performed the action
  teamId: string,         // Which team context the action occurred in
  action: string,         // 'create', 'update', or 'delete'
  resourceType: string,   // 'task', 'project', 'client', 'campaign', etc.
  resourceId: string,     // The ID of the affected resource
  changes: object | null, // For updates: { field: { from: oldValue, to: newValue } }
  timestamp: Date         // When the action occurred
}
```

### Design Principles

- **Non-blocking**: Audit log creation is wrapped in a try/catch that logs failures but never throws. A failed audit log write does not break the main operation. The application prioritizes the user's action succeeding over the audit record being written.
- **Change tracking**: For update operations, the `changes` field captures a diff of modified fields with their previous (`from`) and new (`to`) values, enabling full change history review.
- **Team-scoped**: Every audit entry is tagged with a `teamId`, allowing audit logs to be queried per team.
- **Backend-only**: The `createAuditLog()` function is called from Netlify function handlers after a successful mutation. It is never exposed as a public API endpoint for writing -- only reading audit logs is exposed to authorized users.

### Usage Pattern

```javascript
const { createAuditLog } = require('./utils/auditLog');

// After a successful update:
await createAuditLog(db, {
  userId: authContext.userId,
  teamId: authContext.teamId,
  action: 'update',
  resourceType: 'task',
  resourceId: taskId,
  changes: { status: { from: 'todo', to: 'in_progress' } }
});
```

---

## Summary of Security Layers

| Layer               | Mechanism                                    | Failure Mode   |
|---------------------|----------------------------------------------|----------------|
| Transport           | HSTS, HTTPS enforcement                      | --             |
| Authentication      | JWT (browser), API Key (programmatic)        | Fail-closed    |
| Authorization       | RBAC with 4 roles, backend `requireRole()`   | Deny by default|
| Rate Limiting       | MongoDB-backed, 3 tiers                      | Mixed          |
| Origin Control      | Strict CORS, no wildcard                     | Deny by default|
| Content Security    | CSP, X-Frame-Options, nosniff                | Block          |
| Password Security   | Bcrypt (10 rounds), 5-rule validation        | --             |
| Token Security      | sessionStorage, 24h expiry, revocation       | Fail-closed    |
| Error Handling      | Production error sanitization                | --             |
| Audit Trail         | All mutations logged with diffs              | Non-blocking   |
