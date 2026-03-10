# LaunchCue Rearchitecture Plan

> Branch: `rearchitect/supabase-plugins`
> Started: 2026-03-09

## Goals

1. **Plugin flexibility** — modular features, third-party extensibility, swappable infrastructure layers
2. **Migrate from Netlify Functions + MongoDB** to Supabase (PostgreSQL + Auth + Realtime)
3. **Deploy on Digital Ocean** (Docker-compatible, works on App Platform or Droplet)
4. **Fix existing gaps** — dead webhooks, no email, no notifications, no pagination

## Approach

Rearchitect first (add abstraction layers), then swap backends. The app stays fully functional on Netlify+MongoDB throughout, with a single adapter swap at the end.

**Backend: Supabase** — Mature JS SDK, production-ready auth with OAuth/email/magic-link, Row Level Security for RBAC (replaces 33 app-level teamId checks), PostgreSQL foreign keys/joins, self-hostable via Docker Compose.

---

## Phase 0: Plugin Architecture Foundation ✅

### 0.1 Core Infrastructure (4 files in `src/core/`)
- `types.ts` — `FeatureModule`, `ServiceContainer`, `EventBus`, `NavItem`, `SearchProvider` interfaces
- `service-container.ts` — DI container: `register(symbol, factory)` / `resolve(symbol)` with singleton cache
- `event-bus.ts` — Typed event bus: `emit('task.created', payload)`, `on()`, `off()`, `once()`
- `plugin-registry.ts` — Module registration, dependency resolution (topological sort), route/nav/search collection

### 0.2 Repository Interfaces (2 files in `src/adapters/`)
- `types.ts` — `Repository<T, CreateDTO, UpdateDTO>` interface, `AuthAdapter`, `SearchAdapter`, `AiAdapter`, `CommentRepository`, `NotificationRepository`
- `repository-keys.ts` — 21 Symbol keys per entity

### 0.3 Netlify Adapters (18 files in `src/adapters/netlify/`)
- One repo per entity + Auth, Search, AI adapters + Comment/Notification repos
- `index.ts` factory registering all 21 adapters

### 0.4 Feature Module Manifests (14 files in `src/modules/`)
- Each declares routes, nav items, and dependencies
- `src/modules/index.ts` registers all modules in correct nav group order

### 0.5 Wired Into App
- `main.ts` — bootstraps container → adapters → modules → router → app
- `router/index.ts` — static routes (auth, portal, 404) + dynamic module routes under DefaultLayout

---

## Phase 1: Rearchitect Frontend ✅

### 1.1-1.2 Store Migration + Event Bus
All 10 data stores use `getContainer().resolve(KEY)` instead of direct service imports. Event bus emissions on every create/update/delete mutation.

### 1.3 File Collocation
77 files moved into `src/modules/{feature}/{pages,components}/`. All imports updated to `@/` aliases.

### 1.4 JS→TS Service Conversion
4 remaining JS services (auditLog, comment, notification, webhook) converted to TypeScript. Zero JS in `src/services/`.

---

## Phase 2: Backend Migration (Supabase) 🔄 IN PROGRESS

### 2.1 PostgreSQL Schema ✅ (~5 migration files in `supabase/migrations/`)
- `001_create_tables.sql` — 20+ tables (users, teams, team_members join table, clients, projects, tasks, etc.). UUIDs, foreign keys, JSONB for embedded arrays.
- `002_row_level_security.sql` — RLS policies for team isolation + role-based write control.
- `003_indexes.sql` — Mirror existing MongoDB indexes.
- `004_functions.sql` — `soft_delete()`, `cascade_soft_delete_team()`, `auto_invoice_number()`, `updated_at_trigger()`, `global_search()`.
- `005_views.sql` — `active_*` views filtering soft-deleted rows.

**Key decision:** `teams.members[]` array → `team_members` join table.

### 2.2 Supabase Client + Auth Adapter ✅
- `src/adapters/supabase/client.ts` — Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from env vars.
- `src/adapters/supabase/auth.adapter.ts` — Implements `AuthAdapter` using Supabase Auth SDK.
- Team switching: Store `current_team_id` in `auth.users.raw_user_meta_data`, RLS reads it.

### 2.3 Data Migration Script — SKIPPED (fresh start, no MongoDB data to migrate)

### 2.4 Supabase Repository Implementations ✅ (~21 files)
- `src/adapters/supabase/{task,project,client,...}.repository.ts`
- `src/adapters/supabase/search.adapter.ts` — PostgreSQL `to_tsvector`/`to_tsquery` via RPC
- `src/adapters/supabase/index.ts` — Factory registering all repos

### 2.5 Express API Server ✅ (`server/`)
For non-Supabase operations:
- JWT auth (Supabase token verification), rate limiting, webhook dispatching, brain dump AI processing, email sending

### 2.6 Adapter Swap — One Line Change
```typescript
// src/main.ts
- import { registerNetlifyAdapters } from '@/adapters/netlify'
+ import { registerSupabaseAdapters } from '@/adapters/supabase'
```

---

## Phase 3: Deployment (Docker + Digital Ocean)

### 3.1 Dockerize
- `Dockerfile` — Multi-stage: build Vue SPA → serve via nginx
- `server/Dockerfile` — Express API
- `docker-compose.yml` — Self-hosted: full stack (frontend + Express + Supabase)
- `docker-compose.cloud.yml` — Cloud mode: frontend + Express only
- `.env.example` — All required env vars

### 3.2 Digital Ocean Deploy — Two Paths
**Path A: Self-hosted Supabase on Droplet** ($24-39/mo) — Single 4GB+ Droplet
**Path B: Supabase Cloud + DO App Platform** ($0-25/mo) — Static site + Docker service

---

## Phase 4: Fix Gaps

| Gap | Solution |
|-----|----------|
| Dead webhooks | PostgreSQL `webhook_queue` table + trigger + Express cron processor |
| No email | Supabase Auth handles verification/reset; Express + nodemailer for invitations |
| Dead notifications | Supabase Realtime subscription replaces 60s polling |
| No pagination | `findPaginated()` on Repository interface; Supabase `.range()`; `Pagination.vue` |
| No tests | Repository unit tests, RLS policy tests, Playwright E2E |

---

## Verification Checklist

After each phase:
1. `npm run build` passes with zero errors
2. Manual smoke test: login → dashboard → create task → edit → delete
3. All routes render
4. Auth flow complete
5. RBAC enforced

After Phase 2.6 (adapter swap):
6. Supabase auth works
7. All entity CRUD persists
8. RLS team isolation works
9. Real-time notifications work
10. Webhooks fire

After Phase 3.2 (deployment):
11. `docker compose up` works locally
12. HTTPS accessible on Digital Ocean
13. GitHub push triggers auto-deploy
