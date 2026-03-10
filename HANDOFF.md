# LaunchCue -Handoff Document

> DevRel management platform built with Vue 3, Tailwind CSS, Supabase (PostgreSQL), and Express API server.

---

## Architecture Overview

### Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Pinia stores, Vue Router, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + RLS + GoTrue auth + PostgREST + Realtime)
- **API Server**: Express (AI processing, webhook delivery, email)
- **Auth**: Supabase Auth (GoTrue), JWT with SDK-managed sessions (localStorage), RBAC (owner/admin/member/viewer/client)
- **Design System**: CSS custom properties (brutalist style -0 border-radius, 2px borders, hard offset shadows)
- **Architecture**: Plugin-based DI container, Repository pattern, feature modules with topological dependency sort
- **Deployment**: DigitalOcean App Platform (static site + API service) + Droplet (self-hosted Supabase) -live at launchcue.app

### Directory Structure
```
src/
  injection-keys.ts # Typed InjectionKey<T> symbols for Vue provide/inject
  core/             # DI container, event bus, plugin registry, types
  adapters/         # Repository implementations (supabase/), types, keys
  modules/          # 15 feature modules -each has {pages/, components/, index.ts}
    dashboard/      # Dashboard + widgets (StatsGrid, ClientHealth, etc.)
    tasks/          # Tasks (list, kanban, form, filters)
    projects/       # Projects (detail, form, status workflow)
    clients/        # Clients (detail, contacts, color coding)
    calendar/       # Calendar (month/week/day views, event CRUD)
    notes/          # Notes (rich text Tiptap, templates, tags)
    campaigns/      # Campaigns (builder, timeline, status)
    brain-dump/     # Brain dump (AI capture, save-to-note)
    invoices/       # Invoices (builder, scope import, print/PDF)
    scopes/         # Scopes (template→instance, deliverables, print/PDF)
    resources/      # Resources (links/files, tags, client linking)
    notifications/  # Notification bell, realtime subscriptions
    onboarding/     # Client onboarding (checklists, step types)
    settings/       # Settings (profile, webhooks, API keys, audit log)
    team/           # Team management (members, invites, roles)
  components/       # Shared UI components
    ui/             # Design system primitives (Modal, PageHeader, EmptyState, etc.)
  composables/      # Vue composables (useModalState, useEntityLookup, useLoadingCounter, useUnsavedChanges, etc.)
  constants/        # Static data (clientColors.ts)
  layouts/          # DefaultLayout.vue, ClientLayout.vue
  pages/            # Auth + portal pages (non-module routes)
    auth/           # Login, Register, ForgotPassword, etc.
    client-portal/  # Portal pages for client users
  stores/           # Pinia stores using repository pattern (18 stores)
  types/            # TypeScript types (models, api, enums)
  utils/            # Utility functions + icon resolver
server/             # Express API server (AI, webhooks, email)
supabase/
  migrations/       # PostgreSQL schema (10 migrations, 26 tables, RLS, triggers)
supabase/           # Kong config, migrations for Docker
infra/              # Droplet setup script
.do/                # DigitalOcean App Platform spec
tests/
  helpers/          # Mock factories, store setup, mock router/toast
  core/             # Service container, event bus, plugin registry tests
  stores/           # Store tests (auth, task, notification, team, project, client, calendar, campaign, invoice, comment, brain-dump)
  composables/      # Composable tests (useLoadingCounter, useUnsavedChanges)
```

### Design System
- **Colors**: Purple (#7C3AED) primary, Coral (#E8503A) accent, Parchment (#FAF8F5) background
- **Dark mode**: Class-based toggle via CSS custom properties (--bg, --surface, --text-primary, etc.)
- **Typography**: Space Grotesk (headings), Inter (body), JetBrains Mono (data/stats)
- **Components**: `.btn`, `.btn-primary`, `.card`, `.input`, `.label`, `.badge`, `.heading-page`, `.heading-section`, `.heading-card`
- **Sidebar**: Always-dark with dedicated tokens (--sidebar-bg, --sidebar-text, etc.)
- **Layout**: Every app page uses `PageContainer > PageHeader > content`

---

## What's Built

### Core Features
- **Dashboard**: Stats grid, recent tasks table, upcoming items, activity feed, client health widget, outstanding invoices, Chart.js analytics, getting started checklist
- **Tasks**: CRUD with list + kanban views, filters, status/priority/assignee, checklist, client color dots, calendar sync
- **Projects**: CRUD with status workflow (Planning → In Progress → On Hold → Completed → Cancelled), team members, task integration, status dropdown in detail view
- **Clients**: CRUD with contacts management, color coding (10-color palette with auto-assignment), cascade delete protection
- **Calendar**: Month/week/day views with event CRUD, task/project deadline sync, sidebar event details
- **Notes**: Rich text (Tiptap), templates (Meeting Notes, Decision Log, Brainstorm), client/project linking, tag filtering
- **Campaigns**: Multi-step builder with timeline, team assignment, attachments, status tracking
- **Brain Dump**: AI-powered idea capture with auto-categorization, history, save-to-note
- **Invoices**: Builder with scope import, auto-numbering (INV-001), line items, tax, print/PDF preview
- **Scopes**: Template → instance pattern, deliverables builder, status workflow (draft → sent → approved), print/PDF
- **Resources**: Link/file resource library with tags and client linking

### Platform Features
- **Auth**: Login, register, password reset, email verification, team switching (Supabase Auth)
- **RBAC**: owner/admin/member/viewer/client roles with route guards and backend enforcement
- **Client Portal**: Restricted layout (ClientLayout) with dashboard, project view, onboarding
- **Teams**: Invite system, role management, team switching with data reload
- **Settings**: Profile, dark mode toggle, webhook manager, API key manager, audit log viewer
- **Global Search**: Command palette (Cmd+K) searching tasks/projects/clients/notes/campaigns, `>` prefix for commands
- **Keyboard Shortcuts**: g-chord navigation (g+d=Dashboard, g+t=Tasks, etc.) with sidebar hints
- **Notifications**: Bell with dropdown, mark-as-read, polling (60-second interval)
- **Comments**: Threaded comments on tasks with ownership enforcement

### Architecture
- **DI Container**: ServiceContainer with symbol keys, lazy singleton resolution
- **Repository Pattern**: `Repository<T, CreateDTO, UpdateDTO>` interface, 20 Supabase repository implementations
- **Feature Modules**: 15 modules declaring routes, nav items, search providers, dependencies
- **All 18 Pinia stores**: Fully migrated to repository pattern via DI container
- **Zero legacy imports**: No `src/services/`, no axios, no Netlify code -all deleted
- **Supabase Backend**: 10 SQL migrations, 26 tables, RLS policies, active_* views for soft delete, auto_inject triggers
- **Express API Server**: AI processing (Anthropic), webhook delivery (HMAC + retry), email (nodemailer)
- **Docker**: Full-stack compose (docker-compose.yml) + dev-only Supabase stack (docker-compose.dev.yml)
- **CI/CD**: ESLint v9 flat config, Prettier, GitHub Actions, DO App Platform deploy-on-push
- **Health check**: `/health` endpoint with DB ping, integrated with DO App Platform health monitoring
- **Docs**: All docs/ files (including plugin-guide.md), 6 .architecture/ files, README.md fully updated for Supabase stack
- **Search→Notes**: Highlight query param + scroll-to on Notes page mount

### UX Polish
- **Unsaved changes warning**: `useUnsavedChanges` composable (dirty tracking + route guard + beforeunload) on InvoiceBuilder, ScopeBuilder, ProjectForm
- **Loading states**: LoadingSpinner component on all pages (including portal pages)
- **Empty states**: EmptyState component with icons and action buttons on all list pages
- **Error handling**: Toast notifications on mutation errors only; stores never toast on fetch failures (pages decide)
- **Toast discipline**: All Promise.allSettled loops use `results.some()` for a single toast max, not forEach
- **Delete confirmation**: ConfirmDialog modal component used everywhere (BrainDump, Resources, Tasks, Projects, Notes); `window.confirm()` only in onBeforeRouteLeave navigation guards
- **Accessibility**: aria-labels on icon-only buttons, focus trapping in modals, focus restore on search close, sr-only labels on search inputs, aria-invalid/aria-describedby on form fields, aria-live result announcements in GlobalSearch, role="status" on LoadingSpinner
- **Print/PDF**: Global print stylesheet, dedicated preview modals for invoices and scopes
- **Getting Started checklist**: Shows on first login, wired to real store data (team, client, project, task, brain dump)
- **Team creation**: "+" button in header for creating new teams (both single-team and multi-team users)
- **Sidebar nav visibility**: ADMIN nav group hidden for non-admin/non-owner users
- **Role-check feedback**: Router redirects to /dashboard with "insufficient permissions" toast instead of silent redirect

---

## Backend Security Posture

### What's in place
- **Authentication**: Supabase Auth (GoTrue) with JWT, automatic token refresh
- **Team scoping**: RLS policies on all tables enforce team_id from JWT claims
- **Soft delete**: active_* views filter deleted rows, all writes use soft delete
- **RBAC**: Role-based access control in JWT claims, route guards on frontend, sidebar filtering
- **Rate limiting**: Express API server uses express-rate-limit (100 req/15 min global)
- **Security headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS (prod), Content-Security-Policy (Express + nginx)
- **Input validation**: AI endpoint enforces 50K char prompt limit, max_tokens clamping, type allowlist; context isolated from system prompt; email endpoint validates format and sanitizes HTML
- **Audit logging**: Create/update/delete operations log to audit trail; DELETE triggers on comments/notifications; team_members/team_invites membership changes audited
- **Cascade protection**: Client delete blocked if active projects exist

### Known remaining gaps
- **AI adapter missing auth header**: `ai.adapter.ts` does not send Authorization header; AI feature will 401 in production
- ~~**getToken() vestigial**~~: Fixed — auth adapter now exposes `getSession()`, auth store uses SDK-managed sessions
- **Registration race condition**: `register()` does 4 sequential DB inserts without a transaction; partial failure leaves orphaned records (mitigated by cleanup catch block)
- **RBAC on DELETE**: Most resource endpoints allow any authenticated team member to delete. Consider RLS policies to restrict to owner/admin
- ~~**Shared isLoading race condition**~~: Fixed — calendar, team, client, project stores now use `useLoadingCounter()` composable
- **Comment adapter missing team_id/user_id**: `comment.repository.ts` createComment() does not inject team_id or user_id; auto_inject trigger handles this but explicit injection would be more robust
- **Base repository doesn't inject team_id/created_by**: `base.repository.ts` create() relies on auto_inject triggers to fill these; no app-level fallback if triggers are missing
- **Email endpoint missing protocol validation**: inviteUrl accepts non-https protocols (javascript://, data://)
- **AI endpoint needs per-user rate limiting**: Global 100 req/15min is too lenient for expensive Anthropic API calls
- **Unsaved changes guard incomplete**: Invoice, Scope, Project forms use `useUnsavedChanges` composable (route guard + beforeunload); Task, Note, Campaign, Client forms use modals (not page navigation)
- **~100 Vue components missing `lang="ts"`**: Progressive migration needed, starting with `src/components/ui/`
- **Home.vue**: Landing page has its own scoped button styles that diverge from the brutalist design system (intentional for marketing)
- **Supabase Realtime deployed but unused**: Either switch notifications from polling to Realtime or remove from docker-compose

---

## What's NOT Built

### TypeScript Migration (Partial)
- All stores (18) are TypeScript
- Router and config are TypeScript
- **~100 Vue components still use `<script setup>` without `lang="ts"`**

### Testing
- 215 tests across 16 test files
- Core: service-container (8), event-bus (8), plugin-registry (19)
- Auth store: 20 tests (SDK session recovery, fallback, login/register/logout/switchTeam/createTeam, RBAC computeds)
- Store tests: task (19), notification (17), team (24), project (17), client (15), calendar (12), campaign (11), invoice (12), comment (9), brain-dump (10)
- Composable tests: useLoadingCounter (9), useUnsavedChanges (5)
- Test helpers: mock factories, store setup, mock router/toast
- No component tests, integration tests, or E2E tests

### Other
- No file upload (resources are link-based only)
- No bulk actions on list pages
- No inline editing on table cells
- No dashboard widget customization/drag-and-drop
- No recent items in search
- App.vue has 2 hardcoded hex values in `<style>` (#111827, #f3f4f6) -should use CSS vars

---

## File Counts

| Category | Count |
|----------|-------|
| Feature modules | 15 |
| Vue files (total) | 107 (21 module pages + 2 standalone pages + 6 auth + 3 portal + 75 components) |
| Composables | 8 |
| Pinia stores | 18 (all TS, all using repository pattern) |
| Supabase adapter files | 25 (20 repository + 1 auth + 1 search + 1 AI + base class + index + client) |
| Express API endpoints | 3 (AI, webhooks, email) |
| SQL migrations | 10 (26 tables) |
| Test files | 16 (215 tests) |
| Type definition files | 4 (models, api, enums, index) + core/types.ts |

---

## Development

```bash
# Local development (requires Docker for Supabase stack)
npm run dev:supabase     # Start Supabase stack (PostgreSQL, GoTrue, PostgREST, Realtime, Kong)
npm run dev              # Start Vite dev server (port 5173)
npm run dev:server       # Start Express API server (port 3001)
npm run dev:full         # Start all three above

# Or run individual commands
npm run build            # Production build (Vite)
npm run type-check       # vue-tsc --noEmit
npm test                 # Run vitest tests (215 tests)
npm run lint             # ESLint check
npm run format           # Prettier format

# Stop Supabase stack
npm run dev:supabase:down

# Full stack (Docker, self-hosted)
docker compose up -d
```

### Environment Variables
See `.env.example` for all required variables. Key ones:
- `VITE_SUPABASE_URL` -Supabase endpoint (http://localhost:8000 for local dev)
- `VITE_SUPABASE_ANON_KEY` -Supabase anonymous key
- `VITE_API_URL` -API server URL (/api for both local and production)
- `SUPABASE_SERVICE_ROLE_KEY` -Server-side Supabase key (Express API)
- `ANTHROPIC_API_KEY` -For AI features

### Key Patterns
- **Page layout**: Always `<PageContainer>` → `<PageHeader>` → content
- **DI container**: `getContainer().resolve<T>(SYMBOL_KEY)` -stores use `getRepo()` helper
- **Vue provide/inject**: Typed `InjectionKey<T>` symbols in `src/injection-keys.ts` — components use `inject(registryKey)`, NOT string keys
- **Repository pattern**: `Repository<T, CreateDTO, UpdateDTO>` interface with Supabase implementations
- **Feature modules**: Each declares `id`, `routes`, `navItems`, `searchProviders`, `dependencies`, `setup()`
- **API calls**: Store → repository adapter → page component with try/catch + toast.error
- **Forms**: `useModalState` composable for modal open/close/edit state
- **Unsaved changes**: `useUnsavedChanges` composable (dirty tracking, route guard, beforeunload)
- **Loading state**: `useLoadingCounter` composable (concurrent-safe isLoading for stores)
- **Confirmation**: `useConfirmDialog` composable for delete confirmations
- **Entity resolution**: `useEntityLookup` for client/project name + color lookups from IDs
- **Soft delete**: active_* views filter deleted rows automatically via RLS
- **Calendar sync**: Tasks and projects auto-create/update calendar events on due date changes

### Deployment
- **Frontend**: DO App Platform static site (Vite build → dist/)
- **API Server**: DO App Platform service (Docker, port 3001, /api route)
- **Supabase**: DO Droplet with self-hosted stack (see infra/droplet-setup.sh)
- **CI/CD**: GitHub Actions for lint/type-check/build/test, DO deploy-on-push

---

### Cleanup Complete (2026-03-09)
- Deleted `.netlify/` cache, dead `CampaignDetail.vue`, MongoDB env vars
- Removed `axios` dependency, `netlify/**` ESLint ignore
- Fixed `index.html` OG URL (netlify.app → launchcue.app)
- Added note highlight from search (GlobalSearch → Notes with query param)
- Clarified `createFromScope()` two-step flow with comment
- All docs rewritten: zero Netlify/MongoDB references in source or docs
- `gaps-and-issues.md`: 13 resolved, 8 open, 2 acceptable

### Production Deployment (2026-03-10)
- Deployed to DigitalOcean: App Platform (Vue SPA + Express API) + Droplet (self-hosted Supabase)
- Domain: `launchcue.app` (frontend), `supabase.launchcue.app` (Supabase via Caddy TLS)
- Fixed RLS policies for registration flow: INSERT RETURNING requires SELECT policy to also pass
  - `users_select`: added `auth_id = auth.uid()` check (avoids chicken-and-egg with app_user_id)
  - `teams_select`: added `owner_id = auth.app_user_id()` check (owner can see team before team_members row)
- Migration 006 added for registration RLS fixes
- Server Dockerfile: multi-stage build for TypeScript compilation
- Vite proxy: rewrites `/api` prefix for local dev parity with App Platform routing
- CORS: Caddy passes through, Kong handles CORS headers (no duplication)

### Full Code Audit (2026-03-10)
- Removed toast.error() from all store fetch/read methods (calendar, client, team); stores set error.value and return result objects
- Replaced all 12 Promise.allSettled forEach toast loops with single-toast `results.some()` pattern across 11 pages
- Replaced browser confirm() with ConfirmDialog modal in BrainDump and Resources pages
- Fixed brain-dump adapter: `createItems()` now injects team_id from auth context (was missing, causing NOT NULL failures)
- Fixed brain-dump adapter: `getContextData()` calendar query now uses correct column names (start_time/end_time, not start/end)
- Fixed invoice adapter: `generate_invoice_number` RPC now resolves teamId from user metadata (was always null)
- Added security headers middleware to Express server (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
- Added input validation to AI endpoint (50K char limit, max_tokens clamped 1-4096)
- Added email validation, URL validation, and HTML escaping to email endpoint
- Added ConfirmDialog modal for delete confirmations (BrainDump, Resources)
- Added sr-only label to Resources search input
- Disabled Profile upload button with "Coming soon" tooltip
- Sidebar hides ADMIN nav group for non-admin/non-owner users
- Router role-check redirect now shows "insufficient permissions" toast instead of silent redirect
- Dashboard wired hasBrainDump prop to real brainDumpStore.dumps data
- Added "Create Team" button to header layout (both single-team and multi-team views)

### Adapter & Trigger Audit (2026-03-10)
Deep audit of all 20 Supabase adapter repositories, 18 Pinia stores, and SQL triggers. Found and fixed 11 bugs:

**Column mismatch / phantom filter bugs (adapters):**
- Calendar `findAll({ startDate, endDate })` produced `.eq('start_date', ...)` — column is `start_time`. Fixed: override with `.gte('start_time')` / `.lte('start_time')`
- Task `findAll({ startDate, endDate, hasDueDate })` produced 3 phantom columns. Fixed: override with `.gte('due_date')` / `.lte('due_date')` / `.not('due_date', 'is', null)`
- Task `search` filter would produce `.eq('search', ...)`. Fixed: handle as `.ilike('title', ...)`
- Invoice `dateFrom`/`dateTo` would produce phantom columns. Fixed: override with `.gte('created_at')` / `.lte('created_at')`
- Brain-dump `getContextData()` queried tasks with `.eq('client_id', ...)` — tasks have no `client_id`. Fixed: resolve via project join
- Audit log `mapFromDb` read `row.timestamp` — column is `created_at`. Fixed

**RLS / NOT NULL violations (adapters):**
- Team `create()` omitted `owner_id` (required by RLS). Fixed: resolve user ID, insert with `owner_id`, create `team_members` row, update user metadata
- Team `inviteUser()` omitted `invited_by` and `expires_at` (both NOT NULL). Fixed: resolve user ID, set 7-day expiry

**Model / mapping bugs:**
- Notification model + adapter missing `teamId` field (DB has `team_id NOT NULL`). Fixed
- Brain-dump `createItems()` used brain dump's field map for tasks/events/projects — `start` stayed as `start` instead of `start_time`. Fixed: entity-specific field maps

**SQL trigger bug (migration 008):**
- 4 tables (campaigns, notes, calendar_events, brain_dumps) had `team_and_user` trigger mode but use `user_id` not `created_by`. PL/pgSQL would error on `NEW.created_by` for these tables. Fixed: migration 008 changes to `team_and_userid`. Applied on live DB.

### Comprehensive Security & Quality Audit (2026-03-10)
Full-stack audit across SQL, RLS, Express, auth, DI, adapters, stores, modules, components, router, infra, and accessibility. Fixed 25+ issues:

**P0 — Critical Security Fixes:**
- Auth: `register()` now refreshes JWT after `updateUser()` to include `current_team_id` in claims (was returning stale JWT → all INSERTs failed with RLS 42501)
- Auth: `login()` now sets `current_team_id` in metadata if missing + refreshes JWT (permanent fix for users with broken metadata)
- Auth: `persistSession: true` — Supabase SDK now persists sessions natively (page reload no longer loses SDK session)
- Docker: All compose files use `${VAR:?error}` syntax — `docker compose up` fails loudly without required env vars
- RLS: Notification INSERT restricted to `service_role` only (migration 009) — prevents user-spoofed notifications
- AI: User-provided context moved to separate user message (not interpolated into system prompt) — prevents prompt injection. Type allowlist + 5000 char limit.
- Webhooks: Queue endpoint now verifies admin/owner role via `team_members` table
- CSP: Content-Security-Policy headers added to both Express API and nginx

**P1 — Architecture & Reliability:**
- Auth store: Extracted `resetAllStores()` — called on both logout AND team switch (stops notification polling, disposes all stores)
- PluginRegistry: `setup()` errors caught per-module — logs error, continues initializing remaining modules, tracks `failedModules`
- EventBus: Handler errors logged with `console.error` instead of silently swallowed
- Client store: `loading` renamed to `isLoading` (consistent with all 17 other stores)
- 13 stores: Added early-return team guard (`if (!useAuthStore().currentTeam) return []`) to all fetch methods
- Health check: Enhanced with DB ping, returns `{ status, db, timestamp }`, 503 on failure; added `health_check` to `.do/app.yaml`

**P2 — Quality & DX:**
- Forms: `aria-invalid`, `aria-describedby`, `role="alert"` on FormInput/FormSelect/FormTextarea error states
- GlobalSearch: `aria-live="polite"` region announces result counts to screen readers
- LoadingSpinner: `role="status"` and `aria-label` for accessibility
- Audit logging: DELETE triggers on comments/notifications (migration 010); team_members/team_invites membership changes now audited
- Router: Warns about failed modules via `registry.getFailedModules()`
- DI: Typed `InjectionKey<T>` symbols extracted to `src/injection-keys.ts`; used by `main.ts` (provide) and components (inject)

**Documentation:**
- `docs/plugin-guide.md`: Comprehensive developer guide for adding/removing feature modules (7 sections with code examples)

### Hardening & Testing Sprint (2026-03-10)
Full hardening pass: auth session reconciliation, concurrent loading safety, unsaved changes composable, and comprehensive test suite.

**Auth Session Reconciliation (Critical):**
- Auth store `initAuth()` now async — recovers session from Supabase SDK (`getSession()`) before falling back to sessionStorage
- Removed manual `isTokenExpired()` and sessionStorage token management — SDK owns tokens via `autoRefreshToken: true` + `persistSession: true`
- Auth adapter gains `getSession()` method returning `{ access_token, refresh_token }` from SDK
- `main.ts` now awaits `authStore.initAuth()` — session recovered before any route navigation
- New tabs share session via localStorage (SDK-managed); app metadata (user/teams/currentTeam) still in sessionStorage with API rebuild fallback

**Concurrent Loading Safety:**
- New `useLoadingCounter` composable: counter-based `isLoading` computed + `wrap()` for safe concurrent operations
- Applied to calendar (6 methods), team (7 methods), client (1 method), project (3 methods) stores
- Concurrent async calls no longer corrupt `isLoading` state

**Unsaved Changes Composable:**
- New `useUnsavedChanges` composable: dirty tracking with `markLoaded()`/`markClean()`, `onBeforeRouteLeave` guard, `beforeunload` handler
- Refactored ProjectForm, InvoiceBuilder, ScopeBuilder from inline implementation to composable

**Test Suite (52 → 215 tests):**
- Test helpers: `mock-factories.ts` (7 factories), `store-setup.ts` (setupStoreTest + seedAuth), mock-router, mock-toast
- 11 new store test files covering all CRUD operations, auth guards, error handling, computed properties
- 2 composable test files covering concurrent operations, dirty tracking, cleanup
- All 215 tests pass, `tsc --noEmit` clean, `vite build` succeeds

### Navigation & Role Sync Fix (2026-03-10)
Fixed two bugs causing missing sidebar navigation items:

**Bug 1 — Sidebar inject key mismatch (all nav items missing for all users):**
- `Sidebar.vue` used `inject('registry')` (string key) but `main.ts` provided with `Symbol('registry')` via typed `InjectionKey<T>`
- `inject('registry')` returned `undefined`, so `getNavGroups()` was never called — only hardcoded Dashboard item showed
- Fix: Import `registryKey` from `src/injection-keys.ts` and use typed inject
- Extracted all three injection keys (`containerKey`, `eventBusKey`, `registryKey`) from `main.ts` into `src/injection-keys.ts` to avoid circular imports

**Bug 2 — Missing user role after registration/team creation (ADMIN group hidden):**
- `setCurrentTeam()` set `currentTeam.value` but never synced `team.role` to `user.value.role`
- Auth adapter's `register()` returns user without role; `login()` explicitly includes role but only from the adapter response
- After registration or `createTeam()`, `user.value.role` was undefined → RBAC computeds hid ADMIN nav group
- Fix: `setCurrentTeam()` now syncs `team.role` to `user.value.role` and persists to sessionStorage
- This fixes registration, createTeam, switchTeam, and loadUserTeams flows (all funnel through `setCurrentTeam()`)

*Last updated: 2026-03-10*
