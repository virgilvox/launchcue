# File Manifest — Every File & Its Purpose

## Frontend Entry

| File | Purpose | Key Dependencies |
|------|---------|-----------------|
| `src/main.ts` | App bootstrap: create Vue, init auth before router, install plugins | Pinia, Router, Toastification |
| `src/App.vue` | Root component, RouterView wrapper, CSS var application | — |
| `vite.config.ts` | Build config, @ alias, MIME type fix | — |
| `tailwind.config.js` | Design tokens: 0 radius, 2px borders, brutal shadows, fonts | — |
| `index.html` | HTML shell, Google Fonts (Space Grotesk, Inter, JetBrains Mono) | — |

## Layouts (3)

| File | Purpose |
|------|---------|
| `src/layouts/DefaultLayout.vue` | Authenticated shell: sidebar + header + router-view + notification polling + keyboard shortcuts |
| `src/layouts/AuthLayout.vue` | Minimal centered layout for login/register/reset |
| `src/layouts/ClientLayout.vue` | Restricted portal layout for client role users |

## Pages (21)

### Authenticated (DefaultLayout)
| File | Purpose | Stores Used | Key Components |
|------|---------|-------------|----------------|
| `Dashboard.vue` | Home: greeting, quick actions, stats, charts, activity, health, invoices | task, project, client, invoice | StatsGrid, TasksByStatusChart, ProjectCompletionChart, TasksDueChart, GettingStarted, ActivityFeed, ClientHealthWidget, OutstandingInvoices |
| `Tasks.vue` | Task list/kanban with filters, create/edit modal | task, project, client | TaskList, TaskKanban, TaskFilters, TaskForm |
| `TaskDetail.vue` | Single task detail (route param) | task | CommentThread |
| `Projects.vue` | Project cards with filters | project, client | — |
| `ProjectDetail.vue` | Project info + team + tasks sections | project, task, client | ProjectStatsCard, ProjectDetailsCard, ProjectTeamSection, ProjectTasksSection |
| `ProjectForm.vue` | Create/edit project with unsaved warning | project, client | — |
| `Clients.vue` | Client cards with color dots | client | ClientColorDot |
| `ClientDetail.vue` | Client info + contacts + projects | client, project | ClientInfoSection, ClientContactsSection, ClientProjectsTable |
| `Calendar.vue` | Month/week/day views + event sidebar | calendar | CalendarMonthView, CalendarWeekView, CalendarDayView, CalendarEventSidebar, CalendarFilters |
| `Notes.vue` | Note list with rich text editing (Tiptap) | note | RichTextEditor |
| `BrainDump.vue` | AI brain dump with context | — (service direct) | BrainDumpForm, BrainDumpResults, ActionableItems, ContextOptions, SaveNoteModal |
| `Campaigns.vue` | Campaign builder with timeline | campaign, client, project | CampaignCard, CampaignForm, CampaignTimeline |
| `CampaignDetail.vue` | Single campaign detail | campaign | — |
| `CampaignsList.vue` | Campaign list (redirects/alias) | campaign | — |
| `ScopeTemplates.vue` | Scope template list | scope | — |
| `ScopeBuilder.vue` | Scope/template editor with print, unsaved warning | scope, client, project | ScopePreview, ScopeDeliverableRow, ScopeTermsEditor |
| `Invoices.vue` | Invoice list with outstanding totals | invoice, client | InvoiceStatusBadge |
| `InvoiceBuilder.vue` | Invoice builder with line items, print, unsaved warning | invoice, client, scope | InvoiceLineItemRow, InvoiceSummary, InvoicePreview |
| `Resources.vue` | Resource/link library | resource | ResourceDialog |
| `Settings.vue` | Team settings: API keys, webhooks, audit log | auth | ApiKeyManager, WebhookManager, AuditLogViewer |
| `Team.vue` | Team members + invites | auth, team | — |
| `Profile.vue` | User profile editing | auth | — |

### Auth (AuthLayout)
| File | Purpose |
|------|---------|
| `Login.vue` | Email/password login |
| `Register.vue` | Create account + team |
| `ForgotPassword.vue` | Request password reset |
| `ResetPassword.vue` | Set new password via token |
| `VerifyEmail.vue` | Email verification |
| `AcceptInvite.vue` | Client invitation acceptance (no auth) |

### Client Portal (ClientLayout)
| File | Purpose |
|------|---------|
| `PortalDashboard.vue` | Client overview: projects, onboarding, invoices |
| `PortalProject.vue` | Client project view (restricted) |
| `PortalOnboarding.vue` | Onboarding steps completion |

### Other
| File | Purpose |
|------|---------|
| `Home.vue` | Landing page, redirects to /dashboard if authenticated |
| `NotFound.vue` | 404 page |

## Stores (11)

| File | State Shape | Key Actions | Dependencies |
|------|-------------|-------------|--------------|
| `auth.ts` | user, token, userTeams, currentTeam, isLoading | login, logout, register, switchTeam, initAuth | sessionStorage |
| `task.ts` | tasks[], isLoading, error | fetchTasks, createTask, updateTask, deleteTask | taskService |
| `project.ts` | projects[], isLoading | fetchProjects, createProject, updateProject, deleteProject | projectService |
| `client.ts` | clients[], loading, error | fetchClients, createClient, updateClient, deleteClient | clientService |
| `invoice.ts` | invoices[], isLoading | fetchInvoices, createInvoice, createFromScope, updateInvoice | invoiceService |
| `scope.ts` | templates[], scopes[], isLoading | fetchTemplates, fetchScopes, createScope, validateStatusTransition | scopeService, invoiceStore |
| `calendar.ts` | events[], isLoading | fetchEvents, createEvent, updateEvent, deleteEvent | calendarService |
| `note.ts` | notes[], isLoading | fetchNotes, createNote, updateNote, deleteNote | noteService |
| `resource.ts` | resources[], isLoading | fetchResources, createResource, updateResource, deleteResource | resourceService |
| `onboarding.ts` | checklists[], isLoading | fetchChecklists, createChecklist, updateStep, completeStep | onboardingService |
| `notification.js` | notifications[], unreadCount, lastPolledAt | fetchNotifications, markAsRead, startPolling(60s) | notificationService |

## Services (20)

| File | Endpoints Called | Key Methods |
|------|-----------------|-------------|
| `api.service.ts` | — (base wrapper) | get, post, put, delete + auth interceptor + 401 handler + retry |
| `client.service.ts` | /clients | CRUD + contacts (add/update/delete) + getClientProjects |
| `task.service.ts` | /tasks | CRUD + getTasks(filter) + comments |
| `project.service.ts` | /projects, /project-detail | CRUD |
| `campaign.service.ts` | /campaigns | CRUD |
| `calendar.service.ts` | /calendar-events | CRUD + getTaskDeadlines + recurrence helpers |
| `note.service.ts` | /notes | CRUD |
| `resource.service.ts` | /resources | CRUD |
| `scope.service.ts` | /scope-templates, /scopes | Templates CRUD + Scopes CRUD + createFromTemplate |
| `invoice.service.ts` | /invoices | CRUD + createFromScope + auto-number |
| `onboarding.service.ts` | /onboarding | Checklists CRUD + step completion |
| `brain-dump.service.ts` | /braindumps, /brain-dump-context, /brain-dump-create-items | submitBrainDump, getContext, createItems |
| `user.service.ts` | /user-profile | getProfile, updateProfile, changePassword |
| `comment.service.js` | /comments | CRUD |
| `notification.service.js` | /notifications | list, markAsRead, delete |
| `apiKey.service.ts` | /api-keys | CRUD + rotateKey |
| `auditLog.service.js` | /audit-logs | getLogs |
| `webhook.service.js` | /webhooks | CRUD + testWebhook |
| `team.service.ts` | /teams | CRUD + inviteMember + updateMember + removeMember |
| `settings.service.ts` | — | getSettings, updateSettings |

## Composables (6)

| File | Provides | Used By |
|------|----------|---------|
| `useModalState.ts` | isOpen, editingItem, formData, open(), close() | TaskForm, CampaignForm, and modal-based CRUD |
| `useConfirmDialog.ts` | isOpen, item, requestConfirm(), confirm(), cancel() | All delete confirmations |
| `useKeyboardShortcuts.ts` | showHelp, shortcuts[] | DefaultLayout (g-chords, c, ?, Esc) |
| `useResponsive.ts` | isMobile, isTablet, isDesktop | Sidebar, Modal, DataTable |
| `useTooltips.ts` | activeTooltip, shouldShow(), dismiss() | Dashboard onboarding |
| `useEntityLookup.ts` | getClientName(), getProjectName(), getClientColorId() | TaskList, TaskKanban, Invoices, Campaigns |

## Types (4 files)

| File | Exports |
|------|---------|
| `models.ts` | 30+ interfaces: User, Team, Client, Project, Task, Campaign, Note, CalendarEvent, Scope, Invoice, etc. |
| `api.ts` | 30 request/response types: *CreateRequest, *UpdateRequest, *Filter, AuthResponse, PaginatedResponse<T> |
| `enums.ts` | 12 enum constants: TaskStatus, TaskPriority, ProjectStatus, CampaignStatus, TeamRole, etc. |
| `index.ts` | Re-exports all |

## Constants & Utils

| File | Exports |
|------|---------|
| `constants/clientColors.ts` | CLIENT_COLORS (10 colors), getNextClientColor(), getClientColor() |
| `utils/formatters.ts` | getInitials(), formatCurrency() |
| `utils/dateFormatter.ts` | Date/time formatting helpers |
| `utils/statusColors.ts` | Status → CSS class maps (task, project, invoice) |

## Backend Functions (33)

| Function | Methods | Auth | Collections | Key Operations |
|----------|---------|------|-------------|----------------|
| `auth-login.js` | POST | None | users | bcrypt compare, JWT generation |
| `auth-register.js` | POST | None | users, teams, emailVerifications | Create user+team, email token |
| `auth-logout.js` | POST | JWT | tokenBlocklist | Revoke jti |
| `auth-change-password.js` | POST | JWT | users | Verify current, hash new |
| `auth-forgot-password.js` | POST | None | passwordResets | Generate reset token |
| `auth-reset-password.js` | POST | None | passwordResets, users | Validate prefix+token, update |
| `auth-verify-email.js` | GET/POST | None | emailVerifications | Verify+hard delete token |
| `auth-switch-team.js` | POST | JWT | teams, tokenBlocklist | Revoke old, gen new JWT |
| `user-profile.js` | GET/PUT | JWT | users | Profile CRUD (no password) |
| `teams.js` | GET/POST/PUT/DELETE | JWT | teams + 14 cascade | Full team mgmt + cascade delete |
| `clients.js` | GET/POST/PUT/DELETE | JWT | clients | CRUD + contacts + auto-color |
| `projects.js` | GET/POST/PUT/DELETE | JWT | projects, calendarEvents | CRUD + calendar sync |
| `project-detail.js` | GET/PUT/DELETE | JWT | projects, tasks, calendarEvents | Single project + cascade |
| `tasks.js` | GET/POST/PUT/DELETE | JWT | tasks, calendarEvents | CRUD + checklist + calendar sync |
| `notes.js` | GET/POST/PUT/DELETE | JWT | notes | CRUD + tag/link filters |
| `comments.js` | GET/POST/PUT/DELETE | JWT | comments, users | CRUD by resourceType/Id |
| `notifications.js` | GET/PUT/DELETE | JWT | notifications | List/read/hard-delete |
| `campaigns.js` | GET/POST/PUT/DELETE | JWT | campaigns | CRUD + steps array |
| `calendar-events.js` | GET/POST/PUT/DELETE | JWT | calendarEvents | CRUD + recurrence expansion |
| `scopes.js` | GET/POST/PUT/DELETE | JWT | scopes | CRUD + deliverables + status workflow |
| `invoices.js` | GET/POST/PUT/DELETE | JWT | invoices | CRUD + auto-numbering |
| `api-keys.js` | GET/POST/DELETE | JWT | apiKeys | Hash+prefix, scope validation |
| `webhooks.js` | GET/POST/PUT/DELETE | JWT | webhooks | CRUD + secret masking |
| `search.js` | GET | JWT | 5 collections | Text search, 100 char limit |
| `audit-logs.js` | GET | JWT (owner/admin) | auditLogs | Read-only + filters |
| `braindumps.js` | Various | JWT | braindumps | Brain dump CRUD |
| `brain-dump-context.js` | GET | JWT | multiple | Fetch context for AI |
| `brain-dump-create-items.js` | POST | JWT | multiple | AI item generation |
| `resources.js` | Various | JWT | resources | Resource library CRUD |
| `client-invitations.js` | GET/POST/PUT/DELETE | JWT/None | clientInvitations | Invite+accept flow |
| `onboarding.js` | Various | JWT | onboarding | Checklist CRUD |
| `scope-templates.js` | Various | JWT | scopeTemplates | Template CRUD |

## Backend Utilities (13)

| File | Exports | Used By |
|------|---------|---------|
| `utils/db.js` | connectToDatabase(), getDb() | All functions |
| `utils/authHandler.js` | authenticate(), requireRole(), authenticateWithJwt(), authenticateWithApiKey() | All authenticated functions |
| `utils/response.js` | createResponse(), createErrorResponse(), getCorsHeaders() | All functions |
| `utils/pagination.js` | getPaginationParams(), createPaginatedResponse() | All list endpoints |
| `utils/softDelete.js` | softDelete(), restoreDocument(), notDeleted | All CRUD functions |
| `utils/auditLog.js` | createAuditLog() | CRUD functions |
| `utils/rateLimiter.js` | rateLimit() with categories (auth/general/ai) | Auth + CRUD functions |
| `utils/errorHandler.js` | withErrorHandling(), safeErrorDetails() | Some functions |
| `utils/indexManager.js` | ensureIndexes() | db.js (cold start) |
| `utils/validateEnv.js` | validateEnv() | All functions (imported) |
| `utils/webhookDispatcher.js` | dispatchWebhooks() | NOT YET INTEGRATED |
| `utils/calendarSync.js` | syncProjectWithCalendar(), syncTaskWithCalendar() | projects.js, tasks.js |
| `utils/schemas.js` | Zod schemas for validation | CRUD functions |

## CSS & Assets

| File | Purpose |
|------|---------|
| `src/assets/main.css` | Design tokens (CSS vars), base styles, utility classes (200+ lines) |
| `public/logo-placeholder.png` | Sidebar logo |
