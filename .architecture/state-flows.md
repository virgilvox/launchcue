# State Flows & Data Flow Diagrams

## 1. Authentication Flow

```
┌─────────┐    POST /auth-login     ┌──────────┐
│  Login   │ ──────────────────────→ │  Server  │
│  Page    │                         │          │
│          │ ← { token, user, teamId}│          │
└────┬─────┘                         └──────────┘
     │
     ▼
┌─────────────────┐
│  authStore       │
│  .login()        │
│  ├─ token → sessionStorage
│  ├─ user → state
│  ├─ currentTeam → state
│  └─ router.push('/dashboard')
└─────────────────┘

Session Restore (on page load):
  main.ts → authStore.initAuth()
    ├─ Check sessionStorage for token
    ├─ Decode JWT, check exp
    ├─ If expired → logout()
    └─ If valid → restore user/team state

Logout Flow:
  authStore.logout()
    ├─ POST /auth-logout (revoke jti)
    ├─ Clear sessionStorage
    ├─ Dispose all Pinia stores
    └─ router.push('/')

401 Handling:
  api.service.ts interceptor
    ├─ Any 401 response
    ├─ Set _logoutTriggered flag (debounce)
    ├─ Call onUnauthorized callback
    └─ authStore.logout()
```

## 2. Team Switching Flow

```
  authStore.switchTeam(teamId)
    ├─ POST /auth-switch-team { teamId }
    │   ├─ Server revokes old JWT
    │   └─ Returns new JWT with new team role
    ├─ Update sessionStorage token
    ├─ Update user/team state
    └─ window.location.reload() ← Full page reload for clean data
```

## 3. CRUD Data Flow (Example: Tasks)

```
┌──────────┐  user action   ┌──────────┐  store action  ┌─────────────┐
│ Tasks.vue│ ──────────────→ │ TaskForm │ ──────────────→ │useTaskStore │
│ (page)   │                 │ (modal)  │  emit('save')  │             │
└──────────┘                 └──────────┘                 └──────┬──────┘
                                                                 │
                                                          createTask()
                                                                 │
                                                                 ▼
                                                      ┌──────────────────┐
                                                      │ task.service.ts  │
                                                      │ .createTask()    │
                                                      └────────┬─────────┘
                                                               │
                                                        apiService.post()
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ api.service.ts   │
                                                      │ axios + auth     │
                                                      │ header + retry   │
                                                      └────────┬─────────┘
                                                               │
                                                    POST /.netlify/functions/tasks
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │  tasks.js        │
                                                      │  (Netlify Fn)    │
                                                      │  ├─ authenticate │
                                                      │  ├─ validate Zod │
                                                      │  ├─ db.insertOne │
                                                      │  ├─ audit log    │
                                                      │  └─ calendar sync│
                                                      └────────┬─────────┘
                                                               │
                                                          Response 201
                                                               │
                                         ┌─────────────────────┘
                                         ▼
                               store.tasks.push(newTask)
                               → Vue reactivity updates UI
                               → toast.success()
```

## 4. Store Dependency Graph

```
authStore (standalone)
  ↑ used by: all pages, DefaultLayout, Sidebar, api.service.ts (callback)

clientStore → authStore (currentTeam check)
  ↑ used by: Clients, ClientDetail, Dashboard, useEntityLookup

projectStore (standalone)
  ↑ used by: Projects, ProjectDetail, ProjectForm, Dashboard, useEntityLookup

taskStore (standalone)
  ↑ used by: Tasks, TaskDetail, Dashboard, Calendar

scopeStore → invoiceStore (createFromScope)
  ↑ used by: ScopeBuilder, ScopeTemplates

invoiceStore (standalone)
  ↑ used by: Invoices, InvoiceBuilder, Dashboard (OutstandingInvoices)

calendarStore (standalone)
  ↑ used by: Calendar

noteStore (standalone)
  ↑ used by: Notes

resourceStore (standalone)
  ↑ used by: Resources

onboardingStore (standalone)
  ↑ used by: client portal pages

notificationStore (standalone, JS)
  ↑ used by: DefaultLayout (polling), NotificationBell
```

## 5. Global Search Flow

```
  Cmd+K / Ctrl+K → GlobalSearch.vue opens

  Mode 1: Search (no prefix)
    ├─ Debounce 300ms
    ├─ GET /search?q={query}
    │   └─ Server searches 5 collections (text index)
    │       tasks, projects, clients, notes, campaigns
    │       Returns 5 results each, 20 max
    └─ Display grouped results → click navigates

  Mode 2: Command Palette (prefix ">")
    ├─ Filter local command list
    │   Commands: navigate, create, toggle theme, etc.
    └─ Execute command → router.push or dispatch event
```

## 6. Client Portal Access Control

```
  Router beforeEach guard:
    ├─ to.meta.requiresAuth && !isAuthenticated → /login
    ├─ isClientRole && !to.meta.portalOnly → /portal
    └─ !isClientRole && to.meta.portalOnly → /dashboard

  Client Login:
    ├─ AcceptInvite page (no auth required)
    │   └─ POST /client-invitations?action=accept
    │       ├─ Creates user with client role
    │       └─ Returns JWT with { role: 'client', projectIds: [...] }
    └─ Normal login → JWT contains role + projectIds

  Client Layout:
    └─ ClientLayout.vue (restricted nav: dashboard, projects, onboarding)
```

## 7. API Key Authentication Flow

```
  Request with Authorization: Bearer lc_sk_xxxxx...
    │
    ▼
  authenticate() in authHandler.js
    ├─ Detect lc_sk_ prefix
    ├─ Extract prefix (first 16 chars)
    ├─ Query apiKeys by prefix + teamId + notDeleted
    ├─ bcrypt.compare(fullKey, hashedKey)
    ├─ Check expiresAt
    ├─ Validate scopes against required scopes
    ├─ Fire-and-forget: update lastUsedAt
    └─ Return { userId, teamId, scopes, authType: 'apiKey' }
```

## 8. Soft Delete + Cascade Pattern

```
  DELETE /teams/:id (owner only)
    ├─ Soft delete team document
    └─ Cascade soft delete across 14 collections:
        projects, tasks, clients, calendarEvents, notes,
        campaigns, invoices, scopes, resources, apiKeys,
        webhooks, comments, scopeTemplates, onboarding

  All queries include: { deletedAt: null } (notDeleted filter)
  Restore: Set deletedAt=null, deletedBy=null
```

## 9. Notification Polling

```
  DefaultLayout.vue onMounted:
    └─ notificationStore.startPolling(60000)
        ├─ Immediate fetch
        └─ setInterval(fetchNotifications, 60s)
            ├─ GET /notifications?read=false
            └─ Update unreadCount badge

  NotificationBell.vue:
    ├─ Click → dropdown with notifications
    ├─ Click notification → markAsRead + navigate
    └─ "Mark all read" → bulk update
```

## 10. Invoice Auto-Numbering

```
  POST /invoices
    ├─ Query: db.find({ teamId }).sort({ invoiceNumber: -1 }).limit(1)
    ├─ Extract last number: "INV-005" → 5
    ├─ Next: "INV-006" (zero-padded to 3 digits)
    └─ If no invoices: "INV-001"
```

## 11. Scope Status Workflow

```
  draft ──→ sent ──→ approved (terminal)
                 └──→ revised ──→ sent (loop)

  Validated in scopeStore.validateStatusTransition()
  Enforced in PUT /scopes (backend)
```

## 12. Calendar Sync

```
  Project Create/Update:
    ├─ If project has startDate/dueDate
    │   └─ Upsert calendarEvent { projectId, taskId: null }
    └─ Project delete → soft delete synced event

  Task Create/Update:
    ├─ If task has dueDate
    │   └─ Upsert calendarEvent { taskId, projectId }
    └─ Task delete → soft delete synced event
```

## 13. Rate Limiting Flow

```
  Request arrives
    ├─ Extract identifier: userId || x-forwarded-for || client-ip || 'unknown'
    ├─ Determine category: auth (5/15min) | general (100/min) | ai (10/min)
    ├─ Count: db.rateLimits.countDocuments({ key, createdAt >= windowStart })
    ├─ If count >= max:
    │   └─ Return 429 { error, retryAfter }
    └─ Else:
        ├─ Insert rate limit record (with TTL expiresAt)
        └─ Continue to handler
```
