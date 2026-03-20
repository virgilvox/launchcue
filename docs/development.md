# LaunchCue -- Developer Guide

## 1. Getting Started

### Prerequisites

- Node.js 18+
- npm
- Docker + Docker Compose (for local Supabase)
- Anthropic API key (optional, for AI features)

### Setup

```bash
git clone <repo-url> launchcue
cd launchcue && npm install
cp .env.example .env  # Fill in Supabase URL, keys, etc.
cd server && npm install && cd ..
```

### Running the app

**Frontend only** (Vite dev server):

```bash
npm run dev
```

**Full stack** (Vite + Express API + local Supabase):

```bash
npm run dev:full
```

The Vite dev server runs on `http://localhost:5173`, the Express API on `http://localhost:3001`, and local Supabase on `http://localhost:8000`.

---

## 2. Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `vite` | Vite dev server (port 5173) |
| `npm run dev:server` | `cd server && npm run dev` | Express API (port 3001, tsx watch) |
| `npm run dev:supabase` | `docker compose` | Docker Compose for local Supabase (port 8000) |
| `npm run dev:supabase:down` | `docker compose down` | Stop local Supabase |
| `npm run dev:full` | `concurrently` | All three services concurrently |
| `npm run build` | `vite build` | Production build |
| `npm run type-check` | `vue-tsc --noEmit` | TypeScript checking |
| `npm run test` | `vitest run` | Run tests (441 frontend tests across 33 files) |
| `npm run test:watch` | `vitest` | Watch mode |
| `npm run lint` | `eslint src/ --ext .ts,.vue` | ESLint |
| `npm run format` | `prettier --write src/` | Prettier |

---

## 3. Project Structure

```
launchcue/
├── .do/                     # DigitalOcean App Platform config
├── docs/                    # Documentation
├── infra/                   # Infrastructure scripts (droplet-setup.sh)
├── server/                  # Express API server (AI, webhooks, email)
│   └── src/
│       ├── routes/          # ai.ts, webhooks.ts, email.ts
│       ├── middleware/      # auth.ts (JWT validation via Supabase)
│       ├── supabase.ts      # Server-side Supabase client
│       ├── webhook-processor.ts  # Webhook dispatch logic
│       └── index.ts         # Express entry point
├── src/
│   ├── adapters/            # Repository implementations
│   │   └── supabase/        # 25 Supabase adapter files (19 repos + 3 adapters + base + index + client)
│   ├── core/                # ServiceContainer, EventBus, PluginRegistry
│   ├── modules/             # 15 feature modules (routes, nav, search)
│   ├── stores/              # 18 Pinia stores (all repository pattern)
│   ├── components/          # Vue components
│   ├── composables/         # Reusable composables
│   ├── layouts/             # DefaultLayout, AuthLayout, ClientLayout
│   ├── pages/               # Top-level pages (Home, auth, client-portal)
│   ├── types/               # TypeScript definitions
│   └── main.ts              # App bootstrap + plugin registration
├── tests/                   # Vitest tests (core/, stores/)
├── docker-compose.dev.yml   # Local Supabase stack
└── vite.config.ts           # Vite config (proxy /api → localhost:3001)
```

---

## 4. Architecture Patterns

### DI Container

All data access goes through a symbol-keyed dependency injection container. Repositories are resolved at runtime:

```typescript
import { getContainer } from '@/core/service-container'
import { TASK_REPO } from '@/adapters/repository-keys'

const repo = getContainer().resolve(TASK_REPO)
const tasks = await repo.findAll()
```

### Repository Pattern

Every store accesses data through the `Repository<T, CreateDTO, UpdateDTO>` interface. No store imports Supabase directly. Extended interfaces exist for repositories that need additional methods (e.g., `TeamRepository`, `BrainDumpRepository`, `CommentRepository`, `NotificationRepository`).

### Feature Modules

Each of the 15 feature modules declares routes, nav items, and search providers as data in its `index.ts` file. Modules are registered in `src/main.ts` at boot time.

### Plugin Registry

The plugin registry performs topological dependency sorting so modules boot in the correct order. Each module can declare dependencies on other modules.

---

## 5. Coding Conventions

### Vue Components

- Composition API with `<script setup>`.
- Define props with `defineProps` and emits with `defineEmits`.
- Keep template logic minimal; move complex expressions into computed properties or composables.

### Stores

- Pinia Composition API style (setup function).
- Stores call repositories via DI container -- never import Supabase or API services directly.

### Adapters

- Implement `Repository<T>` interface (or extended variant).
- Registered as lazy singletons in the service container.
- All implementations live in `src/adapters/supabase/`.

### Styling

- **Tailwind CSS** with a brutalist design system.
- Colors: Purple (#7C3AED) primary, Coral (#E8503A) accent, Parchment (#FAF8F5) background.
- Border radius: 0. Border width: 2px. Hard offset shadows.
- Dark mode: class-based (`darkMode: 'class'`), CSS custom properties.
- Typography: Space Grotesk (headings), Inter (body), JetBrains Mono (data).

### Testing

- **Vitest** with **happy-dom** as the DOM environment.
- Tests live in `tests/` with subdirectories `core/` and `stores/`.
- 474 tests across 37 files (441 frontend + 33 server).

---

## 6. TypeScript

### Configuration

- **`strict: true`** -- full strict mode.
- **`allowJs: true`** -- permits `.js` files during incremental migration.
- **`moduleResolution: "bundler"`** -- Vite's bundler-based resolution.
- **`target: "ES2020"`** -- modern JavaScript.
- **`paths: { "@/*": ["./src/*"] }`** -- `@/` alias for `src/`.

### Type Definitions

All shared types live in `src/types/`:

| File | Contents |
|---|---|
| `models.ts` | Data model interfaces (`Task`, `Client`, `Project`, `Campaign`, etc.) |
| `api.ts` | API request/response types |
| `enums.ts` | Shared enums (status values, roles, priorities) |
| `index.ts` | Barrel re-export |

```typescript
import type { Task, Client } from '@/types'
```

---

## 7. Adding a New Feature -- Checklist

1. **Feature module** -- Create in `src/modules/{feature}/` with `index.ts` defining routes, nav items, and search providers.

2. **Supabase adapter** -- Create in `src/adapters/supabase/{feature}.repository.ts` implementing `Repository<T>`.

3. **Repository key** -- Register a new symbol in `src/adapters/repository-keys.ts`.

4. **Pinia store** -- Create in `src/stores/{feature}.ts` using the repository pattern via DI.

5. **Register module** -- Add the module to `src/main.ts`.

6. **Types** -- Add interfaces to `src/types/models.ts`.

7. **Composables** -- Use existing composables (`useModalState`, `useConfirmDialog`, `useResponsive`, `useTooltips`, `useKeyboardShortcuts`, `useEntityLookup`) to reduce boilerplate.

### Detail page pattern

All detail pages (ProjectDetail, ClientDetail, etc.) follow this standard layout:

```vue
<PageContainer>
  <PageHeader :breadcrumbs="..." :backTo="..." :title="...">
    <template #actions>...</template>
  </PageHeader>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2"><!-- Main content --></div>
    <div><!-- Sidebar --></div>
  </div>
</PageContainer>
```

---

## 8. Key Dependencies

| Package | Purpose |
|---|---|
| `vue` (3.5) | Frontend framework |
| `vue-router` (4.5) | Client-side routing |
| `pinia` (3.0) | State management |
| `@supabase/supabase-js` | Supabase client (auth, database, realtime) |
| `tailwindcss` (3.4) | Utility-first CSS |
| `@heroicons/vue` | Icon library |
| `@tiptap/*` | Rich text editor (used in Notes) |
| `chart.js` + `vue-chartjs` | Dashboard analytics charts |
| `date-fns` | Date formatting and manipulation |
| `@anthropic-ai/sdk` | AI processing via Claude API (Express server) |
| `dompurify` | HTML sanitization |
| `marked` | Markdown rendering |
| `@vueuse/core` | Vue composable utilities |
| `concurrently` | Run multiple dev servers |
| `vitest` | Test runner |
| `happy-dom` | DOM environment for tests |
| `vue-tsc` | Vue TypeScript type checking |

---

## 9. Environment Variables

See `.env.example` for the full list. Key variables:

### Frontend (VITE_ prefix, exposed to browser)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `VITE_API_URL` | Yes | Express API base URL (e.g., `/api` -- proxied by Vite in dev) |

### Express Server

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | No | API key for Claude AI features |

These are read at runtime. For local development, place them in a `.env` file at the project root. The `.env` file is gitignored and must never be committed.
