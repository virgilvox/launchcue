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

- Node.js (v16 or later recommended)
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
   ANTHROPIC_API_KEY=your_claude_api_key
   VITE_MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_for_tokens
   VITE_MONGODB_REALM_APPID=your_mongodb_realm_app_id
   VITE_MONGODB_DATABASE=launchcue
   VITE_APP_NAME=LaunchCue
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
├── netlify/
│   └── functions/        # Serverless functions for backend API
│       ├── ai/           # Claude AI integration functions
│       ├── auth/         # Authentication functions
│       ├── tasks/        # Task management functions
│       └── brain-dump/   # Brain dump related functions
├── public/               # Static assets
├── src/
│   ├── assets/           # CSS and other assets
│   ├── components/       # Reusable Vue components
│   ├── layouts/          # Page layouts
│   ├── pages/            # Page components
│   ├── router/           # Vue Router configuration
│   ├── services/         # API services for communicating with backend
│   ├── stores/           # Pinia stores
│   ├── App.vue           # Root component
│   └── main.js           # Entry point
├── .env                  # Environment variables
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── netlify.toml          # Netlify configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Backend Architecture

LaunchCue uses a serverless architecture with Netlify Functions to handle backend logic:

1. **Authentication**: JWT-based auth system with login/register endpoints
2. **Data Access**: MongoDB integration for data storage and retrieval
3. **AI Processing**: Claude API integration for brain dump processing
4. **API Organization**: RESTful API endpoints organized by resource type

All API calls are routed through the `/api/*` path which maps to the Netlify Functions.

## Frontend Architecture

The frontend uses a service-based approach:

1. **API Service**: Central service for handling HTTP requests to the backend
2. **Feature Services**: Domain-specific services that use the API service
3. **Stores**: Pinia stores for state management
4. **Components**: Reusable UI components

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Vue.js](https://vuejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MongoDB](https://www.mongodb.com/)
- [Netlify Functions](https://www.netlify.com/products/functions/)
- [Anthropic Claude](https://www.anthropic.com/)

## API Usage

LaunchCue provides a RESTful API for external integrations. For detailed documentation with all endpoints and examples, see [API-DOCS.md](API-DOCS.md).

### Authentication

API requests can be authenticated in two ways:

1.  **JWT Token (User Session):** For requests made from the LaunchCue frontend application after a user logs in. Handled automatically by the app.
2.  **API Key (External Integrations):** For requests made by external scripts or services. Generate an API Key in the application settings (Settings > API Keys).
    Include the key in the `Authorization` header:
    ```
    Authorization: Bearer YOUR_API_KEY_HERE
    ```
    Replace `YOUR_API_KEY_HERE` with your generated secret key (prefixed with `lc_sk_`).

**Example Request with API Key:**
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/tasks" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json"
```

**Note:** API Key authentication is scoped to the Team associated with the user who generated the key. Each API key is paired with specific permission scopes that determine which endpoints can be accessed.

#### API Key Scopes

LaunchCue uses a granular scope-based permission system for API keys. Each endpoint requires specific scopes for access:

- `read:resource` - Allows GET operations on the resource
- `write:resource` - Allows POST, PUT, DELETE operations on the resource

Available scopes include:
- `read:projects`, `write:projects` - Project access
- `read:tasks`, `write:tasks` - Task access
- `read:clients`, `write:clients` - Client access
- `read:notes`, `write:notes` - Notes access
- `read:teams`, `write:teams` - Team access
- `read:resources`, `write:resources` - Resources access
- `read:campaigns`, `write:campaigns` - Campaign access
- `read:calendar-events`, `write:calendar-events` - Calendar events access
- `read:braindumps`, `write:braindumps` - Brain dump access
- `read:api-keys`, `write:api-keys` - API key management (requires JWT authentication for security)

When generating an API key in Settings, you must select which scopes the key will have. For security, always follow the principle of least privilege and only grant the minimum scopes needed.

### Quick Examples

#### Get Tasks
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/tasks" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

#### Create a Task
```bash
curl -X POST "https://launchcue.netlify.app/.netlify/functions/tasks" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Task","description":"Task description","status":"To Do","projectId":"PROJECT_ID"}'
```

#### Get Projects
```bash
curl -X GET "https://launchcue.netlify.app/.netlify/functions/projects" \
  -H "Authorization: Bearer lc_sk_AbCdEfGhIjKlMnOpQrStUv"
```

For the complete API reference with all endpoints, parameters, and examples, refer to [API-DOCS.md](API-DOCS.md).
