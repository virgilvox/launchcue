# LaunchCue API Reference

---

## 1. Overview

LaunchCue's API has two layers:

| Layer | Purpose | Base URL |
|-------|---------|----------|
| **Supabase PostgREST** | All CRUD operations (auto-generated REST via `@supabase/supabase-js`) | `{SUPABASE_URL}/rest/v1/` |
| **Express API Server** | AI processing, webhook queue, invitation email | `/api` (port 3001) |

In local development, Vite proxies `/api` requests to `localhost:3001`. In production, DigitalOcean App Platform routes `/api` to the Express service.

The Express server uses a Supabase client initialized with the **service role key** (bypasses RLS) for its own database queries. It validates user identity by verifying the Supabase JWT from the request.

---

## 2. Authentication

### Supabase Auth (Browser Sessions)

The primary authentication method. Managed by `@supabase/supabase-js`:

```ts
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()
```

Once authenticated, all Supabase client calls include the JWT automatically. RLS policies enforce access control server-side.

### Express Server Auth (`requireAuth` middleware)

All Express API routes use the `requireAuth` middleware (defined in `server/src/middleware/auth.ts`). It works as follows:

1. Extracts the Bearer token from the `Authorization` header.
2. Calls `supabase.auth.getUser(token)` to validate the JWT against Supabase Auth.
3. On success, attaches user info to `req.user`:

```ts
interface AuthenticatedRequest extends Request {
  user: {
    authId: string    // auth.users.id
    email: string
    teamId?: string   // from user_metadata.current_team_id
  }
}
```

4. On failure, returns `401 { error: "Missing authorization header" }` or `401 { error: "Invalid or expired token" }`.

There is no separate service-role-key auth for Express endpoints. All routes require a valid user JWT.

### Rate Limiting

A global rate limiter applies to all `/api` routes:
- **Window**: 15 minutes
- **Max requests**: 100 per window per IP
- Returns `429` when exceeded

---

## 3. Express API Endpoints

### `GET /api/health`

Health check. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-09T12:00:00.000Z"
}
```

### `POST /api/ai/process`

Brain dump AI processing via Anthropic Claude. Requires `requireAuth`.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | yes | The text to process |
| `processingDetails` | object | no | Optional context object |
| `processingDetails.context` | string | no | Additional context injected into the system prompt |
| `max_tokens` | number | no | Max tokens for response (default: 1024) |

```json
{
  "prompt": "Need to write a blog post about our new SDK by Friday...",
  "processingDetails": { "context": "Team is working on Developer Portal project" },
  "max_tokens": 2048
}
```

**Response:** The raw Anthropic Messages API response is returned directly. Example:

```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "..." }
  ],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 120, "output_tokens": 450 }
}
```

**Errors:**
- `400` — `{ "error": "Missing or invalid prompt" }`
- `500` — `{ "error": "AI service not configured" }` (no `ANTHROPIC_API_KEY`)
- `500` — `{ "error": "AI processing failed" }`
- Anthropic HTTP errors are proxied with their original status code and message.

### `GET /api/webhooks/queue`

View pending webhook deliveries for the current user's team. Requires `requireAuth`.

Returns up to 50 webhook queue items that have not been completed or failed, joined with `webhooks(url, events)`, ordered by `created_at` descending.

**Response:** Array of `webhook_queue` rows with joined `webhooks` data.

```json
[
  {
    "id": "uuid",
    "webhook_id": "uuid",
    "event": "task.created",
    "payload": { "..." : "..." },
    "attempts": 2,
    "max_attempts": 5,
    "next_retry_at": "2026-03-09T12:01:00.000Z",
    "completed_at": null,
    "failed_at": null,
    "last_error": "HTTP 503",
    "created_at": "2026-03-09T12:00:00.000Z",
    "webhooks": { "url": "https://example.com/hook", "events": ["task.created"] }
  }
]
```

**Errors:**
- `400` — `{ "error": "No active team" }` (user has no `current_team_id`)
- `500` — `{ "error": "Failed to fetch webhook queue" }`

### `POST /api/email/invite`

Send a team or client invitation email via SMTP (nodemailer). Requires `requireAuth`.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Recipient email address |
| `name` | string | no | Recipient display name |
| `inviteUrl` | string | yes | URL for the accept-invitation link |
| `teamName` | string | no | Team name shown in email |
| `type` | string | no | `"client"` for client invitations, anything else for team invitations |

```json
{
  "email": "person@example.com",
  "name": "Jane",
  "inviteUrl": "https://app.launchcue.dev/accept-invite?token=abc",
  "teamName": "Acme DevRel",
  "type": "client"
}
```

**Response:**

```json
{ "success": true }
```

**Errors:**
- `400` — `{ "error": "Missing email or inviteUrl" }`
- `500` — `{ "error": "Failed to send email" }`

### Webhook Queue Processor (Background Cron)

Not an HTTP endpoint. The webhook processor runs as a `node-cron` job every 30 seconds, started when the Express server boots.

**Behavior:**
1. Fetches up to 10 pending items from `webhook_queue` where `completed_at` and `failed_at` are null, `next_retry_at <= now`, and `attempts < 5`.
2. For each item, POSTs the `payload` JSON to the webhook URL.
3. Includes headers: `Content-Type: application/json`, `X-LaunchCue-Signature: sha256={hmac}`, `X-LaunchCue-Event: {event}`.
4. HMAC signature is computed with `crypto.createHmac('sha256', webhook.secret)` over the JSON payload.
5. On success (HTTP 2xx): marks `completed_at`.
6. On failure: increments `attempts`. If `attempts >= max_attempts`, marks `failed_at`. Otherwise, schedules `next_retry_at` with exponential backoff (4^attempt * 30s).
7. Request timeout: 10 seconds.

---

## 4. Supabase PostgREST

All standard CRUD operations go through `@supabase/supabase-js`, which wraps PostgREST. RLS policies restrict access to the current user's team data.

### Common Operations

```ts
// List tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .order('created_at', { ascending: false })

// Get single task
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('id', taskId)
  .single()

// Join related data
const { data, error } = await supabase
  .from('projects')
  .select('id, title, client:clients(id, name), tasks(id, title, status)')

// Insert
const { data, error } = await supabase
  .from('tasks')
  .insert({ title: 'Write blog post', status: 'To Do', team_id: teamId, created_by: userId })
  .select()
  .single()

// Update
const { data, error } = await supabase
  .from('tasks')
  .update({ status: 'In Progress' })
  .eq('id', taskId)
  .select()
  .single()

// Soft delete (for tables that support it)
const { error } = await supabase
  .from('tasks')
  .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
  .eq('id', taskId)
```

### Pagination

```ts
const { data, count } = await supabase
  .from('tasks')
  .select('*', { count: 'exact' })
  .range(0, 24)
  .order('created_at', { ascending: false })
```

### Realtime Subscriptions

```ts
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification:', payload.new)
  })
  .subscribe()

supabase.removeChannel(channel)
```

---

## 5. Tables Reference

26 tables total. Column names are exactly as defined in `supabase/migrations/001_create_tables.sql`.

**Soft delete** applies only to tables that have `deleted_at` and `deleted_by` columns (marked below). Tables without those columns use hard delete or are append-only.

### Custom ENUM Types

| Type | Values |
|------|--------|
| `task_status` | `To Do`, `In Progress`, `Blocked`, `Done` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `project_status` | `Planning`, `In Progress`, `On Hold`, `Completed`, `Cancelled` |
| `campaign_status` | `draft`, `active`, `paused`, `completed` |
| `team_role` | `owner`, `admin`, `member`, `viewer`, `client` |
| `event_color` | `blue`, `green`, `orange`, `red`, `purple` |
| `notification_type` | `task_assigned`, `deadline_approaching`, `team_invite`, `mention`, `comment` |
| `scope_status` | `draft`, `sent`, `approved`, `revised` |
| `deliverable_status` | `pending`, `in-progress`, `completed`, `approved` |
| `invoice_status` | `draft`, `sent`, `viewed`, `paid`, `overdue` |
| `onboarding_step_type` | `info`, `form`, `upload`, `approval` |
| `onboarding_status` | `not-started`, `in-progress`, `completed` |
| `invite_status` | `pending`, `accepted`, `rejected`, `expired` |
| `recurrence_frequency` | `daily`, `weekly`, `monthly`, `yearly` |

### users

App-level user profile (Supabase Auth manages `auth.users` separately).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `auth_id` | UUID UNIQUE | Links to `auth.users.id` |
| `name` | TEXT NOT NULL | |
| `email` | TEXT NOT NULL UNIQUE | |
| `job_title` | TEXT | |
| `bio` | TEXT | |
| `avatar_url` | TEXT | |
| `email_verified` | BOOLEAN | Default `false` |
| `timezone` | TEXT | Default `'UTC'` |
| `preferences` | JSONB | Default `{"theme":"system","notifications":{"email":true,"inApp":true}}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

No soft delete.

### teams

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `owner_id` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### team_members

Join table replacing the old `teams.members[]` array.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `team_id` | UUID NOT NULL | FK `teams(id)` ON DELETE CASCADE |
| `user_id` | UUID NOT NULL | FK `users(id)` ON DELETE CASCADE |
| `role` | team_role NOT NULL | Default `'member'` |
| `joined_at` | TIMESTAMPTZ | |

UNIQUE constraint on `(team_id, user_id)`. No soft delete.

### team_invites

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `email` | TEXT NOT NULL | |
| `team_id` | UUID NOT NULL | FK `teams(id)` ON DELETE CASCADE |
| `invited_by` | UUID NOT NULL | FK `users(id)` |
| `status` | invite_status NOT NULL | Default `'pending'` |
| `role` | team_role NOT NULL | Default `'member'` |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

No soft delete.

### clients

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `industry` | TEXT | |
| `website` | TEXT | |
| `description` | TEXT | |
| `contact_name` | TEXT | |
| `contact_email` | TEXT | |
| `contact_phone` | TEXT | |
| `address` | TEXT | |
| `notes` | TEXT | |
| `color` | TEXT | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### client_contacts

Replaces the old embedded `clients.contacts[]` array.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID NOT NULL | FK `clients(id)` ON DELETE CASCADE |
| `name` | TEXT NOT NULL | |
| `email` | TEXT | |
| `phone` | TEXT | |
| `role` | TEXT | |
| `is_primary` | BOOLEAN | Default `false` |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

No soft delete.

### projects

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | project_status NOT NULL | Default `'Planning'` |
| `client_id` | UUID | FK `clients(id)` |
| `start_date` | DATE | |
| `due_date` | DATE | |
| `tags` | TEXT[] | Default `{}` |
| `budget` | NUMERIC(12,2) | |
| `goals` | TEXT[] | Default `{}` |
| `owner_id` | UUID | FK `users(id)` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### tasks

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | task_status NOT NULL | Default `'To Do'` |
| `type` | TEXT | |
| `priority` | task_priority | Default `'medium'` |
| `project_id` | UUID | FK `projects(id)` |
| `assignee_id` | UUID | FK `users(id)` |
| `parent_task_id` | UUID | FK `tasks(id)` (subtasks) |
| `due_date` | DATE | |
| `completed` | BOOLEAN | Default `false` |
| `checklist` | JSONB | Default `[]` |
| `tags` | TEXT[] | Default `{}` |
| `time_estimate` | INTEGER | Minutes |
| `time_spent` | INTEGER | Minutes |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### campaigns

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `status` | campaign_status | Default `'draft'` |
| `types` | TEXT[] | Default `{}` |
| `client_id` | UUID | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `start_date` | DATE | |
| `end_date` | DATE | |
| `steps` | JSONB | Default `[]` |
| `budget` | NUMERIC(12,2) | |
| `metrics` | JSONB | Default `{"reach":0,"engagement":0,"conversions":0}` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### notes

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `content` | TEXT NOT NULL | Default `''` |
| `tags` | TEXT[] | Default `{}` |
| `client_id` | UUID | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### brain_dumps

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `content` | TEXT | |
| `tags` | TEXT[] | Default `{}` |
| `client_id` | UUID | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

No soft delete.

### calendar_events

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `start_time` | TIMESTAMPTZ NOT NULL | |
| `end_time` | TIMESTAMPTZ | |
| `all_day` | BOOLEAN | Default `false` |
| `description` | TEXT | |
| `color` | event_color | Default `'blue'` |
| `client_id` | UUID | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `task_id` | UUID | FK `tasks(id)` |
| `recurrence` | JSONB | `{frequency, interval, endDate}` |
| `reminders` | JSONB | Default `[]`, each: `{type, minutesBefore}` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### resources

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `type` | TEXT NOT NULL | |
| `url` | TEXT NOT NULL | |
| `description` | TEXT | |
| `tags` | TEXT[] | Default `{}` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `updated_by` | UUID | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### scope_templates

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `deliverables` | JSONB | Default `[]` |
| `terms` | TEXT | |
| `tags` | TEXT[] | Default `{}` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### scopes

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `project_id` | UUID | FK `projects(id)` |
| `client_id` | UUID | FK `clients(id)` |
| `template_id` | UUID | FK `scope_templates(id)` |
| `deliverables` | JSONB | Default `[]` |
| `terms` | TEXT | |
| `total_amount` | NUMERIC(12,2) NOT NULL | Default `0` |
| `status` | scope_status NOT NULL | Default `'draft'` |
| `sent_at` | TIMESTAMPTZ | |
| `approved_at` | TIMESTAMPTZ | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### invoices

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `client_id` | UUID NOT NULL | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `scope_id` | UUID | FK `scopes(id)` |
| `invoice_number` | TEXT NOT NULL | UNIQUE per team `(team_id, invoice_number)` |
| `line_items` | JSONB | Default `[]` |
| `subtotal` | NUMERIC(12,2) NOT NULL | Default `0` |
| `tax` | NUMERIC(12,2) | |
| `tax_rate` | NUMERIC(5,4) | e.g. `0.0825` = 8.25% |
| `total` | NUMERIC(12,2) NOT NULL | Default `0` |
| `currency` | TEXT NOT NULL | Default `'USD'` |
| `status` | invoice_status NOT NULL | Default `'draft'` |
| `notes` | TEXT | |
| `due_date` | DATE | |
| `sent_at` | TIMESTAMPTZ | |
| `paid_at` | TIMESTAMPTZ | |
| `paid_amount` | NUMERIC(12,2) | |
| `created_by` | UUID NOT NULL | FK `users(id)` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### api_keys

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `prefix` | TEXT NOT NULL | First 8 chars, for lookup |
| `key_hash` | TEXT NOT NULL | bcrypt hash of full key |
| `scopes` | TEXT[] NOT NULL | Default `{}` |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `last_used_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |

No `updated_at`.

### comments

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `resource_type` | TEXT NOT NULL | CHECK: `'task'`, `'project'`, `'client'`, `'note'` |
| `resource_id` | UUID NOT NULL | |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `content` | TEXT NOT NULL | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

No soft delete.

### notifications

Ephemeral -- hard deleted when dismissed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `type` | notification_type NOT NULL | |
| `title` | TEXT NOT NULL | |
| `message` | TEXT NOT NULL | |
| `read` | BOOLEAN | Default `false` |
| `resource_type` | TEXT | |
| `resource_id` | UUID | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `created_at` | TIMESTAMPTZ | |

No `updated_at`. No soft delete.

### client_invitations

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `client_id` | UUID NOT NULL | FK `clients(id)` |
| `project_ids` | UUID[] | Default `{}` |
| `email` | TEXT NOT NULL | |
| `name` | TEXT NOT NULL | |
| `role` | TEXT NOT NULL | Default `'client'` |
| `invited_by` | UUID NOT NULL | FK `users(id)` |
| `token` | TEXT | |
| `token_hash` | TEXT | bcrypt hash for secure lookup |
| `status` | invite_status NOT NULL | Default `'pending'` |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### onboarding_checklists

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `client_id` | UUID NOT NULL | FK `clients(id)` |
| `project_id` | UUID | FK `projects(id)` |
| `title` | TEXT NOT NULL | |
| `steps` | JSONB | Default `[]` |
| `status` | onboarding_status NOT NULL | Default `'not-started'` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### audit_logs

Append-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `action` | TEXT NOT NULL | |
| `resource_type` | TEXT NOT NULL | |
| `resource_id` | UUID | |
| `changes` | JSONB | `{field: {from, to}}` |
| `created_at` | TIMESTAMPTZ | |

No `updated_at`. No soft delete.

### webhooks

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `team_id` | UUID NOT NULL | FK `teams(id)` |
| `url` | TEXT NOT NULL | |
| `events` | TEXT[] NOT NULL | Default `{}` |
| `secret` | TEXT NOT NULL | Used for HMAC signatures |
| `active` | BOOLEAN | Default `true` |
| `deleted_at` | TIMESTAMPTZ | Soft delete |
| `deleted_by` | UUID | FK `users(id)` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### webhook_queue

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `webhook_id` | UUID NOT NULL | FK `webhooks(id)` |
| `event` | TEXT NOT NULL | |
| `payload` | JSONB NOT NULL | |
| `attempts` | INTEGER | Default `0` |
| `max_attempts` | INTEGER | Default `5` |
| `next_retry_at` | TIMESTAMPTZ NOT NULL | Default `NOW()` |
| `completed_at` | TIMESTAMPTZ | |
| `failed_at` | TIMESTAMPTZ | |
| `last_error` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

No soft delete.

### password_reset_tokens

Single-use, hard-deleted after use.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `token_prefix` | TEXT NOT NULL | First 8 chars for lookup |
| `token_hash` | TEXT NOT NULL | bcrypt hash |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `used_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

### email_verification_tokens

Single-use, hard-deleted after use.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID NOT NULL | FK `users(id)` |
| `token_hash` | TEXT NOT NULL | |
| `expires_at` | TIMESTAMPTZ NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anonymous/public key |
| `SUPABASE_URL` | Server | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service role key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | Server | Anthropic API key for AI processing |
| `SMTP_HOST` | Server | SMTP server (default: `smtp.mailgun.org`) |
| `SMTP_PORT` | Server | SMTP port (default: `587`) |
| `SMTP_USER` | Server | SMTP username |
| `SMTP_PASS` | Server | SMTP password |
| `SMTP_FROM` | Server | From address (default: `noreply@launchcue.dev`) |
| `ALLOWED_ORIGINS` | Server | Comma-separated CORS origins (default: `http://localhost:5173`) |
| `PORT` | Server | Express server port (default: `3001`) |
