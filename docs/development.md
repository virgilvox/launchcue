# LaunchCue -- Developer Guide

## 1. Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB instance (local or Atlas)
- Netlify CLI (included as a dev dependency)

### Setup

```bash
git clone <repo-url> launchcue
cd launchcue
npm install
```

Create a `.env` file in the project root with the following variables:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<database>
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
```

### Running the app

**Frontend only** (Vite dev server, no serverless functions):

```bash
npm run dev
```

**Full stack** (Vite + Netlify Functions):

```bash
npx netlify dev
```

The Vite dev server runs on `http://localhost:5173` by default. When using `netlify dev`, the proxy typically runs on `http://localhost:8888`.

---

## 2. Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Start the Vite development server (frontend only) |
| `npm run build` | `vite build` | Build for production (outputs to `dist/`) |
| `npm run preview` | `vite preview` | Preview the production build locally |
| `npm run dev:netlify` | `netlify dev` | Start full-stack dev server (Vite + Netlify Functions) |
| `npm run type-check` | `vue-tsc --noEmit` | Run TypeScript type checking without emitting files |
| `npm run test` | `vitest run` | Run tests once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |

---

## 3. Project Structure

```
launchcue/
├── docs/                    # Documentation
├── netlify/
│   └── functions/           # Serverless backend (flat files, not nested)
│       ├── utils/           # Shared utilities (db, auth, rateLimit, etc.)
│       ├── tasks.js         # Task CRUD
│       ├── projects.js      # Project CRUD
│       ├── clients.js       # Client CRUD
│       ├── campaigns.js     # Campaign CRUD
│       ├── notes.js         # Notes CRUD
│       ├── resources.js     # Resources CRUD
│       ├── calendar-events.js
│       ├── braindumps.js
│       ├── comments.js
│       ├── notifications.js
│       ├── webhooks.js
│       ├── audit-logs.js
│       ├── search.js
│       ├── ai-process.js
│       ├── auth-login.js
│       ├── auth-register.js
│       ├── auth-logout.js
│       ├── auth-switch-team.js
│       ├── auth-change-password.js
│       ├── auth-forgot-password.js
│       ├── auth-reset-password.js
│       ├── auth-verify-email.js
│       ├── api-keys.js
│       └── teams.js
├── src/
│   ├── assets/              # CSS (main.css with Tailwind)
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (Badge, Card, DataTable, etc.)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── tasks/           # Task-specific components (TaskForm, TaskList, TaskKanban, TaskFilters)
│   │   ├── brain-dump/      # BrainDumpForm
│   │   ├── settings/        # ApiKeyManager, AuditLogViewer, WebhookManager
│   │   ├── resource/        # ResourceDialog
│   │   ├── GlobalSearch.vue
│   │   └── Modal.vue
│   ├── layouts/             # DefaultLayout.vue
│   ├── pages/               # Route-level page components
│   │   └── auth/            # Login, ForgotPassword, ResetPassword, VerifyEmail
│   ├── router/index.ts      # Vue Router config
│   ├── services/*.ts        # API service layer (13 TS + 4 JS)
│   ├── stores/*.ts          # Pinia stores (7 TS + 1 JS)
│   ├── types/               # TypeScript types (models, api, enums, index)
│   ├── utils/               # Utility functions
│   ├── App.vue
│   └── main.ts
├── index.html
├── netlify.toml
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Coding Conventions

### Vue Components

- Use Composition API with `<script setup>` (or `<script setup lang="ts">` for typed components).
- Define props with `defineProps` and emits with `defineEmits`.
- Keep template logic minimal; move complex expressions into computed properties or composables.

### Validation

- All backend endpoint input is validated with **Zod schemas** before processing.
- Define schemas at the top of each function file and call `.parse()` or `.safeParse()` on the incoming body.

### Soft Delete

- Deletions set a `deletedAt` timestamp on the document instead of removing it.
- All queries must filter out soft-deleted records (e.g., `{ deletedAt: null }`).

### Service Pattern

- Each resource has a dedicated service file in `src/services/` that wraps `apiService` CRUD methods.
- Services export plain functions (not classes) like `getTasks()`, `createTask(data)`, etc.
- The base `apiService` in `src/services/api.service.ts` handles Axios configuration, auth headers, and error normalization.

### Store Pattern

- Pinia stores use the **Composition API style** (setup function), not the Options API style.
- Stores call service functions and manage reactive state with `ref` / `computed`.

### Error Handling (Backend)

- Wrap endpoint handlers with the `withErrorHandling` utility for automatic OPTIONS handling, authentication, try/catch, and error response formatting.
- Alternatively, handle manually with `try/catch` and return responses via `createErrorResponse`.
- In production, error messages are sanitized to avoid leaking internal details.

### Styling

- **Tailwind CSS** with the `@tailwindcss/forms` and `@tailwindcss/typography` plugins.
- Primary color palette: **Indigo** (unified between `tailwind.config.js` and CSS custom properties).
- Dark mode: class-based (`darkMode: 'class'` in Tailwind config). Toggle the `dark` class on `<html>`.

---

## 5. TypeScript Patterns

### Configuration

The TypeScript configuration (`tsconfig.json`) uses these key settings:

- **`strict: true`** -- full strict mode is enabled.
- **`allowJs: true`** -- permits `.js` files to coexist alongside `.ts` during the incremental migration.
- **`moduleResolution: "bundler"`** -- uses Vite's bundler-based module resolution.
- **`target: "ES2020"`** -- targets modern JavaScript.
- **`paths: { "@/*": ["./src/*"] }`** -- enables `@/` as an alias for `src/`.

### Type Definitions

All shared types live in `src/types/`:

| File | Contents |
|---|---|
| `models.ts` | Data model interfaces (`Task`, `Client`, `Project`, `Campaign`, etc.) |
| `api.ts` | API request/response types |
| `enums.ts` | Shared enums (status values, roles, priorities) |
| `index.ts` | Barrel re-export |

Import types from `@/types` in component and service files:

```typescript
import type { Task, Client } from '@/types'
```

### Migration Status

The codebase is in an incremental TypeScript migration:

- **Migrated:** 13 service files, 7 stores, router, Vite config, entry point (`main.ts`)
- **Remaining .js:** 4 service files and 1 store created during feature work
- **Vue components:** Not yet converted to `<script setup lang="ts">` (67 files)
- **Backend:** Stays as CommonJS `.js` (Netlify Functions runtime)

---

## 6. Adding a New Endpoint -- Checklist

1. **Create the function file** at `netlify/functions/your-endpoint.js`.

2. **Use `withErrorHandling`** to wrap your handler. This provides automatic CORS/OPTIONS handling, JWT authentication, try/catch, and structured error responses:

   ```javascript
   const { withErrorHandling } = require('./utils/authHandler');

   exports.handler = withErrorHandling(async (event, context, user) => {
     // user is the authenticated user from the JWT
     // your logic here
   }, { rateLimit: 'general' });
   ```

3. **Add a Zod schema** for input validation:

   ```javascript
   const { z } = require('zod');

   const createSchema = z.object({
     name: z.string().min(1).max(200),
     description: z.string().optional(),
   });

   // Inside handler:
   const data = createSchema.parse(JSON.parse(event.body));
   ```

4. **Add audit logging** for mutations (create, update, delete):

   ```javascript
   const { logAuditEvent } = require('./utils/auditLog');

   await logAuditEvent(db, {
     userId: user.userId,
     teamId: user.teamId,
     action: 'create',
     resourceType: 'your-resource',
     resourceId: result.insertedId.toString(),
   });
   ```

5. **Rate limiting** is configured via the `withErrorHandling` options: `{ rateLimit: 'general' }` or `{ rateLimit: 'auth' }`.

6. **Sanitize error messages** -- the `withErrorHandling` wrapper handles this automatically. If writing manual error responses, avoid exposing stack traces or internal error details in production.

7. **Add the corresponding frontend service** in `src/services/` (see section 7 below).

---

## 7. Adding a New Page/Component -- Checklist

1. **Create the page component** in `src/pages/YourPage.vue`:

   ```vue
   <script setup>
   import { ref, onMounted } from 'vue'
   // imports...
   </script>

   <template>
     <div>
       <!-- page content -->
     </div>
   </template>
   ```

2. **Add the route** in `src/router/index.ts`:

   ```typescript
   {
     path: '/your-page',
     name: 'YourPage',
     component: () => import('@/pages/YourPage.vue'),
     meta: { requiresAuth: true }
   }
   ```

3. **Create a service file** in `src/services/` if the page needs a new API endpoint:

   ```typescript
   import apiService from './api.service'

   export function getItems() {
     return apiService.get('/your-endpoint')
   }

   export function createItem(data: Record<string, unknown>) {
     return apiService.post('/your-endpoint', data)
   }
   ```

4. **Create a Pinia store** if the page manages shared or complex state:

   ```typescript
   import { defineStore } from 'pinia'
   import { ref, computed } from 'vue'
   import { getItems } from '@/services/yourItem.service'

   export const useYourItemStore = defineStore('yourItem', () => {
     const items = ref([])
     const loading = ref(false)

     async function fetchItems() {
       loading.value = true
       try {
         const response = await getItems()
         items.value = response.data
       } finally {
         loading.value = false
       }
     }

     return { items, loading, fetchItems }
   })
   ```

5. **Add type definitions** in `src/types/models.ts` for any new data models:

   ```typescript
   export interface YourItem {
     _id: string
     name: string
     teamId: string
     createdAt: string
     updatedAt: string
     deletedAt: string | null
   }
   ```

6. **Use UI primitives** from `src/components/ui/` (Badge, Card, DataTable, EmptyState, SkeletonLoader, etc.) for a consistent look and feel.

---

## 8. Key Dependencies

| Package | Purpose |
|---|---|
| `vue` (3.5) | Frontend framework |
| `vue-router` (4.5) | Client-side routing |
| `pinia` (3.0) | State management |
| `axios` (1.9) | HTTP client |
| `tailwindcss` (3.4) | Utility-first CSS |
| `@heroicons/vue` | Icon library |
| `@tiptap/*` | Rich text editor (used in Notes) |
| `chart.js` + `vue-chartjs` | Dashboard analytics charts |
| `date-fns` | Date formatting and manipulation |
| `zod` | Schema validation (backend + can be used frontend) |
| `mongodb` (6.16) | MongoDB driver (backend) |
| `jsonwebtoken` | JWT auth (backend) |
| `bcryptjs` | Password hashing (backend) |
| `@anthropic-ai/sdk` | AI processing via Claude API (backend) |
| `dompurify` | HTML sanitization |
| `marked` | Markdown rendering |
| `@vueuse/core` | Vue composable utilities |
| `vitest` | Test runner |
| `happy-dom` | DOM environment for tests |
| `vue-tsc` | Vue TypeScript type checking |

---

## 9. Testing

Tests are run with **Vitest** using **happy-dom** as the DOM environment.

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

Test files live in the `tests/` directory and follow the naming pattern `*.test.{js,ts}`. The Vitest config is defined inline in `vite.config.ts` under the `test` key:

```typescript
test: {
  environment: 'happy-dom',
  globals: true,
  include: ['tests/**/*.test.{js,ts}'],
}
```

---

## 10. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWTs |
| `ANTHROPIC_API_KEY` | Yes | API key for Claude AI processing |

These are read by the Netlify Functions at runtime. For local development, place them in a `.env` file at the project root. The `.env` file is gitignored and must never be committed.
