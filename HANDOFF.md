# LaunchCue — Handoff Document

> DevRel management platform built with Vue 3, Tailwind CSS, Supabase (PostgreSQL), and Express API server.

---

## Architecture Overview

### Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Pinia stores, Vue Router, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + RLS + GoTrue auth + PostgREST + Realtime)
- **API Server**: Express (AI processing, webhook delivery, email)
- **Auth**: Supabase Auth (GoTrue), JWT, RBAC (owner/admin/member/viewer/client)
- **Design System**: CSS custom properties (brutalist style — 0 border-radius, 2px borders, hard offset shadows)
- **Architecture**: Plugin-based DI container, Repository pattern, feature modules with topological dependency sort
- **Deployment**: DigitalOcean App Platform (static site + API service) + Droplet (self-hosted Supabase)

### Directory Structure
```
src/
  core/             # DI container, event bus, plugin registry, types
  adapters/         # Repository implementations (supabase/), types, keys
  modules/          # 15 feature modules — each has {pages/, components/, index.ts}
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
  composables/      # Vue composables (useModalState, useEntityLookup, etc.)
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
  migrations/       # PostgreSQL schema (5 migrations, 26 tables, RLS, triggers)
supabase/           # Kong config, migrations for Docker
infra/              # Droplet setup script
.do/                # DigitalOcean App Platform spec
tests/
  core/             # Service container, event bus, plugin registry tests
  stores/           # Auth store tests
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
- **Zero legacy imports**: No `src/services/`, no axios, no Netlify code — all deleted
- **Supabase Backend**: 5 SQL migrations, 26 tables, RLS policies, active_* views for soft delete
- **Express API Server**: AI processing (Anthropic), webhook delivery (HMAC + retry), email (nodemailer)
- **Docker**: Full-stack compose (docker-compose.yml) + dev-only Supabase stack (docker-compose.dev.yml)
- **CI/CD**: ESLint v9 flat config, Prettier, GitHub Actions, DO App Platform deploy-on-push
- **Docs**: All 7 docs/ files, 6 .architecture/ files, README.md fully updated for Supabase stack
- **Search→Notes**: Highlight query param + scroll-to on Notes page mount

### UX Polish
- **Unsaved changes warning**: onBeforeRouteLeave guard on InvoiceBuilder, ScopeBuilder, ProjectForm
- **Loading states**: LoadingSpinner component on all pages (including portal pages)
- **Empty states**: EmptyState component with icons and action buttons on all list pages
- **Error handling**: Toast notifications on all API error paths
- **Accessibility**: aria-labels on icon-only buttons, focus trapping in modals, focus restore on search close
- **Print/PDF**: Global print stylesheet, dedicated preview modals for invoices and scopes

---

## Backend Security Posture

### What's in place
- **Authentication**: Supabase Auth (GoTrue) with JWT, automatic token refresh
- **Team scoping**: RLS policies on all tables enforce team_id from JWT claims
- **Soft delete**: active_* views filter deleted rows, all writes use soft delete
- **Zod validation**: API server validates request bodies with Zod schemas
- **RBAC**: Role-based access control in JWT claims, route guards on frontend
- **Rate limiting**: Express API server uses express-rate-limit
- **Audit logging**: Create/update/delete operations log to audit trail
- **Cascade protection**: Client delete blocked if active projects exist

### Known remaining gaps
- **RBAC on DELETE**: Most resource endpoints allow any authenticated team member to delete. Consider RLS policies to restrict to owner/admin.
- **brain-dump createItems**: AI-generated items inserted with minimal validation. Low risk since it's internal AI output.
- **Home.vue**: Landing page has its own scoped button styles that diverge from the brutalist design system (intentional for marketing).

---

## What's NOT Built

### TypeScript Migration (Partial)
- All stores (18) are TypeScript
- Router and config are TypeScript
- **~100 Vue components still use `<script setup>` without `lang="ts"`**

### Testing
- 52 tests across 4 test files (core infrastructure + auth store)
- Core: service-container (8), event-bus (8), plugin-registry (19)
- Auth store: 17 tests
- No component tests, integration tests, or E2E tests

### Other
- No file upload (resources are link-based only)
- No bulk actions on list pages
- No inline editing on table cells
- No dashboard widget customization/drag-and-drop
- No recent items in search
- App.vue has 2 hardcoded hex values in `<style>` (#111827, #f3f4f6) — should use CSS vars

---

## File Counts

| Category | Count |
|----------|-------|
| Feature modules | 15 |
| Vue files (total) | 107 (21 module pages + 2 standalone pages + 6 auth + 3 portal + 75 components) |
| Composables | 6 |
| Pinia stores | 18 (all TS, all using repository pattern) |
| Supabase adapter files | 25 (20 repository + 1 auth + 1 search + 1 AI + base class + index + client) |
| Express API endpoints | 3 (AI, webhooks, email) |
| SQL migrations | 5 (26 tables) |
| Test files | 4 (52 tests) |
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
npm test                 # Run vitest tests (52 tests)
npm run lint             # ESLint check
npm run format           # Prettier format

# Stop Supabase stack
npm run dev:supabase:down

# Full stack (Docker, self-hosted)
docker compose up -d
```

### Environment Variables
See `.env.example` for all required variables. Key ones:
- `VITE_SUPABASE_URL` — Supabase endpoint (http://localhost:8000 for local dev)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key
- `VITE_API_URL` — API server URL (/api for both local and production)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase key (Express API)
- `ANTHROPIC_API_KEY` — For AI features

### Key Patterns
- **Page layout**: Always `<PageContainer>` → `<PageHeader>` → content
- **DI container**: `getContainer().resolve<T>(SYMBOL_KEY)` — stores use `getRepo()` helper
- **Repository pattern**: `Repository<T, CreateDTO, UpdateDTO>` interface with Supabase implementations
- **Feature modules**: Each declares `id`, `routes`, `navItems`, `searchProviders`, `dependencies`, `setup()`
- **API calls**: Store → repository adapter → page component with try/catch + toast.error
- **Forms**: `useModalState` composable for modal open/close/edit state
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

*Last updated: 2026-03-09*
