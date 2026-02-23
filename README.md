# LaunchCue

LaunchCue is a comprehensive platform for developer relations teams to manage clients, projects, tasks, and campaigns effectively.

## Features

- **Team Management**: Create and manage multiple teams for your organization
- **Client Management**: Organize client information and projects
- **Project Tracking**: Track project details, progress, and deadlines
- **Task Management**: Manage tasks with customizable statuses and priorities
- **Calendar**: Schedule events and view project deadlines
- **Brain Dump**: Use AI (Claude) to process and organize your thoughts and meeting notes
- **Resources**: Store and categorize important resources for your team
- **Notes**: Create, edit, and organize markdown notes

## Live Demo

Access the live application at [https://launchcue.netlify.app/](https://launchcue.netlify.app/)

## Screenshots and Features

### Dashboard
![Dashboard](screenshots/dashboard.png)

The Dashboard provides a comprehensive overview of your projects, tasks, and upcoming events. It's designed to give you a quick snapshot of your most important work items and priorities at a glance.

### Brain Dump - AI-Powered Note Processing
![Brain Dump](screenshots/braindump.png)

The Brain Dump feature leverages Claude AI to help you process unstructured notes and meeting information. Simply paste your notes, and Claude will help organize them.

#### Generate Actionable Items
![Generate Actionable Items](screenshots/generate-actionable-items.png)

Convert your notes into structured, actionable tasks with AI assistance. This feature extracts key action items from your notes and turns them into trackable tasks.

#### Summarize Content
![Summarize Content](screenshots/summarize.png)

Get concise summaries of lengthy notes or meeting transcripts to quickly capture the essential points.

#### Meeting Recap
![Meeting Recap](screenshots/recap.png)

Create structured meeting recaps from your notes, including key decisions, action items, and discussion points.

### Tasks Management
![Tasks](screenshots/tasks.png)

The Tasks view gives you a comprehensive list of all tasks across projects. Filter, sort, and manage your team's workload effectively.

#### Project Tasks
![Tasks on Project](screenshots/tasks-on-project.png)

View and manage tasks specifically assigned to individual projects, helping you track progress on project-specific deliverables.

#### Task Checklists
![Checklist](screenshots/checklist.png)

Break down complex tasks into manageable checklist items, making it easier to track progress on multi-step tasks.

### Client Management
![Clients List](screenshots/clients.png)

Manage all your clients in one place with a clean, organized interface. See key information at a glance and access client details easily.

#### Client Details
![Client Detail](screenshots/client.png)

Access comprehensive client information, including contacts, projects, and communication history all in one view.

### Project Resources
![Resources](screenshots/resources.png)

Store and organize important resources related to your projects, such as documents, links, and reference materials. Categorize resources for easy retrieval.

### Team Management
![Team Management](screenshots/team%20management.png)

Manage team members, permissions, and roles to ensure everyone has the right level of access to relevant projects and information.

### Campaign Management
![Campaign](screenshots/campaign.png)

Plan and execute marketing campaigns with structured workflows. Track campaign progress and measure results.

### Calendar
![Calendar](screenshots/calendar.png)

View all your project deadlines, meetings, and important dates in a unified calendar view. Schedule new events and manage your team's time effectively.

### Notes
![Notes](screenshots/notes.png)

Create, organize, and share rich markdown notes related to your projects, clients, or general information. Tag notes for easy filtering and retrieval.

### User Profile
![Profile](screenshots/profile.png)

Manage your user profile, preferences, and personal settings to customize your LaunchCue experience.

### API Keys and Settings
![Settings API Keys](screenshots/settings-api-keys.png)

Generate and manage API keys for external integrations. Configure system-wide settings to customize LaunchCue for your team's needs.

## Tech Stack

- Vue 3 with Composition API
- Vite for development and building
- Tailwind CSS for styling
- MongoDB for data storage
- Netlify Functions for serverless backend API
- Vue Router for navigation
- Pinia for state management
- JWT for authentication
- Anthropic Claude API for AI processing

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm or yarn
- MongoDB Atlas account
- Anthropic API key for Claude integration
- Netlify CLI for local development

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/launchcue.git
   cd launchcue
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_at_least_64_characters
   ANTHROPIC_API_KEY=your_claude_api_key
   ALLOWED_ORIGINS=https://your-site.netlify.app
   ```

4. Run the development server with Netlify Functions:
   ```
   npm run dev
   ```

5. Build for production:
   ```
   npm run build
   ```

6. Deploy to Netlify:
   ```
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
├── docs/                    # Documentation (architecture, deployment, API, etc.)
├── netlify/
│   └── functions/           # Serverless backend (flat file structure)
│       ├── utils/           # Shared utilities (db, auth, rateLimit, etc.)
│       ├── tasks.js, clients.js, projects.js, ...  # CRUD endpoints
│       ├── auth-login.js, auth-register.js, ...     # Auth endpoints
│       └── ai-process.js, search.js, ...            # Feature endpoints
├── src/
│   ├── assets/              # CSS (main.css with Tailwind)
│   ├── components/          # Reusable Vue components
│   │   ├── ui/              # UI primitives (Badge, Card, DataTable, etc.)
│   │   ├── dashboard/       # Dashboard widgets
│   │   └── tasks/           # Task-specific (TaskForm, TaskList, TaskKanban)
│   ├── layouts/             # Page layouts (DefaultLayout)
│   ├── pages/               # Route-level page components
│   ├── router/index.ts      # Vue Router configuration
│   ├── services/*.ts        # API service layer
│   ├── stores/*.ts          # Pinia stores
│   ├── types/               # TypeScript type definitions
│   ├── App.vue              # Root component
│   └── main.ts              # Entry point
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── netlify.toml             # Netlify configuration
└── tailwind.config.js       # Tailwind CSS configuration
```

## Documentation

For detailed documentation, see the [docs/](docs/) folder:

- **[Architecture](docs/architecture.md)** — System design, data flow, and key decisions
- **[Deployment](docs/deployment.md)** — Production deployment guide for Netlify + MongoDB Atlas
- **[API Reference](docs/api-reference.md)** — Complete endpoint documentation
- **[Database](docs/database.md)** — Schema documentation and relationships
- **[Security](docs/security.md)** — Auth flows, RBAC, rate limiting, security headers
- **[Development](docs/development.md)** — Developer setup, conventions, and checklists

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB](https://www.mongodb.com/)
- [Netlify Functions](https://www.netlify.com/products/functions/)
- [Anthropic Claude](https://www.anthropic.com/)
