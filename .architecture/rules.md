# AI Coding Rules & Self-Prompting Guidelines

> These rules keep the AI aligned, cautious, and productive across sessions.
> MUST be loaded into context before any implementation work.

## Core Principles

### 1. Understand Before Changing
- ALWAYS read a file before editing it
- ALWAYS trace the full call chain (component → store → service → API → backend) before modifying any layer
- NEVER assume a function is unused without grep-verifying across the entire codebase
- When deleting code, verify zero references first

### 2. One Layer at a Time
- When migrating (e.g., Netlify → Convex), work one layer at a time: backend first, then services, then stores, then components
- NEVER change multiple layers simultaneously for the same feature — creates untestable states
- After each layer change, verify the app still builds

### 3. Track Everything
- Before starting work, update the relevant `.architecture/` document
- After completing a migration step, update `MEMORY.md` with what changed
- Use git commits at each meaningful checkpoint (not after every file)
- Keep a running "what's left" list in the plan file

### 4. Preserve Behavior
- Every migration step should be behavior-preserving (same inputs → same outputs)
- Test the feature end-to-end after each step
- If a feature breaks during migration, fix it before moving on

### 5. Security First
- Never store secrets in code or config files committed to git
- Validate all user input at system boundaries
- Use parameterized queries, never string interpolation for DB queries
- Auth checks on every endpoint, no exceptions
- Soft deletes by default, hard deletes only for ephemeral data

## Migration-Specific Rules

### 6. Backend Migration Checklist (per function)
For each Netlify function being migrated:
- [ ] Map all HTTP methods and their request/response shapes
- [ ] Identify all MongoDB queries and their equivalents in target DB
- [ ] Identify auth requirements (JWT, API key, none)
- [ ] Identify rate limiting category
- [ ] Identify cross-function dependencies (audit log, calendar sync, webhook dispatch)
- [ ] Write the new backend implementation
- [ ] Update the corresponding frontend service
- [ ] Verify the store still works
- [ ] Test the page/component end-to-end
- [ ] Update `.architecture/file-manifest.md`

### 7. Frontend Service Migration Checklist
For each service being updated:
- [ ] Map all methods and their API endpoints
- [ ] Update endpoint URLs/calls to new backend
- [ ] Preserve response shapes (or update types + all consumers)
- [ ] Verify error handling still works (401, 403, 429, 500)
- [ ] Test from the UI

### 8. Store Migration Checklist
For each store:
- [ ] Verify all actions still work with updated services
- [ ] Check computed properties / getters
- [ ] Test loading states
- [ ] Test error states
- [ ] Verify cross-store dependencies (scope → invoice)

## Self-Prompting Guidelines

### Before Starting Any Task
Ask yourself:
1. "What files will this change touch?" — List them explicitly
2. "What could break?" — Identify downstream dependencies
3. "Is there existing code that does something similar?" — Search before writing
4. "What's the simplest way to do this?" — Resist over-engineering
5. "How will I verify this works?" — Define test criteria upfront

### During Implementation
Check at each step:
1. "Does the app still build?" — Run `npm run build` frequently
2. "Did I update all consumers?" — Grep for the old API/function name
3. "Am I drifting from the plan?" — Re-read the plan file
4. "Is this change reversible?" — Prefer additive changes over destructive ones

### After Completing a Task
Verify:
1. "Does the full flow work end-to-end?" — Click through in the UI
2. "Did I update the architecture docs?" — Keep them current
3. "Are there any TODO/FIXME/HACK comments I left?" — Resolve or document them
4. "Did I introduce any new dependencies?" — Justify each one

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Vue component | PascalCase | `TaskList.vue` |
| Page | PascalCase | `Dashboard.vue` |
| Store | `use*Store` in camelCase file | `task.ts` → `useTaskStore` |
| Service | `*.service.ts` | `client.service.ts` |
| Composable | `use*.ts` | `useModalState.ts` |
| Type file | camelCase | `models.ts` |
| Backend function | kebab-case | `auth-login.js` |
| Backend util | camelCase | `authHandler.js` |
| CSS | kebab-case classes | `.heading-page`, `.btn-primary` |

## Design System Rules

- Border radius: ALWAYS 0 (brutalist)
- Border width: ALWAYS 2px
- Colors: ONLY CSS variables (`var(--accent-primary)`), NEVER hardcoded hex/Tailwind colors
- Typography: Space Grotesk for headings, Inter for body, JetBrains Mono for data
- Shadows: Only `brutal-*` shadow utilities (hard offset, no blur)
- Dark mode: Via `.dark` class, all components must support both modes
- Touch targets: Minimum 44px for interactive elements

## Error Handling Rules

- Frontend: `toast.error()` for user-facing errors, NEVER `console.error` or `alert()`
- Backend: `createErrorResponse()` with appropriate status code
- Loading states: ALWAYS show `LoadingSpinner` during async operations
- Empty states: ALWAYS show `EmptyState` component for zero-data views
- 401: Auto-logout with debounce (existing pattern in api.service.ts)
- 403: Display server message via toast
- 429: Retry with exponential backoff (existing pattern)

## Git Rules

- Commit at meaningful checkpoints, not after every file
- Commit message format: `verb noun: brief description` (e.g., `migrate tasks: convert Netlify function to Convex mutation`)
- Never commit secrets, .env files, or credentials
- Never force push to main
- Branch for large migrations: `migrate/convex-backend`, `migrate/digital-ocean`

## Performance Rules

- Lazy-load all page components (existing pattern in router)
- Use `Promise.allSettled` for parallel fetches (existing pattern)
- Cache data in Pinia stores (existing pattern)
- Don't fetch data that's already in the store unless stale
- Debounce search inputs (existing 300ms pattern)
