# File Manifest — Every File & Its Purpose

## Frontend Entry

| File | Purpose | Key Dependencies |
|------|---------|-----------------|
| `src/main.ts` | App bootstrap: create Vue, register plugins via PluginRegistry, init Supabase auth | Pinia, Router, Toastification, PluginRegistry, injection-keys |
| `src/injection-keys.ts` | Typed `InjectionKey<T>` symbols for Vue provide/inject (containerKey, eventBusKey, registryKey) | Vue, core/types, core/plugin-registry |
| `src/App.vue` | Root component, RouterView wrapper, CSS var application | — |
| `vite.config.ts` | Build config, @ alias, proxy /api → localhost:3001 | — |
| `tailwind.config.js` | Design tokens: 0 radius, 2px borders, brutal shadows, fonts | — |
| `index.html` | HTML shell, Google Fonts (Space Grotesk, Inter, JetBrains Mono) | — |

## Core Infrastructure (4)

| File | Purpose |
|------|---------|
| `src/core/service-container.ts` | Symbol-keyed DI container, lazy singleton resolution |
| `src/core/event-bus.ts` | Typed event emitter for cross-module communication |
| `src/core/plugin-registry.ts` | Feature module registration with topological dependency sort |
| `src/core/types.ts` | FeatureModule, NavItem, SearchProvider interfaces |

## Adapters

### Repository Keys
| File | Purpose |
|------|---------|
| `src/adapters/repository-keys.ts` | 22 Symbol keys for DI resolution |
| `src/adapters/types.ts` | Repository<T, CreateDTO, UpdateDTO> interface + extended interfaces |

### Supabase Adapters (25 files: 19 repos + 3 adapters + base + index + client)
| File | Repository Key | Table |
|------|---------------|-------|
| `src/adapters/supabase/ai.adapter.ts` | AI_ADAPTER | Anthropic AI proxy |
| `src/adapters/supabase/auth.adapter.ts` | AUTH_ADAPTER | GoTrue auth |
| `src/adapters/supabase/base.repository.ts` | — | Abstract base class |
| `src/adapters/supabase/brain-dump.repository.ts` | BRAIN_DUMP_REPO | brain_dumps |
| `src/adapters/supabase/calendar-event.repository.ts` | CALENDAR_EVENT_REPO | calendar_events |
| `src/adapters/supabase/campaign.repository.ts` | CAMPAIGN_REPO | campaigns |
| `src/adapters/supabase/client.repository.ts` | CLIENT_REPO | clients |
| `src/adapters/supabase/client-invitation.repository.ts` | CLIENT_INVITATION_REPO | client_invitations |
| `src/adapters/supabase/comment.repository.ts` | COMMENT_REPO | comments |
| `src/adapters/supabase/index.ts` | — | Registers all adapters in container |
| `src/adapters/supabase/invoice.repository.ts` | INVOICE_REPO | invoices |
| `src/adapters/supabase/note.repository.ts` | NOTE_REPO | notes |
| `src/adapters/supabase/notification.repository.ts` | NOTIFICATION_REPO | notifications |
| `src/adapters/supabase/client.ts` | — | Supabase JS client singleton |
| `src/adapters/supabase/onboarding.repository.ts` | ONBOARDING_REPO | onboarding_checklists |
| `src/adapters/supabase/project.repository.ts` | PROJECT_REPO | projects |
| `src/adapters/supabase/resource.repository.ts` | RESOURCE_REPO | resources |
| `src/adapters/supabase/scope.repository.ts` | SCOPE_REPO | scopes |
| `src/adapters/supabase/scope-template.repository.ts` | SCOPE_TEMPLATE_REPO | scope_templates |
| `src/adapters/supabase/search.adapter.ts` | SEARCH_ADAPTER | Full-text search |
| `src/adapters/supabase/task.repository.ts` | TASK_REPO | tasks |
| `src/adapters/supabase/team.repository.ts` | TEAM_REPO | teams, team_members |
| `src/adapters/supabase/webhook.repository.ts` | WEBHOOK_REPO | webhooks |
| `src/adapters/supabase/audit-log.repository.ts` | AUDIT_LOG_REPO | audit_logs |
| `src/adapters/supabase/api-key.repository.ts` | API_KEY_REPO | api_keys |

## Feature Modules (15 directories, 14 registered)

| Module | Routes | Nav | Search | Registered |
|--------|--------|-----|--------|-----------|
| `src/modules/tasks/` | tasks, task-detail | WORK | tasks | Yes |
| `src/modules/projects/` | projects, project-detail, project-form | WORK | projects | Yes |
| `src/modules/clients/` | clients, client-detail | WORK | clients | Yes |
| `src/modules/campaigns/` | campaigns-list, campaign-new, campaign-detail | WORK | campaigns | Yes |
| `src/modules/calendar/` | calendar | PLAN | — | Yes |
| `src/modules/notes/` | notes | CAPTURE | notes | Yes |
| `src/modules/brain-dump/` | brain-dump | CAPTURE | — | Yes |
| `src/modules/scopes/` | scopes, scope-builder, scope-templates | BUSINESS | — | Yes |
| `src/modules/invoices/` | invoices, invoice-builder | BUSINESS | — | Yes |
| `src/modules/settings/` | settings, profile | — | — | Yes |
| `src/modules/team/` | team | — | — | Yes |
| `src/modules/dashboard/` | dashboard | — | — | No (loaded directly by router) |
| `src/modules/resources/` | resources | CAPTURE | — | Yes |
| `src/modules/onboarding/` | — | — | — | Yes |
| `src/modules/notifications/` | — | — | — | Yes |

## Layouts (3)

| File | Purpose |
|------|---------|
| `src/layouts/DefaultLayout.vue` | Authenticated shell: sidebar + header + router-view + notification polling + keyboard shortcuts |
| `src/layouts/AuthLayout.vue` | Minimal centered layout for login/register/reset |
| `src/layouts/ClientLayout.vue` | Restricted portal layout for client role users |

## Stores (18)

| File | Pattern | Key Actions |
|------|---------|-------------|
| `src/stores/auth.ts` | Supabase Auth adapter | login, logout, register, switchTeam, initAuth |
| `src/stores/task.ts` | TASK_REPO via DI | fetchTasks, createTask, updateTask, deleteTask |
| `src/stores/project.ts` | PROJECT_REPO via DI | fetchProjects, createProject, updateProject, deleteProject |
| `src/stores/client.ts` | CLIENT_REPO via DI | fetchClients, createClient, updateClient, deleteClient |
| `src/stores/invoice.ts` | INVOICE_REPO via DI | fetchInvoices, createInvoice, createFromScope |
| `src/stores/scope.ts` | SCOPE_REPO via DI | fetchTemplates, fetchScopes, createScope |
| `src/stores/calendar.ts` | CALENDAR_EVENT_REPO via DI | fetchEvents, createEvent, updateEvent, deleteEvent |
| `src/stores/note.ts` | NOTE_REPO via DI | fetchNotes, createNote, updateNote, deleteNote |
| `src/stores/campaign.ts` | CAMPAIGN_REPO via DI | fetchCampaigns, createCampaign |
| `src/stores/comment.ts` | COMMENT_REPO via DI | fetchComments, createComment |
| `src/stores/notification.ts` | NOTIFICATION_REPO via DI | fetchNotifications, markAsRead, startPolling |
| `src/stores/onboarding.ts` | ONBOARDING_REPO via DI | fetchChecklists, updateStep |
| `src/stores/team.ts` | TEAM_REPO via DI | fetchTeam, inviteMember, updateMember |
| `src/stores/webhook.ts` | WEBHOOK_REPO via DI | fetchWebhooks, createWebhook |
| `src/stores/audit-log.ts` | AUDIT_LOG_REPO via DI | fetchLogs |
| `src/stores/api-key.ts` | API_KEY_REPO via DI | fetchKeys, createKey |
| `src/stores/brain-dump.ts` | BRAIN_DUMP_REPO via DI | submitBrainDump |
| `src/stores/resource.ts` | RESOURCE_REPO via DI | fetchResources, createResource |

## Composables (6)

| File | Provides | Used By |
|------|----------|---------|
| `useModalState.ts` | isOpen, editingItem, formData, open(), close() | Modal-based CRUD |
| `useConfirmDialog.ts` | isOpen, item, requestConfirm(), confirm(), cancel() | All delete confirmations |
| `useKeyboardShortcuts.ts` | showHelp, shortcuts[] | DefaultLayout (g-chords, c, ?, Esc) |
| `useResponsive.ts` | isMobile, isTablet, isDesktop | Sidebar, Modal, DataTable |
| `useTooltips.ts` | activeTooltip, shouldShow(), dismiss() | Dashboard onboarding |
| `useEntityLookup.ts` | getClientName(), getProjectName(), getClientColorId() | TaskList, Invoices, Campaigns |

## Types (4 files)

| File | Exports |
|------|---------|
| `models.ts` | 30+ interfaces: User, Team, Client, Project, Task, Campaign, Note, CalendarEvent, Scope, Invoice, etc. |
| `api.ts` | 30 request/response types: *CreateRequest, *UpdateRequest, *Filter, AuthResponse, PaginatedResponse<T> |
| `enums.ts` | 12 enum constants: TaskStatus, TaskPriority, ProjectStatus, CampaignStatus, TeamRole, etc. |
| `index.ts` | Re-exports all |

## Express API Server

| File | Purpose |
|------|---------|
| `server/src/index.ts` | Express entry: cors, rate-limit, routes, webhook processor start |
| `server/src/supabase.ts` | Supabase client (service role) |
| `server/src/middleware/auth.ts` | JWT validation via Supabase |
| `server/src/routes/ai.ts` | AI brain dump processing (Anthropic Claude SDK) |
| `server/src/routes/webhooks.ts` | Webhook CRUD + test delivery |
| `server/src/routes/email.ts` | Email sending (nodemailer) |
| `server/src/webhook-processor.ts` | Cron-style webhook queue processor (30s interval) |
| `server/Dockerfile` | Docker build for DO App Platform |

## Infrastructure

| File | Purpose |
|------|---------|
| `.do/app.yaml` | DigitalOcean App Platform config (static site + API service) |
| `infra/droplet-setup.sh` | Self-hosted Supabase Droplet provisioning |
| `docker-compose.dev.yml` | Local Supabase stack for development |

## Tests (4 files, 52 tests)

| File | Tests | Purpose |
|------|-------|---------|
| `tests/core/service-container.test.ts` | 8 | DI container resolution, singletons, errors |
| `tests/core/event-bus.test.ts` | 8 | Event emission, subscription, unsubscribe |
| `tests/core/plugin-registry.test.ts` | 19 | Module registration, dependency sort, boot |
| `tests/stores/auth.test.ts` | 17 | Auth store actions, state management |

## CSS & Assets

| File | Purpose |
|------|---------|
| `src/assets/main.css` | Design tokens (CSS vars), base styles, utility classes |
| `public/logo-placeholder.png` | Sidebar logo |
