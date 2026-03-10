# LaunchCue — DB ↔ Code Map

> Complete mapping of every database table to its adapter, store, UI forms, and data flows.
> Generated 2026-03-10. Authoritative reference for debugging field mismatches.

---

## Quick Reference: Enum Types

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

Unused enums (defined but no column uses them): `deliverable_status`, `recurrence_frequency`

---

## Table-by-Table Reference

### 1. `users`

**Soft delete:** No | **Adapter:** `auth.adapter.ts` (standalone, not base repo) | **Store:** `auth.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `auth_id` | UUID | YES | — | UNIQUE |
| `name` | TEXT | NOT NULL | — | — |
| `email` | TEXT | NOT NULL | — | UNIQUE |
| `job_title` | TEXT | YES | — | — |
| `bio` | TEXT | YES | — | — |
| `avatar_url` | TEXT | YES | — | — |
| `email_verified` | BOOLEAN | YES | `FALSE` | — |
| `timezone` | TEXT | YES | `'UTC'` | — |
| `preferences` | JSONB | YES | see schema | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Field map (auth adapter):** `jobTitle` ↔ `job_title`, `avatarUrl` ↔ `avatar_url`, `emailVerified` ↔ `email_verified`

**UI writes:** Profile.vue → `AUTH_ADAPTER.updateProfile({name, jobTitle, bio, avatarUrl, timezone, preferences})`

---

### 2. `teams`

**Soft delete:** Yes | **Adapter:** `team.repository.ts` (custom, extends base) | **Store:** `team.ts` + `auth.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `name` | TEXT | NOT NULL | — | — |
| `owner_id` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**UI writes:** Team.vue → `authStore.createTeam(name)`

---

### 3. `team_members`

**Soft delete:** No | **Adapter:** `team.repository.ts` (custom methods) | **Store:** `team.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `team_id` | UUID | NOT NULL | — | `teams(id) CASCADE` |
| `user_id` | UUID | NOT NULL | — | `users(id) CASCADE` |
| `role` | team_role | NOT NULL | `'member'` | — |
| `joined_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

UNIQUE: `(team_id, user_id)`

**UI writes:** Team.vue → `teamStore.updateMemberRole(memberId, role)`, `teamStore.removeMember(memberId)`

---

### 4. `team_invites`

**Soft delete:** No | **Adapter:** `team.repository.ts` (custom methods) | **Store:** `team.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `email` | TEXT | NOT NULL | — | — |
| `team_id` | UUID | NOT NULL | — | `teams(id) CASCADE` |
| `invited_by` | UUID | NOT NULL | — | `users(id)` |
| `status` | invite_status | NOT NULL | `'pending'` | — |
| `role` | team_role | NOT NULL | `'member'` | — |
| `expires_at` | TIMESTAMPTZ | NOT NULL | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**UI writes:** Team.vue → `teamStore.inviteUser(email)`

---

### 5. `clients`

**Soft delete:** Yes | **Adapter:** `client.repository.ts` | **Store:** `client.ts`
**View:** `active_clients` | **Select:** `*, client_contacts(*)`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `name` | TEXT | NOT NULL | — | — |
| `industry` | TEXT | YES | — | — |
| `website` | TEXT | YES | — | — |
| `description` | TEXT | YES | — | — |
| `contact_name` | TEXT | YES | — | — |
| `contact_email` | TEXT | YES | — | — |
| `contact_phone` | TEXT | YES | — | — |
| `address` | TEXT | YES | — | — |
| `notes` | TEXT | YES | — | — |
| `color` | TEXT | YES | — | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_by` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `contactName` → `contact_name`, `contactEmail` → `contact_email`, `contactPhone` → `contact_phone`, `teamId` → `team_id`, `createdBy` → `created_by`

**UI writes:** Clients.vue / ClientDetail.vue → `clientStore.createClient({name, industry, website, description, color})`

---

### 6. `client_contacts`

**Soft delete:** No | **Adapter:** None (joined via client adapter `*, client_contacts(*)`) | **Store:** None (direct Supabase in ClientDetail.vue)

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `client_id` | UUID | NOT NULL | — | `clients(id) CASCADE` |
| `name` | TEXT | NOT NULL | — | — |
| `email` | TEXT | YES | — | — |
| `phone` | TEXT | YES | — | — |
| `role` | TEXT | YES | — | — |
| `is_primary` | BOOLEAN | YES | `FALSE` | — |
| `notes` | TEXT | YES | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**UI writes:** ClientDetail.vue → direct `getSupabase().from('client_contacts').insert/update()`

---

### 7. `projects`

**Soft delete:** Yes | **Adapter:** `project.repository.ts` | **Store:** `project.ts`
**View:** `active_projects`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `description` | TEXT | YES | — | — |
| `status` | project_status | NOT NULL | `'Planning'` | — |
| `client_id` | UUID | YES | — | `clients(id)` |
| `start_date` | DATE | YES | — | — |
| `due_date` | DATE | YES | — | — |
| `tags` | TEXT[] | YES | `'{}'` | — |
| `budget` | NUMERIC(12,2) | YES | — | — |
| `goals` | TEXT[] | YES | `'{}'` | — |
| `owner_id` | UUID | YES | — | `users(id)` |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_by` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `clientId` → `client_id`, `startDate` → `start_date`, `dueDate` → `due_date`, `ownerId` → `owner_id`, `teamId` → `team_id`, `createdBy` → `created_by`

**DOES NOT HAVE:** `priority`, `end_date`, `team_members` (these were bugs, now fixed)

**UI writes:** ProjectForm.vue → `projectStore.createProject({title, description, status, startDate, dueDate, budget, clientId, tags})`

**Status values (DB enum):** `'Planning'`, `'In Progress'`, `'On Hold'`, `'Completed'`, `'Cancelled'`

---

### 8. `tasks`

**Soft delete:** Yes | **Adapter:** `task.repository.ts` | **Store:** `task.ts`
**View:** `active_tasks`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `description` | TEXT | YES | — | — |
| `status` | task_status | NOT NULL | `'To Do'` | — |
| `type` | TEXT | YES | — | — |
| `priority` | task_priority | YES | `'medium'` | — |
| `project_id` | UUID | YES | — | `projects(id)` |
| `assignee_id` | UUID | YES | — | `users(id)` |
| `parent_task_id` | UUID | YES | — | `tasks(id)` |
| `due_date` | DATE | YES | — | — |
| `completed` | BOOLEAN | YES | `FALSE` | — |
| `checklist` | JSONB | YES | `'[]'::jsonb` | — |
| `tags` | TEXT[] | YES | `'{}'` | — |
| `time_estimate` | INTEGER | YES | — | — |
| `time_spent` | INTEGER | YES | — | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_by` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `projectId` → `project_id`, `assigneeId` → `assignee_id`, `parentTaskId` → `parent_task_id`, `dueDate` → `due_date`, `timeEstimate` → `time_estimate`, `timeSpent` → `time_spent`, `teamId` → `team_id`, `createdBy` → `created_by`

**Priority values (DB enum, lowercase):** `'low'`, `'medium'`, `'high'`, `'urgent'`

**Custom findAll filters:** `startDate` → `.gte('due_date')`, `endDate` → `.lte('due_date')`, `hasDueDate` → `.not('due_date', 'is', null)`, `search` → `.ilike('title')`

---

### 9. `campaigns`

**Soft delete:** Yes | **Adapter:** `campaign.repository.ts` | **Store:** `campaign.ts`
**View:** `active_campaigns`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `description` | TEXT | YES | — | — |
| `status` | campaign_status | YES | `'draft'` | — |
| `types` | TEXT[] | YES | `'{}'` | — |
| `client_id` | UUID | YES | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `start_date` | DATE | YES | — | — |
| `end_date` | DATE | YES | — | — |
| `steps` | JSONB | YES | `'[]'::jsonb` | — |
| `budget` | NUMERIC(12,2) | YES | — | — |
| `metrics` | JSONB | YES | see schema | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `clientId` → `client_id`, `projectId` → `project_id`, `startDate` → `start_date`, `endDate` → `end_date`, `teamId` → `team_id`, `userId` → `user_id`

**Note:** Campaigns correctly use `endDate` / `end_date` (unlike projects which use `dueDate` / `due_date`)

---

### 10. `notes`

**Soft delete:** Yes | **Adapter:** `note.repository.ts` | **Store:** `note.ts`
**View:** `active_notes`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `content` | TEXT | NOT NULL | `''` | — |
| `tags` | TEXT[] | YES | `'{}'` | — |
| `client_id` | UUID | YES | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `clientId` → `client_id`, `projectId` → `project_id`, `teamId` → `team_id`, `userId` → `user_id`

---

### 11. `brain_dumps`

**Soft delete:** No (hard delete) | **Adapter:** `brain-dump.repository.ts` | **Store:** `brain-dump.ts`
**View:** `brain_dumps` (no `active_` prefix)

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `content` | TEXT | YES | — | — |
| `tags` | TEXT[] | YES | `'{}'` | — |
| `client_id` | UUID | YES | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Custom methods:** `getContextData()` (AI enrichment), `createItems()` (bulk create tasks/events/projects from AI output)

---

### 12. `calendar_events`

**Soft delete:** Yes | **Adapter:** `calendar-event.repository.ts` | **Store:** `calendar.ts`
**View:** `active_calendar_events`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `title` | TEXT | NOT NULL | — | — |
| `start_time` | TIMESTAMPTZ | NOT NULL | — | — |
| `end_time` | TIMESTAMPTZ | YES | — | — |
| `all_day` | BOOLEAN | YES | `FALSE` | — |
| `description` | TEXT | YES | — | — |
| `color` | event_color | YES | `'blue'` | — |
| `client_id` | UUID | YES | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `task_id` | UUID | YES | — | `tasks(id)` |
| `recurrence` | JSONB | YES | — | — |
| `reminders` | JSONB | YES | `'[]'::jsonb` | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `start` → `start_time`, `end` → `end_time`, `allDay` → `all_day`, `clientId` → `client_id`, `projectId` → `project_id`, `taskId` → `task_id`, `teamId` → `team_id`, `userId` → `user_id`

**Custom findAll filters:** `startDate` → `.gte('start_time')`, `endDate` → `.lte('start_time')`

---

### 13. `resources`

**Soft delete:** Yes | **Adapter:** `resource.repository.ts` | **Store:** `resource.ts`
**View:** `active_resources`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `name` | TEXT | NOT NULL | — | — |
| `type` | TEXT | NOT NULL | — | — |
| `url` | TEXT | NOT NULL | — | — |
| `description` | TEXT | YES | — | — |
| `tags` | TEXT[] | YES | `'{}'` | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_by` | UUID | NOT NULL | — | `users(id)` |
| `updated_by` | UUID | YES | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**fieldMap:** `teamId` → `team_id`, `createdBy` → `created_by`, `updatedBy` → `updated_by`

---

### 14–15. `scope_templates` + `scopes`

**Soft delete:** Yes (both) | **Adapter:** `scope-template.repository.ts`, `scope.repository.ts` | **Store:** `scope.ts`
**Views:** `active_scope_templates`, `active_scopes`

**scope_templates columns:** `id`, `title`, `description`, `deliverables` (JSONB), `terms`, `tags`, `team_id`, `created_by`, `deleted_at`, `deleted_by`, `created_at`, `updated_at`

**scopes columns:** `id`, `title`, `description`, `project_id`, `client_id`, `template_id`, `deliverables` (JSONB), `terms`, `total_amount` (NUMERIC NOT NULL DEFAULT 0), `status` (scope_status), `sent_at`, `approved_at`, `team_id`, `created_by`, `deleted_at`, `deleted_by`, `created_at`, `updated_at`

**Scope status transitions:** `draft → sent`, `sent → approved | revised`, `revised → sent`

---

### 16. `invoices`

**Soft delete:** Yes | **Adapter:** `invoice.repository.ts` | **Store:** `invoice.ts`
**View:** `active_invoices`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `client_id` | UUID | NOT NULL | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `scope_id` | UUID | YES | — | `scopes(id)` |
| `invoice_number` | TEXT | NOT NULL | — | — |
| `line_items` | JSONB | YES | `'[]'::jsonb` | — |
| `subtotal` | NUMERIC(12,2) | NOT NULL | `0` | — |
| `tax` | NUMERIC(12,2) | YES | — | — |
| `tax_rate` | NUMERIC(5,4) | YES | — | — |
| `total` | NUMERIC(12,2) | NOT NULL | `0` | — |
| `currency` | TEXT | NOT NULL | `'USD'` | — |
| `status` | invoice_status | NOT NULL | `'draft'` | — |
| `notes` | TEXT | YES | — | — |
| `due_date` | DATE | YES | — | — |
| `sent_at` | TIMESTAMPTZ | YES | — | — |
| `paid_at` | TIMESTAMPTZ | YES | — | — |
| `paid_amount` | NUMERIC(12,2) | YES | — | — |
| `created_by` | UUID | NOT NULL | — | `users(id)` |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

UNIQUE: `(team_id, invoice_number)`

**Custom create:** Auto-generates `invoice_number` via `sb.rpc('generate_invoice_number', { p_team_id })`
**Custom findAll filters:** `dateFrom` → `.gte('created_at')`, `dateTo` → `.lte('created_at')`

---

### 17. `api_keys`

**Soft delete:** Yes | **Adapter:** `api-key.repository.ts` | **Store:** `api-key.ts`
**View:** `active_api_keys`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `name` | TEXT | NOT NULL | — | — |
| `prefix` | TEXT | NOT NULL | — | — |
| `key_hash` | TEXT | NOT NULL | — | — |
| `scopes` | TEXT[] | NOT NULL | `'{}'` | — |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `last_used_at` | TIMESTAMPTZ | YES | — | — |
| `expires_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Note:** No `updated_at` column.

---

### 18. `comments`

**Soft delete:** No (hard delete) | **Adapter:** `comment.repository.ts` (standalone, NOT base repo) | **Store:** `comment.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `resource_type` | TEXT | NOT NULL | — | — |
| `resource_id` | UUID | NOT NULL | — | — |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `content` | TEXT | NOT NULL | — | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

CHECK: `resource_type IN ('task', 'project', 'client', 'note')`

**Select includes join:** `*, users(name)` (for `userName` display)

---

### 19. `notifications`

**Soft delete:** No (hard delete) | **Adapter:** `notification.repository.ts` (standalone, NOT base repo) | **Store:** `notification.ts`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `type` | notification_type | NOT NULL | — | — |
| `title` | TEXT | NOT NULL | — | — |
| `message` | TEXT | NOT NULL | — | — |
| `read` | BOOLEAN | YES | `FALSE` | — |
| `resource_type` | TEXT | YES | — | — |
| `resource_id` | UUID | YES | — | — |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Note:** No `updated_at`. INSERT restricted to `service_role` only (migration 009).

---

### 20. `client_invitations`

**Soft delete:** Yes | **Adapter:** `client-invitation.repository.ts` | **Store:** `onboarding.ts`
**View:** `active_client_invitations`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `client_id` | UUID | NOT NULL | — | `clients(id)` |
| `project_ids` | UUID[] | YES | `'{}'` | — |
| `email` | TEXT | NOT NULL | — | — |
| `name` | TEXT | NOT NULL | — | — |
| `role` | TEXT | NOT NULL | `'client'` | — |
| `invited_by` | UUID | NOT NULL | — | `users(id)` |
| `token` | TEXT | YES | — | — |
| `token_hash` | TEXT | YES | — | — |
| `status` | invite_status | NOT NULL | `'pending'` | — |
| `expires_at` | TIMESTAMPTZ | NOT NULL | — | — |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

---

### 21. `onboarding_checklists`

**Soft delete:** Yes | **Adapter:** `onboarding.repository.ts` | **Store:** `onboarding.ts`
**View:** `active_onboarding_checklists`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `client_id` | UUID | NOT NULL | — | `clients(id)` |
| `project_id` | UUID | YES | — | `projects(id)` |
| `title` | TEXT | NOT NULL | — | — |
| `steps` | JSONB | YES | `'[]'::jsonb` | — |
| `status` | onboarding_status | NOT NULL | `'not-started'` | — |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

---

### 22. `audit_logs`

**Soft delete:** No (append-only) | **Adapter:** `audit-log.repository.ts` | **Store:** `audit-log.ts` (read-only)

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `user_id` | UUID | NOT NULL | — | `users(id)` |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `action` | TEXT | NOT NULL | — | — |
| `resource_type` | TEXT | NOT NULL | — | — |
| `resource_id` | UUID | YES | — | — |
| `changes` | JSONB | YES | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Note:** Adapter throws on create/update/delete. System-generated only via DB triggers.

---

### 23. `webhooks`

**Soft delete:** Yes | **Adapter:** `webhook.repository.ts` | **Store:** `webhook.ts`
**View:** `active_webhooks`

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `team_id` | UUID | NOT NULL | — | `teams(id)` |
| `url` | TEXT | NOT NULL | — | — |
| `events` | TEXT[] | NOT NULL | `'{}'` | — |
| `secret` | TEXT | NOT NULL | — | — |
| `active` | BOOLEAN | YES | `TRUE` | — |
| `deleted_at` | TIMESTAMPTZ | YES | — | — |
| `deleted_by` | UUID | YES | — | `users(id)` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

**Custom create:** Auto-generates `secret` if not provided (`'whsec_' + 64 hex chars`)

---

### 24. `webhook_queue`

**Soft delete:** No | **RLS:** Disabled (service_role only) | **Adapter:** None (Express server only)

| Column | Type | Null | Default | FK |
|--------|------|------|---------|----|
| `id` | UUID | NOT NULL | `uuid_generate_v4()` | PK |
| `webhook_id` | UUID | NOT NULL | — | `webhooks(id)` |
| `event` | TEXT | NOT NULL | — | — |
| `payload` | JSONB | NOT NULL | — | — |
| `attempts` | INTEGER | YES | `0` | — |
| `max_attempts` | INTEGER | YES | `5` | — |
| `next_retry_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |
| `completed_at` | TIMESTAMPTZ | YES | — | — |
| `failed_at` | TIMESTAMPTZ | YES | — | — |
| `last_error` | TEXT | YES | — | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `NOW()` | — |

---

### 25–26. `password_reset_tokens` + `email_verification_tokens`

**Soft delete:** No (hard delete after use) | **Adapter:** `auth.adapter.ts` | **No direct UI**

Internal auth tables managed by Supabase Auth / GoTrue.

---

## Delete Behavior Summary

| Hard Delete | Soft Delete | Immutable |
|-------------|-------------|-----------|
| brain_dumps, comments, notifications | tasks, projects, clients, campaigns, calendar_events, notes, resources, invoices, scopes, scope_templates, onboarding_checklists, client_invitations, api_keys, webhooks, teams | audit_logs |

---

## Known Architectural Patterns

### Direct Supabase Access (bypasses store/adapter)
- `ClientDetail.vue` — contact CRUD via `getSupabase().from('client_contacts')`
- `InvoiceBuilder.vue` — loads via `INVOICE_REPO.findById()` (bypasses store cache)
- `ScopeBuilder.vue` — loads via `SCOPE_REPO` / `SCOPE_TEMPLATE_REPO` directly
- `Profile.vue` — uses `AUTH_ADAPTER.updateProfile()` directly
- All portal pages — use repos directly (acceptable, different auth context)

### Project Team Members
- `ProjectDetail.vue` has add/remove team member UI
- **No DB column** for this — `projects` table has no `team_members` field
- Operations are local-only (lost on page reload)

*Last updated: 2026-03-10*
