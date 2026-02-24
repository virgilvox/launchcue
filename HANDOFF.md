# LaunchCue — Handoff Document

> DevRel management platform built with Vue 3, Tailwind CSS, Netlify Functions, and MongoDB.

---

## Architecture Overview

### Tech Stack
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Pinia stores, Vue Router, Tailwind CSS
- **Backend**: Netlify Functions (Node.js, CommonJS), MongoDB via `mongodb` driver
- **Auth**: JWT tokens stored in sessionStorage, API key support, RBAC (owner/admin/member/viewer/client)
- **Design System**: CSS custom properties (brutalist style — 0 border-radius, 2px borders, hard offset shadows)

### Directory Structure
```
src/
  components/       # Reusable UI + feature components
    ui/             # Design system primitives (Modal, PageHeader, EmptyState, etc.)
    dashboard/      # Dashboard widgets (StatsGrid, ClientHealthWidget, etc.)
    tasks/          # Task-specific (TaskList, TaskKanban, TaskForm, etc.)
    calendar/       # Calendar views (MonthView, WeekView, DayView)
    campaign/       # Campaign components
    client/         # Client detail components
    project/        # Project detail components
    invoice/        # Invoice components
    scope/          # Scope builder components
    brain-dump/     # Brain dump components
    settings/       # Settings panel components
  composables/      # Vue composables (useModalState, useEntityLookup, etc.)
  constants/        # Static data (clientColors.ts)
  layouts/          # DefaultLayout.vue, ClientLayout.vue
  pages/            # Route-level page components
    auth/           # Login, Register, ForgotPassword, etc.
    client-portal/  # Portal pages for client users
  services/         # API service layer (*.ts)
  stores/           # Pinia stores (*.ts)
  types/            # TypeScript types (models, api, enums)
  utils/            # Utility functions (formatters, dateFormatter, statusColors)
netlify/
  functions/        # Serverless API endpoints (*.js, CommonJS)
    utils/          # Shared backend utilities (db, auth, response, softDelete, etc.)
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
- **Auth**: Login, register, password reset (token-based), email verification (token-based), team switching
- **RBAC**: owner/admin/member/viewer/client roles with route guards and backend enforcement
- **Client Portal**: Restricted layout (ClientLayout) with dashboard, project view, onboarding
- **Teams**: Invite system, role management, team switching with data reload
- **Settings**: Profile, dark mode toggle, webhook manager, API key manager, audit log viewer
- **Global Search**: Command palette (Cmd+K) searching tasks/projects/clients/notes/campaigns, `>` prefix for commands
- **Keyboard Shortcuts**: g-chord navigation (g+d=Dashboard, g+t=Tasks, etc.) with sidebar hints
- **Notifications**: Bell with dropdown, mark-as-read
- **Comments**: Threaded comments on tasks with ownership enforcement

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
- **Authentication**: All endpoints use centralized `authenticate()` (JWT + API key)
- **Team scoping**: All queries include `teamId` (including updateOne and post-update findOne)
- **Soft delete**: All primary resources use `softDelete()` + `...notDeleted` filter on all queries (GET, PUT existence checks, DELETE, list queries)
- **Zod validation**: All POST/PUT endpoints validate request body with Zod schemas
- **Field stripping**: All PUT handlers strip `teamId`, `createdBy`, `createdAt`, `_id`, `id`, `deletedAt`, `deletedBy`
- **RBAC**: audit-logs (owner/admin), onboarding write ops (owner/admin), teams (owner for delete, owner/admin for invite/role changes)
- **Rate limiting**: All endpoints check rate limits
- **Audit logging**: Create/update/delete operations log to audit trail
- **Cascade protection**: Client delete blocked if active projects exist

### Known remaining gaps
- **RBAC on DELETE**: Most resource endpoints (tasks, projects, campaigns, notes, calendar-events, resources, scope-templates, invoices, webhooks) allow any authenticated team member to delete. Consider adding `requireRole(['owner', 'admin', 'member'])` to exclude viewers.
- **brain-dump-create-items.js**: AI-generated items are spread directly (`...item`) with no Zod schema. Low risk since it's internal AI output, but should be validated.
- **ai-process.js**: Request body (model, max_tokens) is not Zod-validated. User could set arbitrary model names or large token counts.
- **Home.vue**: Landing page has its own scoped button/component styles that diverge from the brutalist design system (border-radius, shadows). This is intentional for marketing but noted for consistency.

---

## What's NOT Built

### Email Integration
Token-based flows exist for password reset, email verification, and client invitations, but **no email sending** is implemented. The tokens are generated and stored; a transport (SendGrid, SES, Resend, etc.) needs to be wired up.

### Testing
- 13 utility unit tests exist (`src/utils/__tests__/`)
- No component tests, integration tests, or E2E tests
- No backend function tests

### TypeScript Migration (Partial)
- All services (16) and stores (10) are TypeScript
- Router and config are TypeScript
- **80+ Vue components still use `<script setup>` without `lang="ts"`**
- Backend functions remain CommonJS JavaScript (by design — Netlify Functions)

### Other
- No real-time updates (WebSocket/SSE)
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
| Vue pages | 24 (+ 6 auth + 3 portal) |
| Vue components | ~60 |
| Composables | 6 (useModalState, useResponsive, useConfirmDialog, useEntityLookup, useKeyboardShortcuts, useTooltips) |
| Frontend services | 20 (16 TS + 4 JS) |
| Frontend stores | 11 (10 TS + 1 JS) |
| Backend functions | 33 |
| Backend utils | 11 |
| Type definition files | 4 (models, api, enums, index) |

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server + Netlify Functions
npm run build        # Production build (Vite)
netlify dev          # Full local dev with functions
```

### Environment Variables
Required in `.env` or Netlify dashboard:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `OPENAI_API_KEY` — For brain dump AI processing

### Key Patterns
- **Page layout**: Always `<PageContainer>` → `<PageHeader>` → content
- **API calls**: Service layer → Pinia store → page component with try/catch + toast.error
- **Forms**: `useModalState` composable for modal open/close/edit state
- **Confirmation**: `useConfirmDialog` composable for delete confirmations
- **Entity resolution**: `useEntityLookup` for client/project name + color lookups from IDs
- **Soft delete**: Backend uses `softDelete()` utility + `...notDeleted` spread in all queries
- **Calendar sync**: Tasks and projects auto-create/update calendar events on due date changes

---

*Last updated: 2026-02-24*
