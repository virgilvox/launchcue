# LaunchCue Database Schema

PostgreSQL database managed by Supabase (GoTrue auth, PostgREST API, Realtime subscriptions). 26 tables, 14 enum types, 17 views, 5 migration files.

---

## Table of Contents

1. [Overview](#overview)
2. [Migrations](#migrations)
3. [Enum Types](#enum-types)
4. [Tables](#tables)
5. [Row-Level Security (RLS)](#row-level-security-rls)
6. [Views](#views)
7. [Functions & Triggers](#functions--triggers)
8. [Indexes](#indexes)

---

## Overview

- **Engine:** PostgreSQL via Supabase
- **Extensions:** `uuid-ossp` (UUID generation), `pg_trgm` (trigram full-text search)
- **Multi-tenancy:** `team_id` column on most tables, enforced by RLS
- **Soft delete:** `deleted_at` / `deleted_by` columns; filtered by `active_*` views
- **Timestamps:** `created_at` and `updated_at` (auto-set by trigger) on most tables
- **IDs:** UUID primary keys everywhere (`uuid_generate_v4()`)
- **Money:** `NUMERIC(12,2)` for amounts, `NUMERIC(5,4)` for tax rates
- **Arrays:** `TEXT[]` for tags, scopes, event lists
- **Structured data:** `JSONB` for checklists, steps, metrics, deliverables, line items, recurrence, reminders, preferences, changes

---

## Migrations

Files live in `supabase/migrations/` and are applied in order:

| File | Purpose |
|------|---------|
| `supabase/migrations/001_create_tables.sql` | Extensions, 14 enum types, all 26 tables |
| `supabase/migrations/002_row_level_security.sql` | 5 helper functions, RLS enabled on all 26 tables, all policies |
| `supabase/migrations/003_indexes.sql` | Performance indexes, partial indexes, GIN indexes, full-text search indexes |
| `supabase/migrations/004_functions.sql` | `updated_at` trigger, soft delete, cascade delete, invoice numbering, task sync, global search, audit log trigger, webhook queue trigger, task assignment notification |
| `supabase/migrations/005_views.sql` | 15 `active_*` views, `dashboard_stats` view, `upcoming_deadlines` view |

---

## Enum Types

All 14 custom enum types defined in `001_create_tables.sql`:

| Enum | Values |
|------|--------|
| `task_status` | `'To Do'`, `'In Progress'`, `'Blocked'`, `'Done'` |
| `task_priority` | `'low'`, `'medium'`, `'high'`, `'urgent'` |
| `project_status` | `'Planning'`, `'In Progress'`, `'On Hold'`, `'Completed'`, `'Cancelled'` |
| `campaign_status` | `'draft'`, `'active'`, `'paused'`, `'completed'` |
| `team_role` | `'owner'`, `'admin'`, `'member'`, `'viewer'`, `'client'` |
| `event_color` | `'blue'`, `'green'`, `'orange'`, `'red'`, `'purple'` |
| `notification_type` | `'task_assigned'`, `'deadline_approaching'`, `'team_invite'`, `'mention'`, `'comment'` |
| `scope_status` | `'draft'`, `'sent'`, `'approved'`, `'revised'` |
| `deliverable_status` | `'pending'`, `'in-progress'`, `'completed'`, `'approved'` |
| `invoice_status` | `'draft'`, `'sent'`, `'viewed'`, `'paid'`, `'overdue'` |
| `onboarding_step_type` | `'info'`, `'form'`, `'upload'`, `'approval'` |
| `onboarding_status` | `'not-started'`, `'in-progress'`, `'completed'` |
| `invite_status` | `'pending'`, `'accepted'`, `'rejected'`, `'expired'` |
| `recurrence_frequency` | `'daily'`, `'weekly'`, `'monthly'`, `'yearly'` |

---

## Tables

### users

App-level profile extending `auth.users` (Supabase Auth).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `auth_id` | `UUID` | UNIQUE | Links to `auth.users.id` |
| `name` | `TEXT` | NOT NULL | Display name |
| `email` | `TEXT` | NOT NULL, UNIQUE | |
| `job_title` | `TEXT` | | |
| `bio` | `TEXT` | | |
| `avatar_url` | `TEXT` | | Profile image URL |
| `email_verified` | `BOOLEAN` | DEFAULT FALSE | |
| `timezone` | `TEXT` | DEFAULT `'UTC'` | |
| `preferences` | `JSONB` | DEFAULT `'{"theme": "system", "notifications": {"email": true, "inApp": true}}'` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### teams

Top-level tenant. Supports soft delete.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `name` | `TEXT` | NOT NULL | |
| `owner_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### team_members

Join table replacing MongoDB `teams.members[]` array.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` ON DELETE CASCADE | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` ON DELETE CASCADE | |
| `role` | `team_role` | NOT NULL, DEFAULT `'member'` | |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Unique constraint:** `(team_id, user_id)`

---

### team_invites

Invitations for users to join a team.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `email` | `TEXT` | NOT NULL | Invitee email |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` ON DELETE CASCADE | |
| `invited_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `status` | `invite_status` | NOT NULL, DEFAULT `'pending'` | |
| `role` | `team_role` | NOT NULL, DEFAULT `'member'` | Role granted on accept |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### clients

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `name` | `TEXT` | NOT NULL | |
| `industry` | `TEXT` | | |
| `website` | `TEXT` | | |
| `description` | `TEXT` | | |
| `contact_name` | `TEXT` | | Primary contact name |
| `contact_email` | `TEXT` | | Primary contact email |
| `contact_phone` | `TEXT` | | Primary contact phone |
| `address` | `TEXT` | | |
| `notes` | `TEXT` | | |
| `color` | `TEXT` | | UI color |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### client_contacts

Replaces MongoDB embedded `clients.contacts[]` array.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `client_id` | `UUID` | NOT NULL, FK -> `clients(id)` ON DELETE CASCADE | |
| `name` | `TEXT` | NOT NULL | |
| `email` | `TEXT` | | |
| `phone` | `TEXT` | | |
| `role` | `TEXT` | | Contact's role/title |
| `is_primary` | `BOOLEAN` | DEFAULT FALSE | |
| `notes` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### projects

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `status` | `project_status` | NOT NULL, DEFAULT `'Planning'` | |
| `client_id` | `UUID` | FK -> `clients(id)` | |
| `start_date` | `DATE` | | |
| `due_date` | `DATE` | | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `budget` | `NUMERIC(12,2)` | | |
| `goals` | `TEXT[]` | DEFAULT `'{}'` | |
| `owner_id` | `UUID` | FK -> `users(id)` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `status` | `task_status` | NOT NULL, DEFAULT `'To Do'` | |
| `type` | `TEXT` | | Task type |
| `priority` | `task_priority` | DEFAULT `'medium'` | |
| `project_id` | `UUID` | FK -> `projects(id)` | |
| `assignee_id` | `UUID` | FK -> `users(id)` | |
| `parent_task_id` | `UUID` | FK -> `tasks(id)` | Subtask support |
| `due_date` | `DATE` | | |
| `completed` | `BOOLEAN` | DEFAULT FALSE | Synced with status via trigger |
| `checklist` | `JSONB` | DEFAULT `'[]'` | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `time_estimate` | `INTEGER` | | Minutes |
| `time_spent` | `INTEGER` | | Minutes |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### campaigns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `status` | `campaign_status` | DEFAULT `'draft'` | |
| `types` | `TEXT[]` | DEFAULT `'{}'` | Campaign types (blog, video, etc.) |
| `client_id` | `UUID` | FK -> `clients(id)` | |
| `project_id` | `UUID` | FK -> `projects(id)` | |
| `start_date` | `DATE` | | |
| `end_date` | `DATE` | | |
| `steps` | `JSONB` | DEFAULT `'[]'` | Workflow steps |
| `budget` | `NUMERIC(12,2)` | | |
| `metrics` | `JSONB` | DEFAULT `'{"reach": 0, "engagement": 0, "conversions": 0}'` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | Creator |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### notes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `content` | `TEXT` | NOT NULL, DEFAULT `''` | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `client_id` | `UUID` | FK -> `clients(id)` | Optional |
| `project_id` | `UUID` | FK -> `projects(id)` | Optional |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### brain_dumps

Quick-capture entries. No soft delete.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `content` | `TEXT` | | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `client_id` | `UUID` | FK -> `clients(id)` | Optional |
| `project_id` | `UUID` | FK -> `projects(id)` | Optional |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### calendar_events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `start_time` | `TIMESTAMPTZ` | NOT NULL | |
| `end_time` | `TIMESTAMPTZ` | | |
| `all_day` | `BOOLEAN` | DEFAULT FALSE | |
| `description` | `TEXT` | | |
| `color` | `event_color` | DEFAULT `'blue'` | |
| `client_id` | `UUID` | FK -> `clients(id)` | Optional |
| `project_id` | `UUID` | FK -> `projects(id)` | Optional |
| `task_id` | `UUID` | FK -> `tasks(id)` | Optional linked task |
| `recurrence` | `JSONB` | | `{frequency, interval, endDate}` |
| `reminders` | `JSONB` | DEFAULT `'[]'` | `[{type, minutesBefore}]` |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### resources

Shared links, files, and reference materials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `name` | `TEXT` | NOT NULL | |
| `type` | `TEXT` | NOT NULL | e.g. link, doc, file |
| `url` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `updated_by` | `UUID` | FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### scope_templates

Reusable templates for creating scopes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `deliverables` | `JSONB` | DEFAULT `'[]'` | |
| `terms` | `TEXT` | | |
| `tags` | `TEXT[]` | DEFAULT `'{}'` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### scopes

Scope of work documents bound to a project/client.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `title` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `project_id` | `UUID` | FK -> `projects(id)` | |
| `client_id` | `UUID` | FK -> `clients(id)` | |
| `template_id` | `UUID` | FK -> `scope_templates(id)` | Source template |
| `deliverables` | `JSONB` | DEFAULT `'[]'` | |
| `terms` | `TEXT` | | |
| `total_amount` | `NUMERIC(12,2)` | NOT NULL, DEFAULT `0` | |
| `status` | `scope_status` | NOT NULL, DEFAULT `'draft'` | |
| `sent_at` | `TIMESTAMPTZ` | | |
| `approved_at` | `TIMESTAMPTZ` | | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### invoices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `client_id` | `UUID` | NOT NULL, FK -> `clients(id)` | |
| `project_id` | `UUID` | FK -> `projects(id)` | |
| `scope_id` | `UUID` | FK -> `scopes(id)` | |
| `invoice_number` | `TEXT` | NOT NULL | Auto-generated `INV-001` format |
| `line_items` | `JSONB` | DEFAULT `'[]'` | |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL, DEFAULT `0` | |
| `tax` | `NUMERIC(12,2)` | | |
| `tax_rate` | `NUMERIC(5,4)` | | e.g. 0.0825 = 8.25% |
| `total` | `NUMERIC(12,2)` | NOT NULL, DEFAULT `0` | |
| `currency` | `TEXT` | NOT NULL, DEFAULT `'USD'` | |
| `status` | `invoice_status` | NOT NULL, DEFAULT `'draft'` | |
| `notes` | `TEXT` | | |
| `due_date` | `DATE` | | |
| `sent_at` | `TIMESTAMPTZ` | | |
| `paid_at` | `TIMESTAMPTZ` | | |
| `paid_amount` | `NUMERIC(12,2)` | | |
| `created_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

**Unique constraint:** `(team_id, invoice_number)`

---

### api_keys

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `name` | `TEXT` | NOT NULL | Human-readable key name |
| `prefix` | `TEXT` | NOT NULL | First 8 chars for lookup |
| `key_hash` | `TEXT` | NOT NULL | bcrypt hash of full key |
| `scopes` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Permitted operations |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | Key creator |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `last_used_at` | `TIMESTAMPTZ` | | |
| `expires_at` | `TIMESTAMPTZ` | | Null = no expiry |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### comments

Polymorphic comment system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `resource_type` | `TEXT` | NOT NULL, CHECK IN (`'task'`, `'project'`, `'client'`, `'note'`) | |
| `resource_id` | `UUID` | NOT NULL | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | Author |
| `content` | `TEXT` | NOT NULL | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### notifications

Ephemeral -- hard deleted when dismissed (no soft delete). Scoped by both `user_id` and `team_id`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | Recipient |
| `type` | `notification_type` | NOT NULL | |
| `title` | `TEXT` | NOT NULL | |
| `message` | `TEXT` | NOT NULL | |
| `read` | `BOOLEAN` | DEFAULT FALSE | |
| `resource_type` | `TEXT` | | Optional link to entity |
| `resource_id` | `UUID` | | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### client_invitations

Invitations for clients to join the portal.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `client_id` | `UUID` | NOT NULL, FK -> `clients(id)` | |
| `project_ids` | `UUID[]` | DEFAULT `'{}'` | Granted project access |
| `email` | `TEXT` | NOT NULL | |
| `name` | `TEXT` | NOT NULL | |
| `role` | `TEXT` | NOT NULL, DEFAULT `'client'` | |
| `invited_by` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `token` | `TEXT` | | Plaintext token (transient) |
| `token_hash` | `TEXT` | | bcrypt hash for secure lookup |
| `status` | `invite_status` | NOT NULL, DEFAULT `'pending'` | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### onboarding_checklists

Client onboarding checklists.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `client_id` | `UUID` | NOT NULL, FK -> `clients(id)` | |
| `project_id` | `UUID` | FK -> `projects(id)` | Optional |
| `title` | `TEXT` | NOT NULL | |
| `steps` | `JSONB` | DEFAULT `'[]'` | |
| `status` | `onboarding_status` | NOT NULL, DEFAULT `'not-started'` | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### audit_logs

Immutable action log. Insert-only (no UPDATE/DELETE policies for users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | Actor |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `action` | `TEXT` | NOT NULL | `'created'`, `'updated'`, `'deleted'` |
| `resource_type` | `TEXT` | NOT NULL | Table name |
| `resource_id` | `UUID` | | |
| `changes` | `JSONB` | | `{field: {from, to}}` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### webhooks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `team_id` | `UUID` | NOT NULL, FK -> `teams(id)` | |
| `url` | `TEXT` | NOT NULL | Delivery endpoint |
| `events` | `TEXT[]` | NOT NULL, DEFAULT `'{}'` | Subscribed event types |
| `secret` | `TEXT` | NOT NULL | HMAC signing secret |
| `active` | `BOOLEAN` | DEFAULT TRUE | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |
| `deleted_by` | `UUID` | FK -> `users(id)` | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### webhook_queue

Reliable webhook delivery queue. Service role only (no user access via RLS).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `webhook_id` | `UUID` | NOT NULL, FK -> `webhooks(id)` | |
| `event` | `TEXT` | NOT NULL | e.g. `tasks.created` |
| `payload` | `JSONB` | NOT NULL | |
| `attempts` | `INTEGER` | DEFAULT `0` | |
| `max_attempts` | `INTEGER` | DEFAULT `5` | |
| `next_retry_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `failed_at` | `TIMESTAMPTZ` | | |
| `last_error` | `TEXT` | | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### password_reset_tokens

Single-use, hard-deleted after use.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `token_prefix` | `TEXT` | NOT NULL | First 8 chars for lookup |
| `token_hash` | `TEXT` | NOT NULL | bcrypt hash |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | |
| `used_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

### email_verification_tokens

Single-use, hard-deleted after use.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `uuid_generate_v4()` | |
| `user_id` | `UUID` | NOT NULL, FK -> `users(id)` | |
| `token_hash` | `TEXT` | NOT NULL | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | |

---

## Row-Level Security (RLS)

RLS is enabled on all 26 tables. Policies use 5 helper functions defined in the `auth` schema.

### Helper Functions

```sql
-- Get current team ID from JWT user_metadata
auth.current_team_id() -> UUID
  -- reads auth.jwt() -> 'user_metadata' ->> 'current_team_id'

-- Get app-level user ID (public.users.id) from auth.uid()
auth.app_user_id() -> UUID
  -- SELECT id FROM public.users WHERE auth_id = auth.uid()

-- Get current user's role in their active team
auth.current_team_role() -> team_role
  -- looks up role from team_members for current_team_id + app_user_id

-- Check if current user can write (owner, admin, or member)
auth.can_write() -> BOOLEAN

-- Check if current user is admin or owner
auth.is_admin() -> BOOLEAN
```

All helper functions are `STABLE SECURITY DEFINER`.

### Policy Patterns

**Standard team-scoped entity** (clients, projects, tasks, campaigns, notes, calendar_events, resources, scope_templates, scopes, invoices):
- SELECT: `team_id = auth.current_team_id() AND deleted_at IS NULL`
- INSERT: `team_id = auth.current_team_id() AND auth.can_write()`
- UPDATE: `team_id = auth.current_team_id() AND auth.can_write()`
- DELETE: `team_id = auth.current_team_id() AND auth.can_write()`

**brain_dumps** (no soft delete):
- SELECT: `team_id = auth.current_team_id()` (no `deleted_at` check)
- INSERT/UPDATE/DELETE: `team_id = auth.current_team_id() AND auth.can_write()`

**users**:
- SELECT: own row OR any user in the same team
- UPDATE: own row only

**teams**:
- SELECT: any team the user is a member of
- INSERT: `owner_id = auth.app_user_id()`
- UPDATE: current team + `auth.is_admin()`
- DELETE: `owner_id = auth.app_user_id()`

**team_members, team_invites**:
- SELECT: current team
- INSERT/UPDATE/DELETE: current team + `auth.is_admin()`

**client_contacts** (no `team_id` column -- resolved via parent):
- All operations: `client_id IN (SELECT id FROM clients WHERE team_id = auth.current_team_id())`
- Write operations additionally require `auth.can_write()`

**api_keys**:
- SELECT: current team + not deleted
- INSERT: current team + own `user_id`
- UPDATE/DELETE: current team + (own key OR `auth.is_admin()`)

**comments**:
- SELECT: current team
- INSERT: current team + `auth.can_write()`
- UPDATE: current team + own comment only
- DELETE: current team + (own comment OR `auth.is_admin()`)

**notifications**:
- SELECT: own user + current team
- INSERT: current team (any authenticated user)
- UPDATE/DELETE: own user only

**client_invitations, onboarding_checklists**:
- SELECT: current team + not deleted
- INSERT/UPDATE/DELETE: current team + `auth.is_admin()` (client_invitations) or `auth.can_write()` (onboarding_checklists)

**audit_logs**:
- SELECT: current team + `auth.is_admin()` (admin read-only)
- INSERT: current team (system creates these)

**webhooks**:
- SELECT: current team + not deleted
- INSERT/UPDATE/DELETE: current team + `auth.is_admin()`

**webhook_queue**:
- `USING (FALSE)` -- service_role key only, no user access

**password_reset_tokens, email_verification_tokens**:
- SELECT: own user
- INSERT: `WITH CHECK (TRUE)` -- system creates these

---

## Views

17 views defined in `005_views.sql`. Views inherit RLS policies from their base tables.

### Active Views (15)

Filter out soft-deleted rows (`WHERE deleted_at IS NULL`):

| View | Base Table |
|------|------------|
| `active_clients` | `clients` |
| `active_projects` | `projects` |
| `active_tasks` | `tasks` |
| `active_campaigns` | `campaigns` |
| `active_notes` | `notes` |
| `active_calendar_events` | `calendar_events` |
| `active_resources` | `resources` |
| `active_scope_templates` | `scope_templates` |
| `active_scopes` | `scopes` |
| `active_invoices` | `invoices` |
| `active_api_keys` | `api_keys` |
| `active_webhooks` | `webhooks` |
| `active_client_invitations` | `client_invitations` |
| `active_onboarding_checklists` | `onboarding_checklists` |
| `active_teams` | `teams` |

### dashboard_stats

Pre-computed counts for the dashboard stats grid, grouped by `team_id`:

| Column | Description |
|--------|-------------|
| `team_id` | |
| `total_tasks` | Active tasks |
| `completed_tasks` | Tasks with status `'Done'` |
| `overdue_tasks` | Active non-done tasks with `due_date < CURRENT_DATE` |
| `total_projects` | Active projects |
| `active_projects` | Projects with status `'In Progress'` |
| `total_clients` | Active clients |
| `outstanding_invoices` | Active invoices with status `'sent'` or `'viewed'` |
| `outstanding_amount` | Sum of `total` for outstanding invoices |

Uses `FULL OUTER JOIN` across tasks, projects, clients, invoices with `FILTER` aggregates.

### upcoming_deadlines

Union of tasks and projects with future due dates, ordered by `due_date ASC`:

| Column | Description |
|--------|-------------|
| `id` | Entity ID |
| `title` | |
| `entity_type` | `'task'` or `'project'` |
| `due_date` | |
| `status` | Cast to TEXT |
| `team_id` | |
| `owner_id` | `assignee_id` for tasks, `owner_id` for projects |

Filters: not deleted, `due_date >= CURRENT_DATE`, status not `'Done'` (tasks) or not `'Completed'`/`'Cancelled'` (projects).

---

## Functions & Triggers

All defined in `004_functions.sql`.

### trigger_set_updated_at()

Auto-sets `updated_at = NOW()` on every UPDATE. Applied dynamically to all tables that have an `updated_at` column via a `DO` block that iterates `information_schema.columns`.

**Trigger:** `set_updated_at` BEFORE UPDATE on each applicable table.

### soft_delete(p_table TEXT, p_id UUID, p_user_id UUID)

Generic soft delete function. Sets `deleted_at = NOW()` and `deleted_by = p_user_id` on the specified row. `SECURITY DEFINER`.

### cascade_soft_delete_team()

When a team's `deleted_at` is set (transitions from NULL to non-NULL), cascades soft delete to all team-scoped entities: clients, projects, tasks, campaigns, notes, calendar_events, resources, scope_templates, scopes, invoices, api_keys, webhooks, client_invitations, onboarding_checklists. Hard deletes notifications and team_invites.

**Trigger:** `cascade_team_soft_delete` AFTER UPDATE on `teams`.

### generate_invoice_number(p_team_id UUID) -> TEXT

Generates sequential invoice numbers in `INV-001` format, per team. Finds the max existing number and increments.

### sync_task_completed()

Keeps `completed` boolean and `status` enum in sync bidirectionally:
- Setting `status = 'Done'` sets `completed = TRUE`
- Setting `completed = TRUE` sets `status = 'Done'`
- Unsetting either resets the other (`status` resets to `'To Do'`)

**Trigger:** `sync_task_completed_trigger` BEFORE INSERT OR UPDATE on `tasks`.

### global_search(p_team_id UUID, p_query TEXT, p_limit INTEGER DEFAULT 20)

Full-text search across 6 entity types using `plainto_tsquery`. Returns `(id, entity_type, title, description, rank)` ordered by `ts_rank` descending. Searches: tasks, projects, clients, notes, campaigns, resources. Filters out soft-deleted rows. `STABLE SECURITY DEFINER`.

### create_audit_log()

Auto-creates audit log entries on INSERT or UPDATE. Detects soft delete (UPDATE where `deleted_at` transitions to non-NULL) and logs as `'deleted'`. Uses `COALESCE(auth.app_user_id(), NEW.created_by, NEW.user_id)` for the actor. `SECURITY DEFINER`.

**Triggers applied to:** tasks, projects, clients, invoices, scopes.

| Trigger Name | Table |
|--------------|-------|
| `audit_tasks` | `tasks` |
| `audit_projects` | `projects` |
| `audit_clients` | `clients` |
| `audit_invoices` | `invoices` |
| `audit_scopes` | `scopes` |

### queue_webhooks()

When an entity changes, finds all active webhooks for the team that subscribe to the matching event name (format: `{table_name}.created`, `{table_name}.updated`, `{table_name}.deleted`) and inserts a row into `webhook_queue` with the full row as JSON payload. `SECURITY DEFINER`.

**Triggers applied to:** tasks, projects, clients, invoices, scopes.

| Trigger Name | Table |
|--------------|-------|
| `webhook_tasks` | `tasks` |
| `webhook_projects` | `projects` |
| `webhook_clients` | `clients` |
| `webhook_invoices` | `invoices` |
| `webhook_scopes` | `scopes` |

### notify_task_assigned()

When a task's `assignee_id` is set or changed, inserts a notification for the new assignee with type `'task_assigned'`.

**Trigger:** `notify_on_task_assign` AFTER INSERT OR UPDATE on `tasks`.

---

## Indexes

All defined in `003_indexes.sql`. Strategy: team-scoped partial indexes (excluding soft-deleted rows), foreign key indexes, composite indexes for common queries, GIN indexes for arrays and full-text search.

### Standard Indexes

| Index | Table | Column(s) | Notes |
|-------|-------|-----------|-------|
| `idx_users_auth_id` | `users` | `auth_id` | |
| `idx_users_email` | `users` | `email` | |
| `idx_teams_owner_id` | `teams` | `owner_id` | |
| `idx_teams_not_deleted` | `teams` | `id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_team_members_team_id` | `team_members` | `team_id` | |
| `idx_team_members_user_id` | `team_members` | `user_id` | |
| `idx_team_invites_team_id` | `team_invites` | `team_id` | |
| `idx_team_invites_email` | `team_invites` | `email` | |
| `idx_team_invites_status` | `team_invites` | `status` | Partial: `WHERE status = 'pending'` |
| `idx_clients_team_id` | `clients` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_clients_name` | `clients` | `team_id, name` | Composite |
| `idx_client_contacts_client_id` | `client_contacts` | `client_id` | |
| `idx_projects_team_id` | `projects` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_projects_client_id` | `projects` | `client_id` | |
| `idx_projects_status` | `projects` | `team_id, status` | Partial: `WHERE deleted_at IS NULL` |
| `idx_projects_owner_id` | `projects` | `owner_id` | |
| `idx_tasks_team_id` | `tasks` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_tasks_project_id` | `tasks` | `project_id` | |
| `idx_tasks_assignee_id` | `tasks` | `assignee_id` | |
| `idx_tasks_status` | `tasks` | `team_id, status` | Partial: `WHERE deleted_at IS NULL` |
| `idx_tasks_due_date` | `tasks` | `due_date` | Partial: `WHERE deleted_at IS NULL AND due_date IS NOT NULL` |
| `idx_tasks_parent_task_id` | `tasks` | `parent_task_id` | |
| `idx_campaigns_team_id` | `campaigns` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_campaigns_client_id` | `campaigns` | `client_id` | |
| `idx_campaigns_project_id` | `campaigns` | `project_id` | |
| `idx_campaigns_status` | `campaigns` | `team_id, status` | Partial: `WHERE deleted_at IS NULL` |
| `idx_notes_team_id` | `notes` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_notes_client_id` | `notes` | `client_id` | |
| `idx_notes_project_id` | `notes` | `project_id` | |
| `idx_notes_user_id` | `notes` | `user_id` | |
| `idx_notes_tags` | `notes` | `tags` | GIN |
| `idx_brain_dumps_team_id` | `brain_dumps` | `team_id` | |
| `idx_brain_dumps_user_id` | `brain_dumps` | `user_id` | |
| `idx_calendar_events_team_id` | `calendar_events` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_calendar_events_dates` | `calendar_events` | `start_time, end_time` | Partial: `WHERE deleted_at IS NULL` |
| `idx_calendar_events_user_id` | `calendar_events` | `user_id` | |
| `idx_calendar_events_task_id` | `calendar_events` | `task_id` | |
| `idx_resources_team_id` | `resources` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_resources_type` | `resources` | `team_id, type` | Partial: `WHERE deleted_at IS NULL` |
| `idx_resources_tags` | `resources` | `tags` | GIN |
| `idx_scope_templates_team_id` | `scope_templates` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_scopes_team_id` | `scopes` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_scopes_client_id` | `scopes` | `client_id` | |
| `idx_scopes_project_id` | `scopes` | `project_id` | |
| `idx_scopes_status` | `scopes` | `team_id, status` | Partial: `WHERE deleted_at IS NULL` |
| `idx_invoices_team_id` | `invoices` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_invoices_client_id` | `invoices` | `client_id` | |
| `idx_invoices_status` | `invoices` | `team_id, status` | Partial: `WHERE deleted_at IS NULL` |
| `idx_invoices_due_date` | `invoices` | `due_date` | Partial: `WHERE deleted_at IS NULL AND status IN ('sent', 'viewed')` |
| `idx_api_keys_prefix` | `api_keys` | `prefix` | Partial: `WHERE deleted_at IS NULL` |
| `idx_api_keys_team_id` | `api_keys` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_api_keys_user_id` | `api_keys` | `user_id` | |
| `idx_comments_resource` | `comments` | `resource_type, resource_id` | |
| `idx_comments_team_id` | `comments` | `team_id` | |
| `idx_comments_user_id` | `comments` | `user_id` | |
| `idx_notifications_user_id` | `notifications` | `user_id` | |
| `idx_notifications_unread` | `notifications` | `user_id, read` | Partial: `WHERE read = FALSE` |
| `idx_notifications_team_id` | `notifications` | `team_id` | |
| `idx_client_invitations_team_id` | `client_invitations` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_client_invitations_token_prefix` | `client_invitations` | `token_hash` | Partial: `WHERE status = 'pending'` |
| `idx_client_invitations_email` | `client_invitations` | `email` | |
| `idx_onboarding_team_id` | `onboarding_checklists` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_onboarding_client_id` | `onboarding_checklists` | `client_id` | |
| `idx_audit_logs_team_id` | `audit_logs` | `team_id` | |
| `idx_audit_logs_user_id` | `audit_logs` | `user_id` | |
| `idx_audit_logs_resource` | `audit_logs` | `resource_type, resource_id` | |
| `idx_audit_logs_created_at` | `audit_logs` | `team_id, created_at DESC` | |
| `idx_webhooks_team_id` | `webhooks` | `team_id` | Partial: `WHERE deleted_at IS NULL` |
| `idx_webhooks_active` | `webhooks` | `team_id, active` | Partial: `WHERE deleted_at IS NULL AND active = TRUE` |
| `idx_webhook_queue_pending` | `webhook_queue` | `next_retry_at` | Partial: `WHERE completed_at IS NULL AND failed_at IS NULL` |
| `idx_webhook_queue_webhook_id` | `webhook_queue` | `webhook_id` | |
| `idx_password_reset_prefix` | `password_reset_tokens` | `token_prefix` | Partial: `WHERE used_at IS NULL` |

### Full-Text Search Indexes (GIN)

All use `to_tsvector('english', ...)`:

| Index | Table | Columns searched |
|-------|-------|------------------|
| `idx_tasks_fts` | `tasks` | `title`, `description` |
| `idx_projects_fts` | `projects` | `title`, `description` |
| `idx_clients_fts` | `clients` | `name`, `description` |
| `idx_notes_fts` | `notes` | `title`, `content` |
| `idx_campaigns_fts` | `campaigns` | `title`, `description` |
| `idx_resources_fts` | `resources` | `name`, `description` |
