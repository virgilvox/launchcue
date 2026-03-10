# State Flows & Data Flow Diagrams

## 1. Authentication Flow

```
┌─────────┐   supabase.auth.signIn()  ┌──────────────┐
│  Login   │ ─────────────────────────→│ Supabase Auth│
│  Page    │                           │  (GoTrue)    │
│          │ ← { session, user }       │              │
└────┬─────┘                           └──────────────┘
     │
     ▼
┌─────────────────┐
│  authStore       │
│  .login()        │
│  ├─ session → stored in sessionStorage
│  ├─ user → state
│  ├─ currentTeam → state
│  └─ router.push('/dashboard')
└─────────────────┘

Session Restore (on page load):
  main.ts → authStore.initAuth()
    ├─ Read user/token/teams from sessionStorage
    ├─ Decode JWT payload (atob) to check expiry
    ├─ If valid → restore user/team state, set token on adapter
    └─ If expired or missing → redirect to login

Session Persistence:
  Tokens stored in sessionStorage (not localStorage).
  Manual JWT decode checks expiry via atob(jwt.split('.')[1]).

Logout Flow:
  authStore.logout()
    ├─ supabase.auth.signOut()
    ├─ Clear local state
    ├─ Dispose all Pinia stores
    └─ router.push('/')
```

## 2. Team Switching Flow

```
  authStore.switchTeam(teamId)
    ├─ Update current team in state
    ├─ setCurrentTeam() syncs team.role → user.value.role + sessionStorage
    ├─ Supabase custom claims updated (team_id, role)
    └─ Reload all stores with new team context
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
                                                      │ getContainer()   │
                                                      │ .resolve(        │
                                                      │   TASK_REPO)     │
                                                      └────────┬─────────┘
                                                               │
                                                      Supabase adapter
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │ supabase         │
                                                      │ .from('tasks')   │
                                                      │ .insert(data)    │
                                                      └────────┬─────────┘
                                                               │
                                                      PostgREST + RLS
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │  PostgreSQL      │
                                                      │  ├─ RLS check    │
                                                      │  ├─ INSERT       │
                                                      │  └─ Return row   │
                                                      └────────┬─────────┘
                                                               │
                                                          Response
                                                               │
                                         ┌─────────────────────┘
                                         ▼
                               store.tasks.push(newTask)
                               eventBus.emit('task.created')
                               → Vue reactivity updates UI
                               → toast.success()
```

## 4. DI Resolution Flow

```
  App Boot (main.ts):
    ├─ createServiceContainer()
    ├─ registerSupabaseAdapters(container)
    │   └─ container.register(TASK_REPO, () => new SupabaseTaskRepository())
    │      container.register(CLIENT_REPO, () => new SupabaseClientRepository())
    │      ... (22 adapters)
    ├─ registry.initialize(container)
    │   └─ Topological sort by dependencies
    │      Each module.setup(container) called in order
    ├─ app.provide(containerKey/eventBusKey/registryKey)
    │   └─ Typed InjectionKey<T> symbols from src/injection-keys.ts
    └─ createApp(App).mount('#app')

  Runtime Resolution:
    store action → getContainer().resolve(TASK_REPO)
      └─ Lazy singleton: factory called once, cached thereafter
```

## 5. Store Dependency Graph

```
authStore (Supabase Auth adapter)
  ↑ used by: all pages, DefaultLayout, Sidebar

clientStore → CLIENT_REPO via DI
  ↑ used by: Clients, ClientDetail, Dashboard, useEntityLookup

projectStore → PROJECT_REPO via DI
  ↑ used by: Projects, ProjectDetail, ProjectForm, Dashboard, useEntityLookup

taskStore → TASK_REPO via DI
  ↑ used by: Tasks, TaskDetail, Dashboard, Calendar

scopeStore → SCOPE_REPO via DI
  ↑ used by: ScopeBuilder, ScopeTemplates

invoiceStore → INVOICE_REPO + SCOPE_REPO via DI
  ↑ used by: Invoices, InvoiceBuilder, Dashboard (OutstandingInvoices)

calendarStore → CALENDAR_EVENT_REPO via DI
  ↑ used by: Calendar

noteStore → NOTE_REPO via DI
  ↑ used by: Notes

campaignStore → CAMPAIGN_REPO via DI
  ↑ used by: Campaigns

commentStore → COMMENT_REPO via DI
  ↑ used by: CommentThread

notificationStore → NOTIFICATION_REPO via DI + 60s polling
  ↑ used by: DefaultLayout, NotificationBell

resourceStore → RESOURCE_REPO via DI
  ↑ used by: Resources

onboardingStore → ONBOARDING_REPO via DI
  ↑ used by: client portal pages
```

## 6. Global Search Flow

```
  Cmd+K / Ctrl+K → GlobalSearch.vue opens

  Mode 1: Search (no prefix)
    ├─ Debounce 300ms
    ├─ getContainer().resolve(SEARCH_ADAPTER).search(query)
    │   └─ Supabase full-text search across 5 tables
    │       tasks, projects, clients, notes, campaigns
    └─ Display grouped results → click navigates
        (notes navigate with ?highlight=id query param)

  Mode 2: Command Palette (prefix ">")
    ├─ Filter local command list
    │   Commands: navigate, create, toggle theme, etc.
    └─ Execute command → router.push or dispatch event
```

## 7. Client Portal Access Control

```
  Router beforeEach guard:
    ├─ to.meta.requiresAuth && !isAuthenticated → /login
    ├─ isClientRole && !to.meta.portalOnly → /portal
    └─ !isClientRole && to.meta.portalOnly → /dashboard

  Client Login:
    ├─ AcceptInvite page (no auth required)
    │   └─ Supabase Auth signup with client role
    └─ Normal login → session contains role + team context

  Client Layout:
    └─ ClientLayout.vue (restricted nav: dashboard, projects, onboarding)
```

## 8. Notification Flow (Polling)

```
  DefaultLayout.vue onMounted:
    └─ notificationStore.startPolling(60000)
        ├─ Initial fetch via NOTIFICATION_REPO
        └─ setInterval(fetchNotifications, 60000)
            └─ Every 60s → fetch unread → update state → update badge

  NotificationBell.vue:
    ├─ Click → dropdown with notifications
    ├─ Click notification → markAsRead + navigate
    └─ "Mark all read" → bulk update
```

## 9. Scope Status Workflow

```
  draft ──→ sent ──→ approved (terminal)
                 └──→ revised ──→ sent (loop)

  Validated in scopeStore.validateStatusTransition()
  Enforced via RLS policies in PostgreSQL
```

## 10. Invoice Creation from Scope

```
  ScopeBuilder.vue:
    1. User clicks "Generate Invoice"
    2. invoiceStore.createFromScope(scopeId)
       ├─ Fetch scope via SCOPE_REPO
       ├─ Map deliverables → line items
       └─ Create invoice via INVOICE_REPO
    3. Separate action: user changes scope status via updateScope()
       (Two-step flow — invoice failure doesn't affect scope status)
```

## 11. Express API Flow (AI Processing)

```
  BrainDump.vue → fetch('/api/ai/process', { ... })
    │
    ├─ Vite proxy (dev): /api → localhost:3001
    ├─ DO App Platform (prod): /api route → API service
    │
    ▼
  Express server (server/src/routes/ai.ts)
    ├─ Validate Supabase JWT from Authorization header
    ├─ Call Anthropic Claude API (server-side key)
    ├─ Proxy to Anthropic Messages API
    └─ Return raw Anthropic response
```
