# LaunchCue

[![Netlify Status](https://api.netlify.com/api/v1/badges/placeholder/deploy-status)](https://launchcue.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-E8503A.svg)](LICENSE)

**The command center for freelance & agency DevRel.** LaunchCue is a full-stack platform purpose-built for developer relations practitioners who juggle clients, projects, campaigns, content, and invoices — all in one place.

## Why LaunchCue?

Most project management tools are built for generic software teams. DevRel practitioners — especially freelancers and small agencies — need something that understands their workflow: client relationships, campaign tracking, scope management, invoicing, and AI-powered brain dumps for processing meeting notes into action items.

| | LaunchCue | Generic PM Tools | Spreadsheets |
|---|---|---|---|
| Client + Project hierarchy | Built-in | Workarounds | Manual |
| Scope & deliverables builder | Built-in | No | Manual |
| Invoice generation | Built-in | Add-on | Manual |
| AI brain dump processing | Claude-powered | No | No |
| Campaign tracking | Built-in | No | Manual |
| Keyboard-first workflow | `Cmd+K`, shortcuts | Varies | No |
| Self-hosted / own your data | Yes | No | Partial |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourusername/launchcue.git
cd launchcue && npm install

# 2. Configure environment
cp .env.example .env   # Then fill in your MongoDB URI, JWT secret, and Anthropic API key

# 3. Run locally with Netlify Functions
npm run dev
```

**First steps after registering:**
1. Create your team (Settings → Team)
2. Add your first client
3. Create a project under that client
4. Add tasks to the project
5. Try Brain Dump — paste meeting notes and let Claude AI extract action items

## Features

### Core Workflow
- **Client Management** — Organize client info, contacts, and project history. Client health dashboard shows overdue/blocked status at a glance.
- **Project Tracking** — Track deliverables, deadlines, and progress per client. Status workflow from planning through completion.
- **Task Management** — Kanban board and list views. Assign tasks, set priorities, track with checklists. Keyboard shortcut `C` to create from anywhere.
- **Calendar** — Unified view of deadlines, meetings, and events. Recurring event support.

### DevRel-Specific
- **Campaign Management** — Plan and track developer campaigns with structured workflows and metrics.
- **Scope & Deliverables Builder** — Template-based scope documents. Draft → Sent → Approved workflow. Import scopes directly into invoices.
- **Invoice Builder** — Auto-incrementing invoice numbers, scope import, client billing. Outstanding invoice dashboard widget.
- **Brain Dump** — Paste unstructured meeting notes, and Claude AI extracts summaries, action items, and meeting recaps.
- **Resources** — Categorized link/document library for reference materials.
- **Notes** — Rich text notes with Tiptap editor, tagging, and organization.

### Platform
- **Global Search** — `Cmd+K` to search across everything. Type `>` for command palette (navigate, create, toggle dark mode).
- **Keyboard Shortcuts** — `G → D` dashboard, `G → T` tasks, `G → P` projects, `?` for help overlay.
- **Dark Mode** — Full dark theme with warm ink/charcoal palette.
- **Team Collaboration** — RBAC (owner/admin/member/viewer), team invitations, activity feed.
- **Client Portal** — Read-only portal for clients to view project status and onboarding.
- **Notifications** — In-app notification system for team activity.
- **Getting Started Checklist** — Guided onboarding for new users.

## Screenshots

### Dashboard
![Dashboard](screenshots/dashboard.png)

Command center with stats grid, recent tasks, activity feed, upcoming items, client health, and outstanding invoices.

### Brain Dump — AI-Powered Processing
![Brain Dump](screenshots/braindump.png)

Paste meeting notes → Claude AI extracts action items, summaries, and structured recaps.

### Tasks
![Tasks](screenshots/tasks.png)

List and Kanban views with inline status badges, priority indicators, and assignees.

### Clients
![Clients](screenshots/clients.png)

Client cards with project counts, health indicators, and quick navigation.

### Calendar
![Calendar](screenshots/calendar.png)

Month/week/day views with project deadlines and recurring events.

### Campaign Management
![Campaign](screenshots/campaign.png)

Structured campaign planning with status tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API) + TypeScript |
| Styling | Tailwind CSS — print-first brutalist design system |
| Build | Vite |
| State | Pinia |
| Routing | Vue Router |
| Backend | Netlify Functions (serverless) |
| Database | MongoDB Atlas |
| Auth | JWT (session-based) + RBAC |
| AI | Anthropic Claude API |
| Rich Text | Tiptap |
| Charts | Chart.js + vue-chartjs |

## Design System

LaunchCue uses a **print-first brutalist** design language:

- `border-radius: 0` on all elements — cards, buttons, inputs, badges
- `border: 2px solid` as the structural backbone
- Hard offset shadows (no blur) — elements feel physical
- **Space Grotesk** for headings, **Inter** for body, **JetBrains Mono** for data
- ALL-CAPS overline labels for section headers and metadata
- Coral (`#E8503A`) + chartreuse (`#C8E840`) accent pair on warm parchment (`#FAF8F5`)
- Dark mode: warm ink (`#141210`) base with chalk borders

## Getting Started (Development)

### Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas account
- Anthropic API key (for Brain Dump)
- Netlify CLI (`npm i -g netlify-cli`)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/launchcue.git
   cd launchcue
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_at_least_64_characters
   ANTHROPIC_API_KEY=your_claude_api_key
   ALLOWED_ORIGINS=https://your-site.netlify.app
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Deploy to Netlify:
   ```bash
   netlify deploy --prod
   ```

### Setting up MongoDB

1. Create a MongoDB Atlas cluster
2. Create a database called `launchcue`
3. Configure network access and database users
4. Add your connection string to the `.env` file

## Project Structure

```
launchcue/
├── netlify/functions/        # Serverless backend (33 endpoints)
│   ├── utils/                # Shared: db, auth, rateLimit, validation
│   ├── auth-*.js             # Auth endpoints (login, register, reset, verify)
│   ├── tasks.js, clients.js  # CRUD endpoints
│   ├── invoices.js            # Invoice management
│   ├── scopes.js              # Scope builder
│   └── ai-process.js          # Claude AI integration
├── src/
│   ├── assets/main.css       # Design system (CSS custom properties + Tailwind)
│   ├── components/
│   │   ├── ui/               # Primitives (Card, Badge, DataTable, Modal, Form*)
│   │   ├── dashboard/        # Dashboard widgets (StatsGrid, ActivityFeed, etc.)
│   │   ├── tasks/            # TaskForm, TaskList, TaskKanban
│   │   ├── scope/            # Scope builder components
│   │   └── invoice/          # Invoice builder components
│   ├── composables/          # useKeyboardShortcuts, useModalState, useTooltips, etc.
│   ├── layouts/              # DefaultLayout (sidebar + header + shortcuts)
│   ├── pages/                # Route-level components (33 pages)
│   ├── services/*.ts         # API service layer
│   ├── stores/*.ts           # Pinia stores
│   └── types/                # TypeScript definitions
├── tailwind.config.js        # Brutalist design tokens
├── vite.config.ts            # Vite configuration
└── netlify.toml              # Netlify deployment config
```

## Documentation

See the [docs/](docs/) folder for detailed guides:

- **[Architecture](docs/architecture.md)** — System design, data flow, key decisions
- **[Deployment](docs/deployment.md)** — Production deployment (Netlify + MongoDB Atlas)
- **[API Reference](docs/api-reference.md)** — Complete endpoint documentation
- **[Database](docs/database.md)** — Schema documentation and relationships
- **[Security](docs/security.md)** — Auth flows, RBAC, rate limiting
- **[Development](docs/development.md)** — Developer setup and conventions

## License

MIT — see [LICENSE](LICENSE) for details.

## Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB](https://www.mongodb.com/)
- [Netlify](https://www.netlify.com/)
- [Anthropic Claude](https://www.anthropic.com/)
- [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- [Tiptap](https://tiptap.dev/)
- [Chart.js](https://www.chartjs.org/)
