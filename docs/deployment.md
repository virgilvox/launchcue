# LaunchCue Production Deployment Guide

Two deployment paths — choose based on your needs.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Generate Secrets](#generate-secrets)
3. [Path A: DigitalOcean App Platform + Droplet](#path-a-digitalocean-app-platform--droplet)
4. [Path B: Self-hosted Docker Compose](#path-b-self-hosted-docker-compose)
5. [Post-deploy Verification](#post-deploy-verification)
6. [Troubleshooting](#troubleshooting)
7. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

- DigitalOcean account (or any server with Docker)
- Domain name (e.g., `launchcue.app`)
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- SMTP credentials (Resend, SendGrid, Mailgun, or any SMTP provider)
- Git with the LaunchCue repo pushed to GitHub

---

## Generate Secrets

Run locally and save all outputs securely:

```bash
# JWT secret (shared between all Supabase services)
openssl rand -hex 32

# Postgres password
openssl rand -hex 24

# Secret key base (for Realtime)
openssl rand -hex 64
```

### Generate Supabase JWT Keys

Supabase needs two JWTs signed with your JWT secret — an **anon key** (limited permissions) and a **service role key** (bypasses RLS).

Reference: [Supabase self-hosting API keys](https://supabase.com/docs/guides/self-hosting#api-keys)

Or generate with Node.js:

```bash
node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const secret = 'YOUR_JWT_SECRET_HERE';  // <-- paste your JWT secret from above

// Anon key
const anonPayload = Buffer.from(JSON.stringify({
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 10*365*24*60*60
})).toString('base64url');
const anonSig = crypto.createHmac('sha256', secret).update(header+'.'+anonPayload).digest('base64url');
console.log('ANON KEY:', header+'.'+anonPayload+'.'+anonSig);

// Service role key
const srvPayload = Buffer.from(JSON.stringify({
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 10*365*24*60*60
})).toString('base64url');
const srvSig = crypto.createHmac('sha256', secret).update(header+'.'+srvPayload).digest('base64url');
console.log('SERVICE ROLE KEY:', header+'.'+srvPayload+'.'+srvSig);
"
```

---

## Path A: DigitalOcean App Platform + Droplet

**Architecture**: App Platform hosts the Vue SPA (static site) + Express API (Docker container). A separate Droplet runs self-hosted Supabase (PostgreSQL, GoTrue, PostgREST, Realtime, Kong).

### A1. Set Up Supabase Droplet

Create a **4GB+ RAM** Droplet (Ubuntu 22.04) via the DO console, then SSH in:

```bash
ssh root@<DROPLET_IP>

# Run the setup script (installs Docker, creates /opt/launchcue)
# Option 1: from the repo
git clone https://github.com/<your-repo>/launchcue.git /tmp/launchcue
bash /tmp/launchcue/infra/droplet-setup.sh

# Option 2: inline
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
apt-get install -y docker-compose-plugin
mkdir -p /opt/launchcue
```

### A2. Configure Supabase on the Droplet

```bash
cd /opt/launchcue

# Copy required files from the repo
cp /tmp/launchcue/docker-compose.dev.yml ./docker-compose.yml
cp -r /tmp/launchcue/supabase ./supabase

# Create .env with your generated secrets
cat > .env << 'EOF'
POSTGRES_PASSWORD=<your-postgres-password>
JWT_SECRET=<your-jwt-secret>
SECRET_KEY_BASE=<your-secret-key-base>
SUPABASE_ANON_KEY=<your-generated-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-generated-service-role-key>
EOF

# Start Supabase stack
docker compose up -d

# Verify all services are running (~15 seconds for startup)
docker compose ps
```

### A3. Run SQL Migrations

The migrations mount at `/docker-entrypoint-initdb.d/` and auto-run on first boot. If the database was already initialized, run manually:

```bash
docker compose exec db psql -U postgres -d postgres

# Inside psql:
\i /docker-entrypoint-initdb.d/001_create_tables.sql
\i /docker-entrypoint-initdb.d/002_row_level_security.sql
\i /docker-entrypoint-initdb.d/003_indexes.sql
\i /docker-entrypoint-initdb.d/004_functions.sql
\i /docker-entrypoint-initdb.d/005_views.sql
\q
```

### A4. Configure Firewall

```bash
ufw allow 22/tcp    # SSH
ufw allow 8000/tcp  # Supabase Kong gateway
ufw enable
```

For production, restrict port 8000 to your App Platform's VPC CIDR only:

```bash
ufw delete allow 8000/tcp
ufw allow from <APP_PLATFORM_VPC_CIDR> to any port 8000
```

### A5. Optional: TLS for Supabase Endpoint

```bash
apt install -y nginx certbot python3-certbot-nginx

# Create nginx config to proxy 443 → localhost:8000
cat > /etc/nginx/sites-available/supabase << 'NGINXEOF'
server {
    listen 80;
    server_name supabase.yourdomain.com;
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

certbot --nginx -d supabase.yourdomain.com
```

This gives you `https://supabase.yourdomain.com` as your Supabase URL.

### A6. Create DigitalOcean App

1. Push your code to GitHub
2. Go to DO Console → Apps → Create App
3. Import from GitHub, select the repo and branch
4. DO detects `.do/app.yaml` automatically

Set environment variables in the App Platform console:

**Static site (frontend):**

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://supabase.yourdomain.com` (or `http://<DROPLET_IP>:8000`) |
| `VITE_SUPABASE_ANON_KEY` | Your generated anon key |
| `VITE_API_URL` | `/api` |

**API service (Express):**

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://supabase.yourdomain.com` (or `http://<DROPLET_IP>:8000`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your generated service role key |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ALLOWED_ORIGINS` | `https://yourdomain.com` |
| `SMTP_HOST` | Your SMTP host (e.g., `smtp.resend.com`) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your SMTP user |
| `SMTP_PASS` | Your SMTP password |
| `SMTP_FROM` | `noreply@yourdomain.com` |

5. Click Deploy

### A7. Configure Supabase Auth for Production

On the Droplet, update GoTrue to know your production URL:

```bash
cd /opt/launchcue

# Edit docker-compose.yml GoTrue environment:
#   GOTRUE_SITE_URL: https://yourdomain.com
#   API_EXTERNAL_URL: https://supabase.yourdomain.com
#   GOTRUE_MAILER_AUTOCONFIRM: "false"   # require email verification

docker compose down && docker compose up -d
```

---

## Path B: Self-hosted Docker Compose

Everything on one server. Uses the root `docker-compose.yml` which runs the Vue SPA (nginx), Express API, and full Supabase stack.

### B1. Set Up the Server

```bash
ssh root@<SERVER_IP>

# Install Docker
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin

# Clone the repo
git clone https://github.com/<your-repo>/launchcue.git
cd launchcue
```

### B2. Configure Environment

```bash
cat > .env << 'EOF'
POSTGRES_PASSWORD=<your-postgres-password>
JWT_SECRET=<your-jwt-secret>
SECRET_KEY_BASE=<your-secret-key-base>
SUPABASE_ANON_KEY=<your-generated-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-generated-service-role-key>
ANTHROPIC_API_KEY=sk-ant-...
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=noreply@yourdomain.com
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=http://kong:8000
EOF
```

### B3. Start Everything

```bash
docker compose up -d
# Starts: frontend (nginx:80), api (express:3001), db, auth, rest, realtime, kong
```

Migrations auto-run via the `docker-entrypoint-initdb.d` mount on first boot.

### B4. Point Domain + TLS

Point `yourdomain.com` A record to `<SERVER_IP>`, then:

```bash
apt install -y certbot python3-certbot-nginx

# Configure host nginx to proxy 443 → container port 80
cat > /etc/nginx/sites-available/launchcue << 'NGINXEOF'
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
ln -s /etc/nginx/sites-available/launchcue /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

certbot --nginx -d yourdomain.com
```

---

## Post-deploy Verification

```bash
# 1. Health check
curl https://yourdomain.com/api/health
# → {"status":"ok","timestamp":"..."}

# 2. Supabase reachable
curl https://supabase.yourdomain.com/rest/v1/ \
  -H "apikey: <ANON_KEY>"
# → Should return empty array or table list

# 3. Auth works
curl -X POST https://supabase.yourdomain.com/auth/v1/signup \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
# → Should return user object

# 4. Open the app in browser
# Register → create team → add client → create project
# Try Cmd+K search, try Brain Dump with AI
```

---

## Troubleshooting

### CORS errors in browser console
- `ALLOWED_ORIGINS` must match your exact domain (no trailing slash)
- For Path B, nginx proxies the frontend; Express handles CORS for `/api`

### Auth redirect loops
- `GOTRUE_SITE_URL` must match your frontend URL exactly (including `https://`)
- Check `API_EXTERNAL_URL` matches the Supabase URL the frontend is configured to use

### AI not working
- Verify `ANTHROPIC_API_KEY` is set on the API service
- Check Express logs: `docker compose logs api`
- Test directly: `curl -X POST https://yourdomain.com/api/ai/process -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -d '{"prompt":"test"}'`

### Realtime not connecting
- Verify Kong routes `/realtime/v1/` correctly (check `supabase/kong.yml`)
- Verify `SECRET_KEY_BASE` is set and at least 64 chars
- Check WebSocket upgrade is allowed through any reverse proxy

### Email not sending
- Auth emails (verification, password reset): Configure SMTP on GoTrue (the `auth` service)
- App emails (invitations, notifications): Configure SMTP on the Express API service
- Set `GOTRUE_MAILER_AUTOCONFIRM: "false"` to require email verification

### Database migrations didn't run
- Check if tables exist: `docker compose exec db psql -U postgres -c '\dt'`
- If empty, run migrations manually (see step A3)
- The `docker-entrypoint-initdb.d` mount only auto-runs on **first** database initialization

### Build failures on App Platform
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set as build-time env vars
- These are needed at build time because Vite inlines them during the build

---

## Environment Variable Reference

### Frontend (build-time, `VITE_` prefix)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase API URL (Kong gateway) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous JWT key |
| `VITE_API_URL` | Yes | Express API base URL (`/api`) |

### Express API Server (runtime)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase API URL (same as `VITE_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role JWT key (bypasses RLS) |
| `ANTHROPIC_API_KEY` | For AI | Anthropic API key for brain dump processing |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins |
| `SMTP_HOST` | For email | SMTP server hostname |
| `SMTP_PORT` | For email | SMTP port (usually `587`) |
| `SMTP_USER` | For email | SMTP username |
| `SMTP_PASS` | For email | SMTP password |
| `SMTP_FROM` | For email | Sender email address |
| `PORT` | No | Express port (default: `3001`) |

### Supabase Stack (Docker)

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL superuser password |
| `JWT_SECRET` | Yes | JWT signing secret (shared across GoTrue, PostgREST, Realtime) |
| `SECRET_KEY_BASE` | Yes | Erlang secret for Realtime (min 64 chars) |
| `SUPABASE_ANON_KEY` | Yes | Generated anon JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Generated service role JWT |
| `SITE_URL` | Prod | Frontend URL for GoTrue redirects |
| `API_EXTERNAL_URL` | Prod | Public Supabase URL for GoTrue |
