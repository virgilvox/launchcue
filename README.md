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
   CLAUDE_API_KEY=your_claude_api_key
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_for_tokens
   ```

4. Run the development server with Netlify Functions:
   ```
   npm run dev:netlify
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

LaunchCue provides a basic API for external integrations.

### Authentication

API requests can be authenticated in two ways:

1.  **JWT Token (User Session):** For requests made from the LaunchCue frontend application after a user logs in. Handled automatically by the app.
2.  **API Key (External Integrations):** For requests made by external scripts or services. Generate an API Key in the application settings (Settings > API Keys).
    Include the key in the `Authorization` header:
    ```
    Authorization: Bearer YOUR_API_KEY_HERE
    ```
    Replace `YOUR_API_KEY_HERE` with your generated secret key (prefixed with `lc_sk_`).

**Note:** API Key authentication is scoped to the Team associated with the user who generated the key at the time of generation. Ensure your key has access to the desired team data.

### Endpoints

The API base URL depends on your deployment:
*   **Netlify Dev:** `http://localhost:8888/.netlify/functions`
*   **Production:** `https://your-site-name.netlify.app/.netlify/functions`

#### Get Projects
*   `GET /projects`
*   `GET /projects?clientId=<CLIENT_ID>`
*   Returns projects for the current team, optionally filtered by client.

#### Get Project
*   `GET /projects/:projectId`
*   Returns details for a specific project.

#### Get Tasks
*   `GET /tasks`
*   Returns tasks for the current team.
*   **Query Parameters:** `projectId`, `status`, `clientId` (note: clientId filters tasks belonging to projects of that client).

#### Get Task
*   `GET /tasks/:taskId`
*   Returns details for a specific task.

#### Get Clients
*   `GET /clients`
*   Returns clients for the current team.

#### Get Client
*   `GET /clients/:clientId`
*   Returns details for a specific client.

#### Get Client Contacts
*   `GET /clients/:clientId/contacts`
*   Returns contacts for a specific client.

#### Get Campaigns
*   `GET /campaigns`
*   Returns campaigns for the current team.
*   **Query Parameters:** `clientId`, `projectId`.

#### Get Campaign
*   `GET /campaigns/:campaignId`
*   Returns details for a specific campaign (including steps).

#### Get Notes
*   `GET /notes`
*   Returns notes for the current team.
*   **Query Parameters:** `clientId`, `projectId`, `tag`.

#### Get Note
*   `GET /notes/:noteId`
*   Returns details for a specific note.

#### Get API Keys
*   `GET /api-keys`
*   Returns a list of API key names and prefixes (key hash is excluded).

#### Generate API Key
*   `POST /api-keys`
*   **Body:** `{ "name": "Your Key Name" }`
*   Returns the newly generated key details, including the *full API key* (only time it's shown).

#### Delete API Key
*   `DELETE /api-keys/:keyPrefix`
*   Deletes the API key identified by its prefix.

#### Get User Profile
*   `GET /users/profile`
*   Returns the profile information for the authenticated user.

### Write Operations
*(POST, PUT, DELETE endpoints exist for most resources above but are not fully documented here yet. Refer to function code for details.)*
