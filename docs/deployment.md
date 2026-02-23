# LaunchCue Production Deployment Guide

This guide covers deploying LaunchCue to production using Netlify (hosting + serverless functions) and MongoDB Atlas (database).

---

## 1. Prerequisites

Before starting, ensure you have:

- **Node.js 18+** installed locally (for building and testing)
- **A Netlify account** at [netlify.com](https://www.netlify.com/)
- **A MongoDB Atlas account** at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- **An Anthropic API key** from [console.anthropic.com](https://console.anthropic.com/) (required for AI features such as brain dump processing)
- **Git** with your LaunchCue repository pushed to GitHub (or GitLab/Bitbucket)

---

## 2. MongoDB Atlas Setup

### 2.1 Create a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Click **Build a Database**.
3. Select the **M0 Free** tier (or a paid tier for production workloads).
4. Choose a cloud provider and region close to your Netlify functions region (AWS us-east-1 is a common default for Netlify).
5. Name the cluster (e.g., `launchcue-prod`) and click **Create Cluster**.

### 2.2 Configure Network Access

1. Navigate to **Network Access** in the left sidebar.
2. Click **Add IP Address**.
3. For Netlify Functions (which use dynamic IPs), whitelist all IPs:
   - Enter `0.0.0.0/0` and add a comment like "Netlify Functions - all IPs".
4. Alternatively, if you are on a Netlify paid plan with static IPs, whitelist only those specific IPs for tighter security.

> **Note:** The `0.0.0.0/0` whitelist is safe when combined with strong database user credentials, because Atlas still requires authentication. However, using specific IPs is always preferable when possible.

### 2.3 Create a Database User

1. Navigate to **Database Access** in the left sidebar.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Set a username (e.g., `launchcue-app`) and generate a strong password.
5. Under **Database User Privileges**, select **Read and write to any database** (or scope to a specific database if preferred).
6. Click **Add User**.

### 2.4 Get the Connection String

1. Go back to **Database** (Deployments) and click **Connect** on your cluster.
2. Select **Drivers** and choose **Node.js**.
3. Copy the connection string. It will look like:
   ```
   mongodb+srv://launchcue-app:<password>@launchcue-prod.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with the database user password you created.
5. Optionally append a database name to the URI path (e.g., `.../launchcue?retryWrites=true&w=majority`). If no database name is specified, the MongoDB driver will use the default database from the URI, and LaunchCue calls `client.db()` without arguments, which selects the database from the connection string.

> **Tip:** Store this connection string securely. You will set it as the `MONGODB_URI` environment variable in Netlify. LaunchCue automatically creates all required indexes on first connection (see `netlify/functions/utils/db.js`), so no manual index creation is needed.

---

## 3. Netlify Setup

### 3.1 Link Your Repository

1. Log in to [Netlify](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Connect your GitHub (or GitLab/Bitbucket) account and select the LaunchCue repository.

### 3.2 Configure Build Settings

On the deploy configuration screen, set the following:

| Setting            | Value               |
|--------------------|---------------------|
| **Build command**  | `npm run build`     |
| **Publish directory** | `dist`           |
| **Functions directory** | `netlify/functions` |

These settings match the project's `netlify.toml`, which Netlify will also read automatically:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

### 3.3 Set Environment Variables

Navigate to **Site settings** > **Environment variables** (or set them during the initial deploy screen) and add the following:

#### Required Variables

**`MONGODB_URI`**
- The MongoDB Atlas connection string from step 2.4.
- Example: `mongodb+srv://launchcue-app:YourSecurePassword@launchcue-prod.xxxxx.mongodb.net/launchcue?retryWrites=true&w=majority`

**`JWT_SECRET`**
- A cryptographically random string of at least 64 characters, used to sign and verify JWT tokens.
- Generate one with:
  ```bash
  openssl rand -hex 64
  ```
- Example: `a3f1b9c8d7e6...` (128 hex characters)

> **Warning:** If `JWT_SECRET` is shorter than 64 characters, the backend will log a warning on every cold start. Always use a full-length secret in production.

**`ANTHROPIC_API_KEY`** (required for AI features)
- Obtain from [console.anthropic.com](https://console.anthropic.com/) under **API Keys**.
- Example: `sk-ant-api03-...`
- If not set, AI features (brain dump processing) will be unavailable, and a warning will be logged.

**`ALLOWED_ORIGINS`** (required in production)
- A comma-separated list of origins permitted to make cross-origin requests.
- Must include your production URL. Example:
  ```
  https://launchcue.netlify.app
  ```
- If you also have a custom domain:
  ```
  https://launchcue.netlify.app,https://app.launchcue.com
  ```
- In production (`NODE_ENV=production`), the backend **will refuse to start** if this variable is missing. Without it, all CORS requests are denied.

#### Recommended Variables

**`NODE_ENV`**
- Set to `production` for production deployments.
- This enables:
  - Mandatory `ALLOWED_ORIGINS` validation on cold start
  - Sanitized error responses (stack traces and internal error details are stripped from 500 responses)
  - Rate limiting fails closed for auth endpoints

### 3.4 Deploy

1. Click **Deploy site**.
2. Netlify will install dependencies, run `npm run build` (which executes `vite build`), and deploy the static assets plus serverless functions.
3. Monitor the deploy log for any build errors.
4. Once complete, your site will be available at `https://<your-site-name>.netlify.app`.

---

## 4. Custom Domain

### 4.1 Add a Custom Domain in Netlify

1. Go to **Site settings** > **Domain management**.
2. Click **Add a domain**.
3. Enter your custom domain (e.g., `app.launchcue.com`).
4. Netlify will display DNS configuration instructions.

### 4.2 Configure DNS

**Option A: Netlify DNS (recommended)**
1. Netlify will prompt you to delegate your domain's nameservers to Netlify DNS.
2. Update your domain registrar's nameservers to the ones Netlify provides.
3. This gives Netlify full DNS control and enables automatic SSL.

**Option B: External DNS**
1. Add a CNAME record pointing your subdomain to `<your-site-name>.netlify.app`.
   - Example: `app` CNAME `launchcue.netlify.app`
2. For apex domains (e.g., `launchcue.com`), use an ALIAS or ANAME record if your DNS provider supports it, or use Netlify DNS.

### 4.3 SSL Certificate

- Netlify automatically provisions a free SSL certificate via Let's Encrypt once DNS is verified.
- HTTPS is enforced by default. No manual certificate management is required.
- The `netlify.toml` already sets the `Strict-Transport-Security` header with `max-age=31536000; includeSubDomains; preload`.

### 4.4 Update ALLOWED_ORIGINS

After adding a custom domain, update the `ALLOWED_ORIGINS` environment variable to include the new domain:

```
https://launchcue.netlify.app,https://app.launchcue.com
```

Redeploy or trigger a functions restart for the change to take effect.

---

## 5. Post-Deploy Verification Checklist

Run through each of these checks after your first production deploy.

### 5.1 Verify Security Headers

```bash
curl -I https://your-site.netlify.app
```

Confirm the response includes:

```
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
content-security-policy: default-src 'self'; script-src 'self'; ...
```

These headers are configured in `netlify.toml` and applied to all routes.

### 5.2 Test Registration and Login

1. Open the app in a browser and navigate to the registration page.
2. Create a new account with a valid email and password.
3. Log out, then log back in with the same credentials.
4. Verify the JWT token is returned and subsequent API calls succeed.

### 5.3 Verify CORS

**Allowed origin (should succeed):**
```bash
curl -X OPTIONS https://your-site.netlify.app/.netlify/functions/auth-login \
  -H "Origin: https://your-site.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  -I
```
Confirm the response includes `access-control-allow-origin: https://your-site.netlify.app`.

**Disallowed origin (should be blocked):**
```bash
curl -X OPTIONS https://your-site.netlify.app/.netlify/functions/auth-login \
  -H "Origin: https://evil-site.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -I
```
Confirm `access-control-allow-origin` is empty or absent.

### 5.4 Verify Rate Limiting

The auth endpoints are rate-limited to 5 requests per 15-minute window. Test this:

```bash
for i in {1..6}; do
  echo "--- Request $i ---"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" \
    -X POST https://your-site.netlify.app/.netlify/functions/auth-login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  sleep 0.5
done
```

The first 5 requests should return `401` (invalid credentials). The 6th request should return `429` (Too Many Requests).

### 5.5 Verify Error Sanitization

With `NODE_ENV=production`, 500 errors must not leak stack traces or internal details:

```bash
curl -s https://your-site.netlify.app/.netlify/functions/tasks \
  -H "Authorization: Bearer invalid-token-value" | python3 -m json.tool
```

The response should contain a generic error message without file paths, stack traces, or internal variable names.

### 5.6 Verify API Key Creation and Scoped Access

1. Log in to the app and navigate to **Settings** > **API Keys**.
2. Create a new API key with specific scopes (e.g., `read:tasks`).
3. Copy the key (it will start with `lc_sk_`).
4. Test access with the key:

```bash
# Should succeed (read:tasks scope)
curl -s https://your-site.netlify.app/.netlify/functions/tasks \
  -H "Authorization: Bearer lc_sk_your_key_here"

# Should fail with 403 (no write:tasks scope)
curl -s -X POST https://your-site.netlify.app/.netlify/functions/tasks \
  -H "Authorization: Bearer lc_sk_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

---

## 6. Environment Variable Reference

| Variable | Required | Description | Example |
|---|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/launchcue?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | Secret for signing JWTs. Must be at least 64 characters. | `openssl rand -hex 64` output |
| `ANTHROPIC_API_KEY` | Yes (for AI) | Anthropic API key for brain dump AI processing | `sk-ant-api03-...` |
| `ALLOWED_ORIGINS` | Yes (in prod) | Comma-separated list of allowed CORS origins. Mandatory when `NODE_ENV=production`. | `https://your-site.netlify.app,https://app.yourdomain.com` |
| `NODE_ENV` | Recommended | Set to `production` to enable strict validation, error sanitization, and secure rate-limiting defaults. | `production` |

---

## Troubleshooting

### Functions fail with "Missing required environment variables"

The backend validates `MONGODB_URI` and `JWT_SECRET` on every cold start. If either is missing, the function will throw immediately. Double-check the variables in **Site settings** > **Environment variables** and redeploy.

### CORS errors in the browser console

- Ensure `ALLOWED_ORIGINS` includes the exact origin (protocol + domain, no trailing slash).
- If using a custom domain, include both the Netlify subdomain and the custom domain.
- After changing environment variables, trigger a redeploy or clear the functions cache (Netlify UI > **Deploys** > **Trigger deploy** > **Clear cache and deploy site**).

### MongoDB connection timeouts

- Verify the Atlas cluster is running and not paused (M0 clusters auto-pause after inactivity).
- Confirm `0.0.0.0/0` is in the Atlas Network Access list.
- Check that the database user password in `MONGODB_URI` is URL-encoded if it contains special characters (e.g., `@` becomes `%40`).

### AI features return errors

- Verify `ANTHROPIC_API_KEY` is set and valid.
- Check your Anthropic account for billing status and rate limits.
- The AI endpoint is rate-limited to 10 requests per minute per user.
