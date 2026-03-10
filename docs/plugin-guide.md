# Plugin System Developer Guide

How to create, register, and manage feature modules in LaunchCue.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Creating a New Feature Module](#2-creating-a-new-feature-module)
3. [Creating a Repository Adapter](#3-creating-a-repository-adapter)
4. [Creating a Pinia Store with DI](#4-creating-a-pinia-store-with-di)
5. [Registering the Module](#5-registering-the-module)
6. [Removing/Disabling a Module](#6-removingdisabling-a-module)
7. [Walkthrough: Adding a "Reports" Module](#7-walkthrough-adding-a-reports-module)

---

## 1. Architecture Overview

LaunchCue uses a plugin-based architecture with three core primitives:

### ServiceContainer (`src/core/service-container.ts`)

A dependency injection container with **symbol keys** and **lazy singleton resolution**. Factories are registered once; instances are created on first `resolve()` and cached.

```
register(key, factory)  -->  resolve(key)  -->  factory() on first call, cached thereafter
```

- `register<T>(key: symbol, factory: () => T)` -- store a factory
- `resolve<T>(key: symbol): T` -- get or create the singleton
- `has(key: symbol): boolean` -- check if a factory is registered
- Re-registering a key clears the cached instance (enables adapter swaps)

### EventBus (`src/core/event-bus.ts`)

Typed pub/sub for cross-module communication. Convention: `entity.verb` (e.g. `task.created`, `project.deleted`).

```ts
getEventBus().emit('report.created', { report })
getEventBus().on('report.created', (payload) => { ... })
getEventBus().off('report.created', handler)
getEventBus().once('report.created', handler)
```

### PluginRegistry (`src/core/plugin-registry.ts`)

Manages the lifecycle of feature modules:

1. **Register** -- `registry.register(module)` stores the module definition
2. **Initialize** -- `registry.initialize(container)` runs topological sort on dependencies, then calls `setup()` on each module in order
3. **Collect** -- `getRoutes()`, `getNavGroups()`, `getSearchProviders()` gather data from all modules on demand
4. **Teardown** -- `registry.teardown()` calls `teardown()` in reverse dependency order

### Bootstrap Sequence (`src/main.ts`)

```
1. initContainer()           -- create the DI container
2. initEventBus()            -- create the event bus
3. initPluginRegistry()      -- create the plugin registry
4. registerSupabaseAdapters  -- register all repository factories
5. registerAllModules        -- register all feature modules
6. registry.initialize       -- run setup() in dependency order
7. createAppRouter(registry) -- collect routes from all modules
8. app.mount('#app')
```

### Nav Group Ordering

Registration order in `src/modules/index.ts` determines sidebar ordering. Modules contributing to the same nav group label are merged:

| Group       | Modules                                        |
|-------------|------------------------------------------------|
| CORE        | tasks, calendar                                |
| WORK        | clients, projects, campaigns, scopes, invoices |
| KNOWLEDGE   | notes, brain-dump, resources                   |
| ADMIN       | team, settings                                 |

---

## 2. Creating a New Feature Module

### Directory Structure

```
src/modules/{feature}/
  index.ts           # FeatureModule definition (required)
  pages/             # Route-level Vue components
    FeatureList.vue
    FeatureDetail.vue
  components/        # Shared components for this feature
    FeatureCard.vue
```

### The FeatureModule Interface

```ts
// src/core/types.ts
interface FeatureModule {
  id: string                          // Unique identifier
  name: string                        // Human-readable name
  dependencies?: string[]             // Other module IDs (resolved via topological sort)
  routes?: RouteRecordRaw[]           // Routes added under DefaultLayout
  navItems?: NavGroup[]               // Sidebar navigation entries
  searchProviders?: SearchProvider[]   // Global search providers
  setup?: (container: ServiceContainer) => void | Promise<void>
  teardown?: () => void
}
```

### Module Template

```ts
// src/modules/{feature}/index.ts
import type { FeatureModule } from '@/core/types'

// Lazy-load page components
const FeatureList = () => import('@/modules/{feature}/pages/FeatureList.vue')
const FeatureDetail = () => import('@/modules/{feature}/pages/FeatureDetail.vue')

export const featureModule: FeatureModule = {
  id: '{feature}',
  name: '{Feature}',

  // Optional: declare dependencies on other modules
  // dependencies: ['tasks'],

  routes: [
    {
      path: '{feature}',        // Relative -- mounted under DefaultLayout's children
      name: '{feature}',
      component: FeatureList,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { label: 'Dashboard', to: '/dashboard' },
          { label: '{Feature}' }
        ]
      }
    },
    {
      path: '{feature}/:id',
      name: '{feature}-detail',
      component: FeatureDetail,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { label: 'Dashboard', to: '/dashboard' },
          { label: '{Feature}', to: '/{feature}' }
        ]
      },
      props: true
    }
  ],

  navItems: [
    {
      label: 'WORK',           // Must match an existing group label, or creates a new one
      items: [
        { name: '{Feature}', href: '/{feature}', icon: 'ChartBarIcon' }
      ]
    }
  ],

  // Optional: search integration
  // searchProviders: [{ type: '{feature}', label: '{Feature}', icon: 'ChartBarIcon', search: async (q) => [] }],

  // Optional: runs during initialization (after dependencies' setup)
  // setup(container) { },

  // Optional: cleanup on teardown
  // teardown() { },
}
```

### Key Patterns from Existing Modules

- **Route paths are relative** (no leading `/`). They are mounted as children of the DefaultLayout route.
- **Lazy imports** for page components: `const Page = () => import(...)`. This enables code splitting.
- **Icons** reference Heroicons component names (e.g. `ChartBarSquareIcon`, `DocumentTextIcon`).
- **`meta.requiresAuth: true`** triggers the auth guard.

---

## 3. Creating a Repository Adapter

### Step 1: Define the Symbol Key

```ts
// src/adapters/repository-keys.ts
export const REPORT_REPO = Symbol('ReportRepository')
```

### Step 2: Create the Repository Class

Extend `SupabaseBaseRepository<T, CreateDTO, UpdateDTO>`:

```ts
// src/adapters/supabase/report.repository.ts
import type { Report } from '@/types/models'
import type { ReportCreateRequest, ReportUpdateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseReportRepository extends SupabaseBaseRepository<
  Report,
  ReportCreateRequest,
  ReportUpdateRequest
> {
  constructor() {
    super(
      'reports',          // tableName -- used for INSERT/UPDATE/DELETE
      'active_reports',   // viewName  -- used for SELECT (filters soft-deleted rows)
      {
        // fieldMap: camelCase frontend key -> snake_case DB column
        // Only needed for multi-word fields. Single-word fields auto-convert.
        teamId: 'team_id',
        createdBy: 'created_by',
        reportType: 'report_type',
        dateRange: 'date_range',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at',
        deletedBy: 'deleted_by',
      }
    )
  }

  // REQUIRED: map a snake_case DB row to the camelCase frontend model
  protected mapFromDb(row: Record<string, unknown>): Report {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      reportType: row.report_type as string,
      dateRange: row.date_range as string | null,
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
```

### Base Class API

The `SupabaseBaseRepository` provides these methods out of the box:

| Method | Description |
|--------|-------------|
| `findAll(filter?)` | Query the view with optional `eq` filters |
| `findById(id)` | Single row by ID from the view |
| `create(dto)` | Insert into the table, return the created row |
| `update(id, dto)` | Update by ID, return the updated row |
| `delete(id)` | Soft delete (sets `deleted_at`) |
| `findPaginated(filter, { page, limit })` | Paginated query with total count |

### Override Points

| Method | Default | When to Override |
|--------|---------|-----------------|
| `mapFromDb(row)` | **Abstract** -- must implement | Always |
| `mapToDb(dto)` | Auto-converts camelCase to snake_case via `fieldMap` | Rarely -- only if you need custom write transforms |
| `getSelectColumns()` | `'*'` | When you need joins (e.g. `'*, project:projects(name)'`) |
| `applyDefaultOrder(query)` | `order('created_at', { ascending: false })` | To change default sort |
| `findAll(filter)` | Applies `eq` for all filter entries | When you need range filters, `ilike`, etc. |

### Step 3: Register the Factory

```ts
// src/adapters/supabase/index.ts -- add to registerSupabaseAdapters()
import { SupabaseReportRepository } from './report.repository'
import { REPORT_REPO } from '../repository-keys'

// Inside registerSupabaseAdapters():
container.register(REPORT_REPO, () => new SupabaseReportRepository())
```

### Tables Without Soft Delete

If your table does not use soft delete (like `comments`, `audit_logs`, `notifications`):

1. Use the **table name** as both `tableName` and `viewName` (no `active_*` view)
2. Override `delete()` to perform a hard delete:

```ts
async delete(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from(this.tableName)
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
```

---

## 4. Creating a Pinia Store with DI

Stores bridge Vue components and the repository layer. They use the DI container to resolve repositories and the event bus for cross-module communication.

### Store Template

```ts
// src/stores/{feature}.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { REPORT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Report } from '@/types/models'
import type { ReportCreateRequest, ReportUpdateRequest } from '@/types/api'
import { useAuthStore } from './auth'

export const useReportStore = defineStore('report', () => {
  // ─── State ───
  const reports = ref<Report[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ─── Repository Access ───
  // Resolved lazily from the DI container (singleton, cached after first call)
  function getRepo() {
    return getContainer().resolve<Repository<Report, ReportCreateRequest, ReportUpdateRequest>>(
      REPORT_REPO
    )
  }

  // ─── Actions ───

  const fetchReports = async (filter: Record<string, unknown> = {}): Promise<Report[]> => {
    // Guard: require active team
    if (!useAuthStore().currentTeam) return []

    isLoading.value = true
    error.value = null
    try {
      const data = await getRepo().findAll(filter)
      reports.value = data || []
      return reports.value
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reports'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createReport = async (data: ReportCreateRequest): Promise<Report> => {
    try {
      const created = await getRepo().create(data)
      if (created?.id) {
        reports.value.push(created)
        getEventBus().emit('report.created', { report: created })
      }
      return created
    } catch (err) {
      throw err
    }
  }

  const updateReport = async (id: string, data: ReportUpdateRequest): Promise<Report> => {
    try {
      const updated = await getRepo().update(id, data)
      const index = reports.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        reports.value[index] = updated
      }
      getEventBus().emit('report.updated', { report: updated })
      return updated
    } catch (err) {
      throw err
    }
  }

  const deleteReport = async (id: string): Promise<void> => {
    try {
      await getRepo().delete(id)
      reports.value = reports.value.filter((r) => r.id !== id)
      getEventBus().emit('report.deleted', { id })
    } catch (err) {
      throw err
    }
  }

  const getReportById = async (id: string): Promise<Report | null> => {
    // Check local cache first
    const existing = reports.value.find((r) => r.id === id)
    if (existing) return existing

    isLoading.value = true
    error.value = null
    try {
      const report = await getRepo().findById(id)
      const index = reports.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        reports.value[index] = report
      } else {
        reports.value.push(report)
      }
      return report
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to fetch report ${id}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    reports,
    isLoading,
    error,
    fetchReports,
    createReport,
    updateReport,
    deleteReport,
    getReportById,
  }
})
```

### Key Patterns

- **`getRepo()` helper** -- wraps `getContainer().resolve()`. Called inside actions, not at module scope (the container may not exist yet when the store module is imported).
- **Team guard** -- `if (!useAuthStore().currentTeam) return []` prevents queries before a team is selected.
- **`isLoading` / `error`** -- standard reactive state for UI loading/error indicators.
- **`try/catch/finally`** -- always reset `isLoading` in `finally`.
- **Event emission** -- `getEventBus().emit('entity.verb', payload)` after mutations so other modules can react.
- **Local cache check** in `getById` -- avoids redundant network calls.

---

## 5. Registering the Module

### Step 1: Add to `src/modules/index.ts`

```ts
import { reportsModule } from './reports'

export function registerAllModules(registry: PluginRegistry): void {
  // ... existing modules ...

  // WORK group (add reports after invoices, or wherever makes sense)
  registry.register(reportsModule)
}
```

**Registration order determines sidebar nav ordering.** Modules contributing items to the same `NavGroup.label` are merged in registration order.

### Step 2: Verify

After registration, the module's data is automatically collected:

- **Routes** -- `registry.getRoutes()` is called by `createAppRouter()` in `main.ts`
- **Nav items** -- `registry.getNavGroups()` is consumed by the sidebar component
- **Search providers** -- `registry.getSearchProviders()` is consumed by global search

No additional wiring is needed. The plugin system handles the rest.

### Dependencies

If your module depends on another (e.g., reports depend on projects):

```ts
export const reportsModule: FeatureModule = {
  id: 'reports',
  name: 'Reports',
  dependencies: ['projects'],  // <-- ensures projects.setup() runs first
  // ...
}
```

The `PluginRegistry` uses topological sort to resolve the initialization order. Circular dependencies throw an error at startup.

---

## 6. Removing/Disabling a Module

### Remove Completely

1. **Delete the module directory**: `src/modules/{feature}/`
2. **Remove from `src/modules/index.ts`**: delete the import and `registry.register()` call
3. **Remove the repository**: delete `src/adapters/supabase/{feature}.repository.ts`
4. **Remove the symbol key**: delete from `src/adapters/repository-keys.ts`
5. **Remove the factory registration**: delete from `registerSupabaseAdapters()` in `src/adapters/supabase/index.ts`
6. **Remove the store**: delete `src/stores/{feature}.ts`
7. **Remove model/API types**: clean up `src/types/models.ts` and `src/types/api.ts`

### Disable Temporarily

Comment out the `registry.register()` call in `src/modules/index.ts`:

```ts
// registry.register(reportsModule)
```

This removes all routes, nav items, and search providers. The repository and store remain available but unused.

**Important:** If other modules declare a dependency on the disabled module, they will fail during `initialize()`. Either remove the dependency or disable the dependent modules too.

### Check for Failed Modules

After initialization, you can inspect which modules failed:

```ts
const failed = registry.getFailedModules()
if (failed.length > 0) {
  console.warn('Failed modules:', failed)
}
```

---

## 7. Walkthrough: Adding a "Reports" Module

Complete step-by-step example adding a Reports feature to LaunchCue.

### 7.1 Define the Model and API Types

```ts
// src/types/models.ts -- add:
export interface Report {
  id: string
  title: string
  description?: string
  reportType: 'weekly' | 'monthly' | 'campaign' | 'custom'
  status: 'draft' | 'published'
  dateRange: string | null
  data: Record<string, unknown>
  teamId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

```ts
// src/types/api.ts -- add:
export interface ReportCreateRequest {
  title: string
  description?: string
  reportType: 'weekly' | 'monthly' | 'campaign' | 'custom'
  status?: 'draft' | 'published'
  dateRange?: string
  data?: Record<string, unknown>
}

export interface ReportUpdateRequest {
  id?: string
  title?: string
  description?: string
  reportType?: 'weekly' | 'monthly' | 'campaign' | 'custom'
  status?: 'draft' | 'published'
  dateRange?: string
  data?: Record<string, unknown>
}
```

### 7.2 Create the Database Table

```sql
-- supabase/migrations/006_reports.sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly','monthly','campaign','custom')),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  date_range  TEXT,
  data        JSONB DEFAULT '{}'::jsonb,
  team_id     UUID NOT NULL REFERENCES teams(id),
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Soft-delete-filtered view for reads
CREATE VIEW active_reports AS
  SELECT * FROM reports WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read reports"
  ON reports FOR SELECT
  USING (team_id = auth.current_team_id());

CREATE POLICY "Writers can insert reports"
  ON reports FOR INSERT
  WITH CHECK (team_id = auth.current_team_id() AND auth.can_write());

CREATE POLICY "Writers can update reports"
  ON reports FOR UPDATE
  USING (team_id = auth.current_team_id() AND auth.can_write());

-- Index
CREATE INDEX idx_reports_team ON reports(team_id) WHERE deleted_at IS NULL;
```

### 7.3 Add the Repository Symbol Key

```ts
// src/adapters/repository-keys.ts -- add:
export const REPORT_REPO = Symbol('ReportRepository')
```

### 7.4 Create the Repository Adapter

```ts
// src/adapters/supabase/report.repository.ts
import type { Report } from '@/types/models'
import type { ReportCreateRequest, ReportUpdateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseReportRepository extends SupabaseBaseRepository<
  Report,
  ReportCreateRequest,
  ReportUpdateRequest
> {
  constructor() {
    super('reports', 'active_reports', {
      reportType: 'report_type',
      dateRange: 'date_range',
      teamId: 'team_id',
      createdBy: 'created_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Report {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      reportType: row.report_type as Report['reportType'],
      status: row.status as Report['status'],
      dateRange: row.date_range as string | null,
      data: (row.data as Record<string, unknown>) || {},
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  // Custom ordering: newest first, drafts before published
  protected applyDefaultOrder(query: any): any {
    return query.order('status', { ascending: true }).order('created_at', { ascending: false })
  }
}
```

### 7.5 Register the Factory

```ts
// src/adapters/supabase/index.ts -- add import and registration:
import { SupabaseReportRepository } from './report.repository'
import { REPORT_REPO } from '../repository-keys'

// Inside registerSupabaseAdapters():
container.register(REPORT_REPO, () => new SupabaseReportRepository())
```

### 7.6 Create the Store

```ts
// src/stores/report.ts
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { REPORT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { Report } from '@/types/models'
import type { ReportCreateRequest, ReportUpdateRequest } from '@/types/api'
import { useAuthStore } from './auth'

export const useReportStore = defineStore('report', () => {
  const reports = ref<Report[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function getRepo() {
    return getContainer().resolve<Repository<Report, ReportCreateRequest, ReportUpdateRequest>>(
      REPORT_REPO
    )
  }

  const fetchReports = async (filter: Record<string, unknown> = {}): Promise<Report[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    error.value = null
    try {
      const data = await getRepo().findAll(filter)
      reports.value = data || []
      return reports.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch reports'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createReport = async (data: ReportCreateRequest): Promise<Report> => {
    const created = await getRepo().create(data)
    if (created?.id) {
      reports.value.push(created)
      getEventBus().emit('report.created', { report: created })
    }
    return created
  }

  const updateReport = async (id: string, data: ReportUpdateRequest): Promise<Report> => {
    const updated = await getRepo().update(id, data)
    const index = reports.value.findIndex((r) => r.id === id)
    if (index !== -1) reports.value[index] = updated
    getEventBus().emit('report.updated', { report: updated })
    return updated
  }

  const deleteReport = async (id: string): Promise<void> => {
    await getRepo().delete(id)
    reports.value = reports.value.filter((r) => r.id !== id)
    getEventBus().emit('report.deleted', { id })
  }

  const getReportById = async (id: string): Promise<Report | null> => {
    const existing = reports.value.find((r) => r.id === id)
    if (existing) return existing
    isLoading.value = true
    error.value = null
    try {
      const report = await getRepo().findById(id)
      reports.value.push(report)
      return report
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Failed to fetch report ${id}`
      return null
    } finally {
      isLoading.value = false
    }
  }

  return { reports, isLoading, error, fetchReports, createReport, updateReport, deleteReport, getReportById }
})
```

### 7.7 Create the Module Directory and Pages

```
src/modules/reports/
  index.ts
  pages/
    Reports.vue
    ReportDetail.vue
  components/
    ReportCard.vue
```

### 7.8 Define the Feature Module

```ts
// src/modules/reports/index.ts
import type { FeatureModule } from '@/core/types'

const Reports = () => import('@/modules/reports/pages/Reports.vue')
const ReportDetail = () => import('@/modules/reports/pages/ReportDetail.vue')

export const reportsModule: FeatureModule = {
  id: 'reports',
  name: 'Reports',

  routes: [
    {
      path: 'reports',
      name: 'reports',
      component: Reports,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Reports' }
        ]
      }
    },
    {
      path: 'reports/:id',
      name: 'report-detail',
      component: ReportDetail,
      meta: {
        requiresAuth: true,
        breadcrumbs: [
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Reports', to: '/reports' }
        ]
      },
      props: true
    }
  ],

  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Reports', href: '/reports', icon: 'ChartBarIcon' }
      ]
    }
  ],

  searchProviders: [
    {
      type: 'report',
      label: 'Reports',
      icon: 'ChartBarIcon',
      async search(query: string) {
        const { useReportStore } = await import('@/stores/report')
        const store = useReportStore()
        await store.fetchReports({ search: query })
        return store.reports.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || r.reportType,
          route: `/reports/${r.id}`,
          type: 'report',
        }))
      }
    }
  ]
}
```

### 7.9 Register the Module

```ts
// src/modules/index.ts
import { reportsModule } from './reports'

export function registerAllModules(registry: PluginRegistry): void {
  // ... existing WORK group ...
  registry.register(invoicesModule)
  registry.register(reportsModule)     // <-- add after invoices

  // ... rest unchanged ...
}
```

### 7.10 Summary of Files Created/Modified

| Action   | File |
|----------|------|
| Created  | `src/modules/reports/index.ts` |
| Created  | `src/modules/reports/pages/Reports.vue` |
| Created  | `src/modules/reports/pages/ReportDetail.vue` |
| Created  | `src/adapters/supabase/report.repository.ts` |
| Created  | `src/stores/report.ts` |
| Created  | `supabase/migrations/006_reports.sql` |
| Modified | `src/adapters/repository-keys.ts` -- add `REPORT_REPO` |
| Modified | `src/adapters/supabase/index.ts` -- register factory |
| Modified | `src/modules/index.ts` -- register module |
| Modified | `src/types/models.ts` -- add `Report` interface |
| Modified | `src/types/api.ts` -- add request/response types |

After these changes, run `npm run dev` and navigate to `/reports`. The sidebar will show "Reports" under the WORK group, routes will be active, and global search will include reports.
