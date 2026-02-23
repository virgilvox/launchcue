# LaunchCue Database Schema Documentation

MongoDB database schema reference for the LaunchCue DevRel management platform.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Relationships Diagram](#relationships-diagram)
3. [Collections](#collections)
   - [users](#users)
   - [teams](#teams)
   - [teamInvites](#teaminvites)
   - [clients](#clients)
   - [projects](#projects)
   - [tasks](#tasks)
   - [campaigns](#campaigns)
   - [notes](#notes)
   - [braindumps](#braindumps)
   - [calendarEvents](#calendarevents)
   - [resources](#resources)
   - [comments](#comments)
   - [notifications](#notifications)
   - [apiKeys](#apikeys)
   - [webhooks](#webhooks)
   - [auditLogs](#auditlogs)
   - [tokenBlocklist](#tokenblocklist)
   - [rateLimits](#ratelimits)
   - [passwordResets](#passwordresets)
   - [emailVerifications](#emailverifications)

---

## Conventions

### Timestamps

All domain collections include standard timestamp fields:

| Field       | Type   | Description                        |
|-------------|--------|------------------------------------|
| `createdAt` | `Date` | Set on document creation           |
| `updatedAt` | `Date` | Updated on every modification      |

### Multi-Tenancy

Most collections include a `teamId` field (string, required) that scopes documents to a specific team. All queries filter by `teamId` to enforce tenant isolation. Exceptions: `users`, `notifications`, `tokenBlocklist`, `rateLimits`, `passwordResets`, `emailVerifications`.

### Soft Delete

Many collections use soft deletion rather than hard deletion. Soft-deleted documents have:

| Field       | Type            | Description                                    |
|-------------|-----------------|------------------------------------------------|
| `deletedAt` | `Date \| null`  | Timestamp of deletion; `null` when not deleted |
| `deletedBy` | `String \| null`| User ID of the person who deleted              |

All list queries include the filter `{ deletedAt: null }` to exclude soft-deleted documents.

**Collections using soft delete:** `clients`, `projects`, `tasks`, `campaigns`, `notes`, `braindumps`, `comments`.

**Collections using hard delete:** `calendarEvents`, `resources`, `webhooks`, `apiKeys`, `notifications`, `teams`.

### ID Format

MongoDB `_id` (ObjectId) is mapped to a string `id` field in API responses. The `_id` field is stripped before returning documents.

### TTL Collections

Two collections use MongoDB TTL indexes for automatic expiration:

- **`tokenBlocklist`** -- TTL index on `expiresAt` (entries auto-deleted after token expiry)
- **`rateLimits`** -- TTL index on `expiresAt` (entries auto-deleted after rate limit window)

---

## Relationships Diagram

```
users
  |
  +--< teams.members[].userId          (user belongs to many teams)
  +--< teams.owner                     (user owns a team)
  +--< notifications.userId            (user receives notifications)
  +--< comments.userId                 (user authors comments)
  +--< apiKeys.userId                  (user owns API keys)
  +--< auditLogs.userId                (user performs audited actions)
  +--< passwordResets.userId           (user requests password reset)
  +--< emailVerifications.userId       (user verifies email)

teams
  |
  +--< clients.teamId                  (team has many clients)
  +--< projects.teamId                 (team has many projects)
  +--< tasks.teamId                    (team has many tasks)
  +--< campaigns.teamId                (team has many campaigns)
  +--< notes.teamId                    (team has many notes)
  +--< braindumps.teamId               (team has many brain dumps)
  +--< calendarEvents.teamId           (team has many calendar events)
  +--< resources.teamId                (team has many resources)
  +--< comments.teamId                 (team scopes comments)
  +--< webhooks.teamId                 (team has many webhooks)
  +--< apiKeys.teamId                  (team scopes API keys)
  +--< auditLogs.teamId                (team scopes audit logs)
  +--< teamInvites.teamId              (team has many invites)

clients
  |
  +--< projects.clientId               (client has many projects)
  +--< campaigns.clientId              (client linked to campaigns)
  +--< notes.clientId                  (client linked to notes)
  +--< braindumps.clientId             (client linked to brain dumps)
  +--< calendarEvents.clientId         (client linked to calendar events)

projects
  |
  +--< tasks.projectId                 (project has many tasks)
  +--< campaigns.projectId             (project linked to campaigns)
  +--< notes.projectId                 (project linked to notes)
  +--< braindumps.projectId            (project linked to brain dumps)
  +--< calendarEvents.projectId        (project linked to calendar events)

tasks
  |
  +--< calendarEvents.taskId           (task synced to calendar event)
  +--< tasks.parentTaskId              (task has subtasks -- self-referencing)

comments -- polymorphic via (resourceType, resourceId)
  |
  +---- task | project | client | note  (comments attach to any of these)

notifications -- polymorphic via (resourceType, resourceId)
  |
  +---- task | project | client | etc.  (notifications reference any resource)

auditLogs -- polymorphic via (resourceType, resourceId)
  |
  +---- task | project | client | etc.  (audit logs track any resource)
```

---

## Collections

### users

Registered user accounts. Created during registration.

| Field            | Type     | Required | Default | Description                                     |
|------------------|----------|----------|---------|-------------------------------------------------|
| `_id`            | ObjectId | auto     |         | MongoDB document ID                             |
| `name`           | String   | yes      |         | Display name                                    |
| `email`          | String   | yes      |         | Unique, stored lowercase                        |
| `password`       | String   | yes      |         | bcrypt-hashed password                          |
| `emailVerified`  | Boolean  | no       | `false` | Whether email has been verified                 |
| `jobTitle`       | String   | no       |         | User's job title                                |
| `bio`            | String   | no       |         | Short biography                                 |
| `avatarUrl`      | String   | no       |         | URL to avatar image                             |
| `timezone`       | String   | no       |         | IANA timezone string                            |
| `preferences`    | Object   | no       |         | User preferences (see sub-fields below)         |
| `createdAt`      | Date     | yes      |         | Account creation timestamp                      |
| `updatedAt`      | Date     | yes      |         | Last update timestamp                           |

**`preferences` sub-fields:**

| Field                       | Type    | Description                          |
|-----------------------------|---------|--------------------------------------|
| `preferences.theme`         | String  | `'light'`, `'dark'`, or `'system'`   |
| `preferences.notifications` | Object  | `{ email: Boolean, inApp: Boolean }` |

**Indexes:**

| Fields    | Options          |
|-----------|------------------|
| `email`   | `{ unique: true }` |

---

### teams

Team/organization for multi-tenancy. Members are stored as an embedded array.

| Field       | Type     | Required | Default | Description                          |
|-------------|----------|----------|---------|--------------------------------------|
| `_id`       | ObjectId | auto     |         | MongoDB document ID                  |
| `name`      | String   | yes      |         | Team display name                    |
| `owner`     | String   | yes      |         | User ID of the team owner            |
| `members`   | Array    | yes      |         | Embedded array of `TeamMember`       |
| `createdAt` | Date     | yes      |         | Team creation timestamp              |
| `updatedAt` | Date     | no       |         | Last update timestamp                |

**`members[]` sub-fields (TeamMember):**

| Field      | Type   | Required | Description                                        |
|------------|--------|----------|----------------------------------------------------|
| `userId`   | String | yes      | References `users._id`                             |
| `email`    | String | yes      | Member's email                                     |
| `name`     | String | yes      | Member's display name                              |
| `role`     | String | yes      | `'owner'`, `'admin'`, `'member'`, or `'viewer'`    |
| `joinedAt` | Date   | yes      | When the member joined                             |

**Indexes:**

| Fields              | Options |
|---------------------|---------|
| `members.userId`    |         |

---

### teamInvites

Pending invitations to join a team. (Note: the current implementation directly adds users to teams, but the collection and schema exist for future invite-flow support.)

| Field       | Type     | Required | Default     | Description                                      |
|-------------|----------|----------|-------------|--------------------------------------------------|
| `_id`       | ObjectId | auto     |             | MongoDB document ID                              |
| `email`     | String   | yes      |             | Invitee email                                    |
| `teamId`    | String   | yes      |             | References `teams._id`                           |
| `invitedBy` | String   | yes      |             | User ID of inviter                               |
| `status`    | String   | yes      | `'pending'` | `'pending'`, `'accepted'`, `'rejected'`, `'expired'` |
| `role`      | String   | yes      |             | Role to grant on acceptance                      |
| `expiresAt` | Date     | yes      |             | Invite expiration                                |
| `createdAt` | Date     | yes      |             | Invite creation timestamp                        |
| `updatedAt` | Date     | yes      |             | Last update timestamp                            |

**Indexes:**

| Fields           | Options |
|------------------|---------|
| `email, teamId`  |         |

---

### clients

Client organizations managed by a team.

| Field          | Type     | Required | Default | Description                        |
|----------------|----------|----------|---------|------------------------------------|
| `_id`          | ObjectId | auto     |         | MongoDB document ID                |
| `name`         | String   | yes      |         | Client company name                |
| `industry`     | String   | no       | `''`    | Industry sector                    |
| `website`      | String   | no       | `''`    | Client website URL                 |
| `description`  | String   | no       | `''`    | Description of the client          |
| `contactName`  | String   | no       | `''`    | Primary contact name (legacy)      |
| `contactEmail` | String   | no       | `''`    | Primary contact email (legacy)     |
| `contactPhone` | String   | no       | `''`    | Primary contact phone (legacy)     |
| `address`      | String   | no       | `''`    | Client address                     |
| `notes`        | String   | no       | `''`    | Free-form notes                    |
| `contacts`     | Array    | no       | `[]`    | Embedded array of `Contact`        |
| `teamId`       | String   | yes      |         | References `teams._id`             |
| `createdBy`    | String   | yes      |         | References `users._id`             |
| `createdAt`    | Date     | yes      |         | Creation timestamp                 |
| `updatedAt`    | Date     | yes      |         | Last update timestamp              |
| `deletedAt`    | Date     | no       | `null`  | Soft delete timestamp              |
| `deletedBy`    | String   | no       | `null`  | User who soft-deleted              |

**`contacts[]` sub-fields (Contact):**

| Field       | Type    | Required | Default | Description                      |
|-------------|---------|----------|---------|----------------------------------|
| `id`        | String  | yes      |         | Client-generated or ObjectId     |
| `name`      | String  | yes      |         | Contact person name              |
| `email`     | String  | no       |         | Contact email                    |
| `phone`     | String  | no       |         | Contact phone number             |
| `role`      | String  | no       |         | Contact's role at the company    |
| `isPrimary` | Boolean | no       | `false` | Whether this is the primary contact |
| `notes`     | String  | no       |         | Notes about this contact         |
| `createdAt` | Date    | yes      |         | Contact creation timestamp       |
| `updatedAt` | Date    | yes      |         | Contact last update timestamp    |

**Indexes:**

| Fields  | Options |
|---------|---------|
| `teamId` |       |
| `name, description` | Text index (full-text search) |

**Cascade protections:** Cannot delete a client that has active (non-Completed, non-Cancelled) projects.

---

### projects

Projects belong to a team and are associated with a client.

| Field        | Type     | Required | Default      | Description                                      |
|--------------|----------|----------|--------------|--------------------------------------------------|
| `_id`        | ObjectId | auto     |              | MongoDB document ID                              |
| `title`      | String   | yes      |              | Project title                                    |
| `description`| String   | no       | `''`         | Project description                              |
| `status`     | String   | no       | `'Planning'` | `'Planning'`, `'In Progress'`, `'On Hold'`, `'Completed'`, `'Cancelled'` |
| `clientId`   | String   | yes      |              | References `clients._id`                         |
| `startDate`  | Date     | no       | `null`       | Project start date                               |
| `dueDate`    | Date     | no       | `null`       | Project due date                                 |
| `tags`       | Array    | no       | `[]`         | Array of string tags                             |
| `budget`     | Number   | no       | `null`       | Project budget                                   |
| `goals`      | Array    | no       |              | Array of goal strings                            |
| `ownerId`    | String   | no       |              | References `users._id` (project owner)           |
| `teamId`     | String   | yes      |              | References `teams._id`                           |
| `createdBy`  | String   | yes      |              | References `users._id`                           |
| `createdAt`  | Date     | yes      |              | Creation timestamp                               |
| `updatedAt`  | Date     | yes      |              | Last update timestamp                            |
| `deletedAt`  | Date     | no       | `null`       | Soft delete timestamp                            |
| `deletedBy`  | String   | no       | `null`       | User who soft-deleted                            |

**Indexes:**

| Fields              | Options |
|---------------------|---------|
| `teamId`            |         |
| `teamId, clientId`  |         |
| `teamId, status`    |         |
| `teamId, dueDate`   |         |
| `title, description`| Text index (full-text search) |

**Side effects:** Creating/updating a project with a `dueDate` syncs a calendar event (auto-creates/updates a `calendarEvents` document with `taskId: null`). Deleting a project removes its synced calendar event.

---

### tasks

Tasks belong to a team, optionally linked to a project. Supports assignees, priorities, checklists, and subtasks.

| Field          | Type     | Required | Default     | Description                                            |
|----------------|----------|----------|-------------|--------------------------------------------------------|
| `_id`          | ObjectId | auto     |             | MongoDB document ID                                    |
| `title`        | String   | yes      |             | Task title (max 200 chars)                             |
| `description`  | String   | no       |             | Task description (max 5000 chars)                      |
| `status`       | String   | no       | `'To Do'`   | `'To Do'`, `'In Progress'`, `'Blocked'`, `'Done'`      |
| `type`         | String   | no       | `'task'`    | Task type (free-form string)                           |
| `priority`     | String   | no       | `'medium'`  | `'low'`, `'medium'`, `'high'`, `'urgent'`              |
| `projectId`    | String   | no       | `null`      | References `projects._id`                              |
| `assigneeId`   | String   | no       | `null`      | References `users._id` (assigned team member)          |
| `parentTaskId` | String   | no       | `null`      | References `tasks._id` (for subtasks)                  |
| `dueDate`      | Date     | no       | `null`      | Task due date                                          |
| `checklist`    | Array    | no       | `[]`        | Embedded array of `ChecklistItem`                      |
| `tags`         | Array    | no       | `[]`        | Array of string tags                                   |
| `timeEstimate` | Number   | no       |             | Estimated time in minutes                              |
| `timeSpent`    | Number   | no       |             | Actual time spent in minutes                           |
| `teamId`       | String   | yes      |             | References `teams._id`                                 |
| `createdBy`    | String   | yes      |             | References `users._id`                                 |
| `createdAt`    | Date     | yes      |             | Creation timestamp                                     |
| `updatedAt`    | Date     | yes      |             | Last update timestamp                                  |
| `deletedAt`    | Date     | no       | `null`      | Soft delete timestamp                                  |
| `deletedBy`    | String   | no       | `null`      | User who soft-deleted                                  |

**`checklist[]` sub-fields (ChecklistItem):**

| Field       | Type    | Required | Default | Description              |
|-------------|---------|----------|---------|--------------------------|
| `id`        | String  | no       |         | Client-generated ID      |
| `title`     | String  | yes      |         | Checklist item text      |
| `completed` | Boolean | no       | `false` | Whether item is done     |

**Indexes:**

| Fields                | Options |
|-----------------------|---------|
| `teamId`              |         |
| `teamId, projectId`   |         |
| `teamId, status`      |         |
| `teamId, dueDate`     |         |
| `teamId, assigneeId`  |         |
| `title, description`  | Text index (full-text search) |

**Side effects:** Creating/updating a task with a `dueDate` syncs a calendar event (auto-creates/updates a `calendarEvents` document with `taskId` set). Deleting a task removes its synced calendar event.

---

### campaigns

Marketing/DevRel campaigns with steps, budgets, and metrics.

| Field        | Type     | Required | Default   | Description                                          |
|--------------|----------|----------|-----------|------------------------------------------------------|
| `_id`        | ObjectId | auto     |           | MongoDB document ID                                  |
| `title`      | String   | yes      |           | Campaign title (max 200 chars)                       |
| `description`| String   | no       |           | Campaign description                                 |
| `status`     | String   | no       | `'draft'` | `'draft'`, `'active'`, `'paused'`, `'completed'`     |
| `types`      | Array    | no       |           | Array of campaign type strings (e.g. "Docs", "Blog") |
| `clientId`   | String   | no       | `null`    | References `clients._id`                             |
| `projectId`  | String   | no       | `null`    | References `projects._id`                            |
| `startDate`  | Date     | no       | `null`    | Campaign start date                                  |
| `endDate`    | Date     | no       | `null`    | Campaign end date                                    |
| `steps`      | Array    | no       | `[]`      | Embedded array of `CampaignStep`                     |
| `budget`     | Number   | no       | `null`    | Campaign budget                                      |
| `metrics`    | Object   | no       |           | Campaign performance metrics (see below)             |
| `teamId`     | String   | yes      |           | References `teams._id`                               |
| `userId`     | String   | yes      |           | References `users._id` (creator)                     |
| `createdAt`  | Date     | yes      |           | Creation timestamp                                   |
| `updatedAt`  | Date     | yes      |           | Last update timestamp                                |
| `deletedAt`  | Date     | no       | `null`    | Soft delete timestamp                                |
| `deletedBy`  | String   | no       | `null`    | User who soft-deleted                                |

**`steps[]` sub-fields (CampaignStep):**

| Field         | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| `id`          | ObjectId/String | yes | Step ID (auto-generated ObjectId)  |
| `title`       | String | yes      | Step title                           |
| `description` | String | no       | Step description                     |
| `date`        | String | yes      | ISO 8601 datetime for the step       |
| `assigneeId`  | String | no       | References `users._id`               |

**`metrics` sub-fields (CampaignMetrics):**

| Field         | Type   | Description         |
|---------------|--------|---------------------|
| `reach`       | Number | Audience reach      |
| `engagement`  | Number | Engagement metric   |
| `conversions` | Number | Conversion count    |

**Indexes:**

| Fields            | Options |
|-------------------|---------|
| `teamId`          |         |
| `teamId, clientId`|         |

---

### notes

Rich text notes linked to clients/projects.

| Field        | Type     | Required | Default | Description                     |
|--------------|----------|----------|---------|---------------------------------|
| `_id`        | ObjectId | auto     |         | MongoDB document ID             |
| `title`      | String   | yes      |         | Note title (max 200 chars)      |
| `content`    | String   | yes      |         | Note content (HTML/rich text)   |
| `tags`       | Array    | no       | `[]`    | Array of string tags            |
| `clientId`   | String   | no       | `null`  | References `clients._id`        |
| `projectId`  | String   | no       | `null`  | References `projects._id`       |
| `teamId`     | String   | yes      |         | References `teams._id`          |
| `userId`     | String   | yes      |         | References `users._id` (author) |
| `createdAt`  | Date     | yes      |         | Creation timestamp              |
| `updatedAt`  | Date     | yes      |         | Last update timestamp           |
| `deletedAt`  | Date     | no       | `null`  | Soft delete timestamp           |
| `deletedBy`  | String   | no       | `null`  | User who soft-deleted           |

**Indexes:**

| Fields              | Options |
|---------------------|---------|
| `teamId`            |         |
| `teamId, projectId` |         |
| `title, content`    | Text index (full-text search) |

---

### braindumps

Quick idea captures / brain dumps.

| Field        | Type     | Required | Default | Description                     |
|--------------|----------|----------|---------|---------------------------------|
| `_id`        | ObjectId | auto     |         | MongoDB document ID             |
| `title`      | String   | yes      |         | Brain dump title (max 200)      |
| `content`    | String   | no       |         | Brain dump content              |
| `tags`       | Array    | no       |         | Array of string tags            |
| `clientId`   | String   | no       | `null`  | References `clients._id`        |
| `projectId`  | String   | no       | `null`  | References `projects._id`       |
| `teamId`     | String   | yes      |         | References `teams._id`          |
| `userId`     | String   | yes      |         | References `users._id` (author) |
| `createdAt`  | Date     | yes      |         | Creation timestamp              |
| `updatedAt`  | Date     | yes      |         | Last update timestamp           |
| `deletedAt`  | Date     | no       | `null`  | Soft delete timestamp           |
| `deletedBy`  | String   | no       | `null`  | User who soft-deleted           |

**Indexes:**

| Fields   | Options |
|----------|---------|
| `teamId` |         |

---

### calendarEvents

Calendar events with optional recurrence and reminders. Includes both user-created events and auto-synced events from tasks/projects.

| Field        | Type     | Required | Default | Description                                           |
|--------------|----------|----------|---------|-------------------------------------------------------|
| `_id`        | ObjectId | auto     |         | MongoDB document ID                                   |
| `title`      | String   | yes      |         | Event title (max 200 chars)                           |
| `start`      | Date     | yes      |         | Event start date/time                                 |
| `end`        | Date     | no       | `null`  | Event end date/time                                   |
| `allDay`     | Boolean  | no       | `false` | Whether this is an all-day event                      |
| `description`| String   | no       |         | Event description                                     |
| `color`      | String   | no       |         | `'blue'`, `'green'`, `'orange'`, `'red'`, `'purple'`  |
| `clientId`   | String   | no       | `null`  | References `clients._id`                              |
| `projectId`  | String   | no       | `null`  | References `projects._id`                             |
| `taskId`     | String   | no       | `null`  | References `tasks._id` (for task-synced events)       |
| `recurrence` | Object   | no       | `null`  | Recurrence rule (see below)                           |
| `reminders`  | Array    | no       | `[]`    | Array of reminder objects (see below)                 |
| `teamId`     | String   | yes      |         | References `teams._id`                                |
| `userId`     | String   | yes      |         | References `users._id` (creator)                      |
| `createdAt`  | Date     | yes      |         | Creation timestamp                                    |
| `updatedAt`  | Date     | yes      |         | Last update timestamp                                 |

**`recurrence` sub-fields (EventRecurrence):**

| Field       | Type   | Required | Description                                       |
|-------------|--------|----------|---------------------------------------------------|
| `frequency` | String | yes      | `'daily'`, `'weekly'`, `'monthly'`, `'yearly'`    |
| `interval`  | Number | yes      | Repeat every N frequency units (min 1)            |
| `endDate`   | String | no       | ISO 8601 date when recurrence ends                |

**`reminders[]` sub-fields (EventReminder):**

| Field           | Type   | Required | Description                       |
|-----------------|--------|----------|-----------------------------------|
| `type`          | String | yes      | `'email'` or `'inApp'`           |
| `minutesBefore` | Number | yes     | Minutes before event to trigger   |

**Indexes:**

| Fields                  | Options |
|-------------------------|---------|
| `teamId, start, end`    |         |
| `teamId, projectId`     |         |

**Note:** Calendar events are hard-deleted (no soft delete). Task-synced events are identified by having a non-null `taskId`. Project-synced events have a `projectId` and `taskId: null`.

---

### resources

External links and resource bookmarks.

| Field        | Type     | Required | Default | Description                        |
|--------------|----------|----------|---------|------------------------------------|
| `_id`        | ObjectId | auto     |         | MongoDB document ID                |
| `name`       | String   | yes      |         | Resource name                      |
| `type`       | String   | yes      |         | Resource type (e.g. "doc", "tool") |
| `url`        | String   | yes      |         | Resource URL (must be valid URL)   |
| `description`| String   | no       |         | Resource description               |
| `tags`       | Array    | no       | `[]`    | Array of string tags               |
| `teamId`     | String   | yes      |         | References `teams._id`             |
| `createdBy`  | String   | yes      |         | References `users._id`             |
| `updatedBy`  | String   | no       |         | References `users._id` (last editor) |
| `createdAt`  | Date     | yes      |         | Creation timestamp                 |
| `updatedAt`  | Date     | yes      |         | Last update timestamp              |

**Indexes:**

| Fields   | Options |
|----------|---------|
| `teamId` |         |

**Note:** Resources are hard-deleted (no soft delete).

---

### comments

Polymorphic comments that can attach to tasks, projects, clients, or notes.

| Field          | Type     | Required | Default | Description                                   |
|----------------|----------|----------|---------|-----------------------------------------------|
| `_id`          | ObjectId | auto     |         | MongoDB document ID                           |
| `resourceType` | String   | yes      |         | `'task'`, `'project'`, `'client'`, `'note'`   |
| `resourceId`   | String   | yes      |         | ID of the parent resource                     |
| `userId`       | String   | yes      |         | References `users._id` (author)               |
| `content`      | String   | yes      |         | Comment text (max 5000 chars)                 |
| `teamId`       | String   | yes      |         | References `teams._id`                        |
| `createdAt`    | Date     | yes      |         | Creation timestamp                            |
| `updatedAt`    | Date     | yes      |         | Last update timestamp                         |
| `deletedAt`    | Date     | no       | `null`  | Soft delete timestamp                         |
| `deletedBy`    | String   | no       | `null`  | User who soft-deleted                         |

**Indexes:**

| Fields                      | Options |
|-----------------------------|---------|
| `resourceType, resourceId`  |         |
| `userId`                    |         |

**Access control:** Users can only edit or delete their own comments.

---

### notifications

In-app notifications delivered to specific users.

| Field          | Type     | Required | Default | Description                                         |
|----------------|----------|----------|---------|-----------------------------------------------------|
| `_id`          | ObjectId | auto     |         | MongoDB document ID                                 |
| `userId`       | String   | yes      |         | References `users._id` (recipient)                  |
| `type`         | String   | yes      |         | `'task_assigned'`, `'deadline_approaching'`, `'team_invite'`, `'mention'`, `'comment'` |
| `title`        | String   | yes      |         | Short notification title                            |
| `message`      | String   | yes      |         | Notification body text                              |
| `read`         | Boolean  | yes      | `false` | Whether the notification has been read              |
| `resourceType` | String   | no       |         | Related resource type (e.g. `'task'`, `'project'`)  |
| `resourceId`   | String   | no       |         | Related resource ID                                 |
| `createdAt`    | Date     | yes      |         | Creation timestamp                                  |

**Indexes:**

| Fields               | Options |
|----------------------|---------|
| `userId, read`       |         |
| `userId, createdAt`  | `{ createdAt: -1 }` (descending) |

**Note:** Notifications do not have `teamId` scoping -- they are scoped to `userId`. They are hard-deleted.

---

### apiKeys

API keys for programmatic access. The full key is shown once on creation; only the bcrypt hash is stored.

| Field        | Type     | Required | Default | Description                                     |
|--------------|----------|----------|---------|-------------------------------------------------|
| `_id`        | ObjectId | auto     |         | MongoDB document ID                             |
| `name`       | String   | yes      |         | Human-readable key name (max 100)               |
| `prefix`     | String   | yes      |         | Key prefix for lookup (e.g. `lc_sk_abcdef12`)   |
| `hashedKey`  | String   | yes      |         | bcrypt hash of the full API key                 |
| `scopes`     | Array    | yes      |         | Array of scope strings (see Scopes below)       |
| `userId`     | String   | yes      |         | References `users._id` (key owner)              |
| `teamId`     | String   | yes      |         | References `teams._id`                          |
| `expiresAt`  | Date     | no       | `null`  | Optional expiration date                        |
| `createdAt`  | Date     | yes      |         | Creation timestamp                              |
| `lastUsedAt` | Date     | no       | `null`  | Last time the key was used for authentication   |

**Available scopes:**

```
read:projects, write:projects, read:tasks, write:tasks,
read:clients, write:clients, read:campaigns, write:campaigns,
read:notes, write:notes, read:teams, write:teams,
read:resources, write:resources, read:calendar-events, write:calendar-events,
read:braindumps, write:braindumps, read:api-keys, write:api-keys
```

**Indexes:**

| Fields   | Options            |
|----------|--------------------|
| `prefix` | `{ unique: true }` |
| `userId` |                    |

---

### webhooks

Outbound webhook subscriptions for team event notifications.

| Field       | Type     | Required | Default | Description                                   |
|-------------|----------|----------|---------|-----------------------------------------------|
| `_id`       | ObjectId | auto     |         | MongoDB document ID                           |
| `url`       | String   | yes      |         | Webhook endpoint URL                          |
| `events`    | Array    | yes      |         | Array of event type strings (see below)       |
| `secret`    | String   | yes      |         | HMAC signing secret (auto-generated if omitted) |
| `active`    | Boolean  | no       | `true`  | Whether the webhook is active                 |
| `teamId`    | String   | yes      |         | References `teams._id`                        |
| `userId`    | String   | yes      |         | References `users._id` (creator)              |
| `createdAt` | Date     | yes      |         | Creation timestamp                            |
| `updatedAt` | Date     | yes      |         | Last update timestamp                         |

**Available events:**

```
task.created, task.updated, task.deleted,
project.created, project.updated, project.deleted,
client.created, client.updated, client.deleted,
campaign.created, campaign.updated
```

**Note:** Webhooks are hard-deleted. The `secret` is returned in full only on creation; subsequent GET requests return a masked version (`secretMask`).

---

### auditLogs

Immutable audit trail of actions performed within a team. Read-only via the API.

| Field          | Type     | Required | Description                                        |
|----------------|----------|----------|----------------------------------------------------|
| `_id`          | ObjectId | auto     | MongoDB document ID                                |
| `userId`       | String   | yes      | References `users._id` (actor)                     |
| `teamId`       | String   | yes      | References `teams._id`                             |
| `action`       | String   | yes      | `'create'`, `'update'`, `'delete'`                 |
| `resourceType` | String   | yes      | Resource type (e.g. `'task'`, `'project'`, `'client'`) |
| `resourceId`   | String   | yes      | ID of the affected resource                        |
| `changes`      | Object   | no       | `{ field: { from: oldValue, to: newValue } }`      |
| `timestamp`    | Date     | yes      | When the action occurred                           |

**Indexes:**

| Fields                     | Options                        |
|----------------------------|--------------------------------|
| `teamId, timestamp`        | `{ timestamp: -1 }` (descending) |
| `resourceType, resourceId` |                                |

**Note:** Audit logs use `timestamp` rather than `createdAt`/`updatedAt` since they are immutable.

---

### tokenBlocklist

Revoked JWT tokens. Uses a TTL index for automatic cleanup after token expiration.

| Field       | Type     | Required | Description                                  |
|-------------|----------|----------|----------------------------------------------|
| `_id`       | ObjectId | auto     | MongoDB document ID                          |
| `jti`       | String   | yes      | JWT ID (`jti` claim) of the revoked token    |
| `revokedAt` | Date     | yes      | When the token was revoked                   |
| `expiresAt` | Date     | yes      | Token expiration (TTL index auto-deletes)    |

**Indexes:**

| Fields      | Options                        |
|-------------|--------------------------------|
| `expiresAt` | `{ expireAfterSeconds: 0 }` (TTL) |

---

### rateLimits

Rate limiting records. Uses a TTL index for automatic cleanup.

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `_id`       | ObjectId | auto     | MongoDB document ID                              |
| `key`       | String   | yes      | Rate limit key (format: `{category}:{identifier}`) |
| `createdAt` | Date     | yes      | When the request was recorded                    |
| `expiresAt` | Date     | yes      | When the record expires (TTL index auto-deletes) |

**Rate limit categories:**

| Category  | Max Requests | Window      |
|-----------|-------------|-------------|
| `auth`    | 5           | 15 minutes  |
| `general` | 100         | 1 minute    |
| `ai`      | 10          | 1 minute    |

**Indexes:**

| Fields      | Options                        |
|-------------|--------------------------------|
| `expiresAt` | `{ expireAfterSeconds: 0 }` (TTL) |

---

### passwordResets

Password reset tokens. Tokens are bcrypt-hashed; the plaintext is never stored.

| Field       | Type     | Required | Default | Description                              |
|-------------|----------|----------|---------|------------------------------------------|
| `_id`       | ObjectId | auto     |         | MongoDB document ID                      |
| `userId`    | String   | yes      |         | References `users._id`                   |
| `tokenHash` | String   | yes      |         | bcrypt hash of the reset token           |
| `expiresAt` | Date     | yes      |         | Token expiry (1 hour after creation)     |
| `used`      | Boolean  | yes      | `false` | Whether the token has been consumed      |
| `createdAt` | Date     | yes      |         | Creation timestamp                       |

---

### emailVerifications

Email verification tokens. Tokens are bcrypt-hashed; the plaintext is never stored.

| Field       | Type     | Required | Description                                |
|-------------|----------|----------|--------------------------------------------|
| `_id`       | ObjectId | auto     | MongoDB document ID                        |
| `userId`    | String   | yes      | References `users._id`                     |
| `tokenHash` | String   | yes      | bcrypt hash of the verification token      |
| `expiresAt` | Date     | yes      | Token expiry (24 hours after creation)     |
| `createdAt` | Date     | yes      | Creation timestamp                         |

**Note:** The verification record is deleted after successful verification.

---

## Full Index Reference

Summary of all indexes defined in `netlify/functions/utils/db.js` and runtime-created indexes:

| Collection         | Index Fields                    | Options               | Source     |
|--------------------|---------------------------------|-----------------------|------------|
| `users`            | `email`                         | `unique: true`        | db.js      |
| `teams`            | `members.userId`                |                       | db.js      |
| `teamInvites`      | `email, teamId`                 |                       | db.js      |
| `clients`          | `teamId`                        |                       | db.js      |
| `clients`          | `name, description`             | Text index            | db.js      |
| `projects`         | `teamId`                        |                       | db.js      |
| `projects`         | `teamId, clientId`              |                       | db.js      |
| `projects`         | `teamId, status`                |                       | db.js      |
| `projects`         | `teamId, dueDate`               |                       | db.js      |
| `projects`         | `title, description`            | Text index            | db.js      |
| `tasks`            | `teamId`                        |                       | db.js      |
| `tasks`            | `teamId, projectId`             |                       | db.js      |
| `tasks`            | `teamId, status`                |                       | db.js      |
| `tasks`            | `teamId, dueDate`               |                       | db.js      |
| `tasks`            | `teamId, assigneeId`            |                       | db.js      |
| `tasks`            | `title, description`            | Text index            | db.js      |
| `campaigns`        | `teamId`                        |                       | db.js      |
| `campaigns`        | `teamId, clientId`              |                       | db.js      |
| `notes`            | `teamId`                        |                       | db.js      |
| `notes`            | `teamId, projectId`             |                       | db.js      |
| `notes`            | `title, content`                | Text index            | db.js      |
| `braindumps`       | `teamId`                        |                       | db.js      |
| `calendarEvents`   | `teamId, start, end`            |                       | db.js      |
| `calendarEvents`   | `teamId, projectId`             |                       | db.js      |
| `resources`        | `teamId`                        |                       | db.js      |
| `apiKeys`          | `prefix`                        | `unique: true`        | db.js      |
| `apiKeys`          | `userId`                        |                       | db.js      |
| `comments`         | `resourceType, resourceId`      |                       | db.js      |
| `comments`         | `userId`                        |                       | db.js      |
| `notifications`    | `userId, read`                  |                       | db.js      |
| `notifications`    | `userId, createdAt`             | `{ createdAt: -1 }`   | db.js      |
| `auditLogs`        | `teamId, timestamp`             | `{ timestamp: -1 }`   | db.js      |
| `auditLogs`        | `resourceType, resourceId`      |                       | db.js      |
| `tokenBlocklist`   | `expiresAt`                     | TTL (`expireAfterSeconds: 0`) | authHandler.js |
| `rateLimits`       | `expiresAt`                     | TTL (`expireAfterSeconds: 0`) | rateLimit.js   |
