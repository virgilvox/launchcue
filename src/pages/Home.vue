<template>
  <div class="landing-page">

    <!-- NAV -->
    <nav>
      <div class="nav-inner">
        <a href="#" class="logo" @click.prevent="scrollToTop">
          <div class="logo-icon">
            <img src="/logo-placeholder.png" alt="LaunchCue logo">
          </div>
          LaunchCue
        </a>
        <ul class="nav-links">
          <li><a href="#features" @click.prevent="scrollToSection('features')">Features</a></li>
          <li><a href="#ai" @click.prevent="scrollToSection('ai')">AI Tools</a></li>
          <li><a href="#api" @click.prevent="scrollToSection('api')">API</a></li>
          <li><a href="https://github.com/virgilvox/launchcue" target="_blank" rel="noopener noreferrer">GitHub</a></li>
          <li v-if="!isAuthenticated">
            <RouterLink to="/login" class="nav-signin">Sign In</RouterLink>
          </li>
          <li>
            <RouterLink v-if="!isAuthenticated" to="/register" class="nav-cta">Try It Free</RouterLink>
            <RouterLink v-else to="/dashboard" class="nav-cta">Dashboard</RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <div>
            <div class="hero-badge">Open Source &middot; Free to Use</div>
            <h1>Project management<br>built for <span class="highlight">DevRel teams</span></h1>
            <p class="hero-desc">Stop juggling spreadsheets and Notion docs. LaunchCue gives developer relations and marketing consultancies one platform to manage clients, projects, campaigns, and tasks, with AI that actually helps you think.</p>
            <div class="hero-actions">
              <RouterLink v-if="!isAuthenticated" to="/login" class="btn-primary">Launch the App →</RouterLink>
              <RouterLink v-else to="/dashboard" class="btn-primary">Go to Dashboard →</RouterLink>
              <a href="https://github.com/virgilvox/launchcue" target="_blank" rel="noopener noreferrer" class="btn-secondary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                View on GitHub
              </a>
            </div>
          </div>
          <div class="hero-screenshot">
            <img src="/screenshots/dashboard.png" alt="LaunchCue Dashboard" loading="eager">
          </div>
        </div>
      </div>
    </section>

    <!-- FEATURES GRID -->
    <section class="section" id="features">
      <div class="container">
        <div class="section-label">Everything You Need</div>
        <h2 class="section-title">One platform, zero excuses.</h2>
        <p class="section-desc">Built by a DevRel team, for DevRel teams. Every feature exists because someone actually needed it in the field.</p>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>Client Management</h3>
            <p>Organize client info, projects, and communication history in one view. No more digging through email threads.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            </div>
            <h3>Project Tracking</h3>
            <p>Track deliverables, deadlines, and progress across multiple client projects with real-time status updates.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <h3>Task Management</h3>
            <p>Break work into tasks with checklists, priorities, and status tracking. Filter and sort across all projects.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h3>Calendar</h3>
            <p>Unified calendar view of deadlines, meetings, and events. Schedule directly from project context.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Campaigns</h3>
            <p>Plan marketing and DevRel campaigns with timeline steps, team assignments, and structured workflows.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <h3>Brain Dump</h3>
            <p>Paste raw notes and let AI extract action items, summarize content, and organize your thoughts.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <h3>Notes</h3>
            <p>Rich markdown notes linked to projects and clients. Tag, filter, and share across your team.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>Resources</h3>
            <p>Store documents, links, and reference materials. Categorize for quick retrieval when you need them.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Team Management</h3>
            <p>Manage members, roles, and permissions. Multiple teams supported for larger organizations.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SHOWCASE: CLIENTS + TASKS -->
    <section class="showcase">
      <div class="container">

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Client Hub</span>
            <h2>All your clients, one clean view</h2>
            <p>Each client gets a dedicated space with their projects, contacts, and history. Jump between clients without losing context, everything stays connected.</p>
            <ul class="showcase-features-list">
              <li>Per-client project organization</li>
              <li>Quick-access client details</li>
              <li>Project status at a glance</li>
            </ul>
          </div>
          <div class="showcase-img">
            <img src="/screenshots/clients.png" alt="Client Management" loading="lazy">
          </div>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Task Engine</span>
            <h2>Tasks that don't get lost</h2>
            <p>Cross-project task management with checklists, filtering, and status tracking. See everything in one view or drill into specific projects.</p>
            <ul class="showcase-features-list">
              <li>Filter by status, type, client, and project</li>
              <li>Subtask checklists for complex work</li>
              <li>Project-level progress tracking</li>
            </ul>
          </div>
          <div class="showcase-img-stack">
            <img src="/screenshots/tasks.png" alt="Tasks Management" loading="lazy">
            <img src="/screenshots/checklist.png" alt="Task Checklists" loading="lazy">
          </div>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Campaigns</span>
            <h2>Plan the rollout, track the steps</h2>
            <p>DevRel campaigns need structure. Build timelines, assign team members, and generate recaps that keep everyone aligned.</p>
            <ul class="showcase-features-list">
              <li>Timeline-based campaign steps</li>
              <li>AI-generated campaign recaps</li>
              <li>Linked to clients and projects</li>
            </ul>
          </div>
          <div class="showcase-img">
            <img src="/screenshots/campaign.png" alt="Campaign Management" loading="lazy">
          </div>
        </div>

      </div>
    </section>

    <!-- AI SECTION -->
    <section class="ai-section" id="ai">
      <div class="container">
        <div class="ai-header">
          <div class="section-label">AI-Powered</div>
          <h2 class="section-title">AI that organizes your chaos</h2>
          <p class="section-desc">Brain Dump takes your raw notes, meeting scribbles, and stream-of-consciousness thoughts and turns them into structured, actionable output. Choose your processing mode and get organized.</p>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Brain Dump</span>
            <h2>Dump Your Thoughts</h2>
            <p>Paste raw notes, select your client and project context, choose a processing type: summarize, extract key points, organize thoughts, find patterns, or generate action items.</p>
          </div>
          <div class="showcase-img">
            <img src="/screenshots/braindump.png" alt="Brain Dump Input" loading="lazy">
          </div>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Structured Output</span>
            <h2>Get Structured Output</h2>
            <p>AI generates actionable items with priority levels, summaries with full context, or meeting recaps. Push them directly into tasks.</p>
            <ul class="showcase-features-list">
              <li>Actionable items with priority tagging</li>
              <li>One-click push to project tasks</li>
              <li>Select individual items or bulk-create</li>
            </ul>
          </div>
          <div class="showcase-img showcase-img-sm">
            <img src="/screenshots/generate-actionable-items.png" alt="Generate Actionable Items" loading="lazy">
          </div>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Summaries</span>
            <h2>Context-Aware Summaries</h2>
            <p>Include client info, project details, existing tasks, and calendar events as context so summaries actually make sense for your work.</p>
          </div>
          <div class="showcase-img">
            <img src="/screenshots/summarize.png" alt="Summarize Content" loading="lazy">
          </div>
        </div>

        <div class="showcase-block">
          <div class="showcase-text">
            <span class="showcase-tag">Recaps</span>
            <h2>Campaign Recaps</h2>
            <p>Generate structured recaps from campaign timelines, complete with decisions, next steps, and exportable summaries for stakeholders.</p>
          </div>
          <div class="showcase-img">
            <img src="/screenshots/recap.png" alt="Meeting Recap" loading="lazy">
          </div>
        </div>
      </div>
    </section>

    <!-- API SECTION -->
    <section class="api-section" id="api">
      <div class="container">
        <div class="api-block">
          <div>
            <div class="section-label">Developer First</div>
            <h2 class="section-title">Full REST API with scoped keys</h2>
            <p class="section-desc">Everything in LaunchCue is accessible via API. Generate scoped API keys with granular permissions for external integrations, automations, and custom tooling.</p>
            <ul class="showcase-features-list" style="margin-bottom:32px;">
              <li>Token and API key authentication</li>
              <li>Read/write scopes per resource</li>
              <li>Full CRUD on all resources</li>
              <li>Team-scoped access control</li>
            </ul>
            <a href="https://github.com/virgilvox/launchcue/blob/main/API-DOCS.md" target="_blank" rel="noopener noreferrer" class="btn-secondary">Read the API Docs →</a>
          </div>
          <div class="code-block">
            <div class="code-header">
              <span class="code-dot"></span>
              <span class="code-dot"></span>
              <span class="code-dot"></span>
            </div>
            <div class="code-body" v-html="codeSnippet"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>Ship DevRel work,<br>not busywork.</h2>
          <p>Open source, self-hostable, and built with tools you already know. Start managing your DevRel practice the way it should be done.</p>
          <div class="cta-actions">
            <RouterLink v-if="!isAuthenticated" to="/login" class="btn-primary">Try LaunchCue Free →</RouterLink>
            <RouterLink v-else to="/dashboard" class="btn-primary">Go to Dashboard →</RouterLink>
            <a href="https://github.com/virgilvox/launchcue" target="_blank" rel="noopener noreferrer" class="btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER -->
    <footer>
      <div class="container">
        <div class="footer-inner">
          <div class="footer-left">
            <a href="#" class="logo" style="font-size:1.2rem;" @click.prevent="scrollToTop">
              <div class="logo-icon" style="width:26px;height:26px;">
                <img src="/logo-placeholder.png" alt="LaunchCue logo">
              </div>
              LaunchCue
            </a>
            <span class="footer-text">Open source under MIT License</span>
          </div>
          <ul class="footer-links">
            <li><a href="https://github.com/virgilvox/launchcue" target="_blank" rel="noopener noreferrer">GitHub</a></li>
            <li><a href="https://github.com/virgilvox/launchcue/blob/main/API-DOCS.md" target="_blank" rel="noopener noreferrer">API Docs</a></li>
            <li><a href="https://launchcue.netlify.app/" target="_blank" rel="noopener noreferrer">Live Demo</a></li>
          </ul>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => !!authStore.user);

let previousBgColor = '';

onMounted(() => {
  previousBgColor = document.body.style.backgroundColor;
  document.body.style.backgroundColor = '#0a0a0f';

  if (isAuthenticated.value) {
    router.push('/dashboard');
  }
});

onUnmounted(() => {
  document.body.style.backgroundColor = previousBgColor;
});

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const codeSnippet = `<span class="comment"># Fetch all tasks for your team</span>
<span class="keyword">curl</span> -X GET \\
  <span class="string">"https://launchcue.app/api/tasks"</span> \\
  -H <span class="string">"Authorization: Bearer lc_sk_your_key"</span> \\
  -H <span class="string">"Content-Type: application/json"</span>

<span class="comment"># Create a new task</span>
<span class="keyword">curl</span> -X POST \\
  <span class="string">"https://launchcue.app/api/tasks"</span> \\
  -H <span class="string">"Authorization: Bearer lc_sk_your_key"</span> \\
  -H <span class="string">"Content-Type: application/json"</span> \\
  -d <span class="string">'{
    "title": "Review SDK docs",
    "status": "To Do",
    "projectId": "PROJECT_ID"
  }'</span>`;
</script>

<style scoped>
.landing-page {
  --bg: #0a0a0f;
  --surface: #12121a;
  --surface-2: #1a1a26;
  --border: #2a2a3a;
  --text: #e8e8f0;
  --text-muted: #8888a0;
  --accent: #7c5cfc;
  --accent-light: #9b82ff;
  --accent-glow: rgba(124, 92, 252, 0.15);
  --hot: #ff5c5c;
  --warm: #ffb347;
  --green: #4ecdc4;
  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
  min-height: 100vh;
}

.landing-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* NAV */
nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px;
  backdrop-filter: blur(20px);
  background: rgba(10, 10, 15, 0.8);
  border-bottom: 1px solid var(--border);
  transition: all 0.3s;
}

nav .nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-family: 'Anybody', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
  color: var(--text);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 0;
  overflow: hidden;
}

.logo-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.nav-links {
  display: flex;
  gap: 32px;
  align-items: center;
  list-style: none;
}

.nav-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover { color: var(--text); }

.nav-signin {
  border: 1px solid var(--border) !important;
  background: transparent !important;
  color: var(--text) !important;
  padding: 8px 20px;
  border-radius: 0;
  font-weight: 500 !important;
  transition: all 0.2s !important;
}

.nav-signin:hover {
  border-color: var(--accent) !important;
  background: var(--accent-glow) !important;
  color: var(--accent-light) !important;
}

.nav-cta {
  background: var(--accent) !important;
  color: #fff !important;
  padding: 8px 20px;
  border-radius: 0;
  font-weight: 600 !important;
  transition: transform 0.2s, box-shadow 0.2s !important;
}

.nav-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px var(--accent-glow);
}

/* HERO */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  position: relative;
  padding-top: 80px;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -200px;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  pointer-events: none;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: -100px;
  left: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(78, 205, 196, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 0;
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  color: var(--accent-light);
  margin-bottom: 24px;
  letter-spacing: 0.04em;
}

.hero-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--green);
  border-radius: 50%;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.hero h1 {
  font-family: 'Anybody', sans-serif;
  font-weight: 900;
  font-size: clamp(2.8rem, 5vw, 4.2rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 24px;
}

.hero h1 .highlight {
  background: linear-gradient(135deg, var(--accent-light), var(--green));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.15rem;
  color: var(--text-muted);
  max-width: 480px;
  margin-bottom: 36px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 0;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.25s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px var(--accent-glow);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 0;
  font-size: 1rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.25s;
}

.btn-secondary:hover {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.hero-screenshot {
  position: relative;
}

.hero-screenshot img {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03);
  transition: transform 0.4s;
}

.hero-screenshot::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 0;
  background: linear-gradient(135deg, var(--accent), transparent 50%);
  z-index: -1;
  opacity: 0.3;
}

/* SECTIONS */
.section {
  padding: 120px 0;
}

.section-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent-light);
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Anybody', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 3.5vw, 3rem);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 16px;
}

.section-desc {
  font-size: 1.1rem;
  color: var(--text-muted);
  max-width: 600px;
  line-height: 1.7;
  margin-bottom: 60px;
}

/* FEATURES GRID */
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  padding: 32px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover {
  border-color: rgba(124, 92, 252, 0.3);
  transform: translateY(-4px);
}

.feature-card:hover::before { opacity: 1; }

.feature-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-glow);
  border: 1px solid rgba(124, 92, 252, 0.2);
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.feature-icon svg {
  width: 22px;
  height: 22px;
  stroke: var(--accent-light);
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.feature-card h3 {
  font-family: 'Anybody', sans-serif;
  font-weight: 700;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.feature-card p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* SHOWCASE */
.showcase {
  padding: 100px 0;
}

.showcase-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  margin-bottom: 120px;
}

.showcase-block:nth-child(even) {
  direction: rtl;
}

.showcase-block:nth-child(even) > * {
  direction: ltr;
}

.showcase-block:last-child {
  margin-bottom: 0;
}

.showcase-text .showcase-tag {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-light);
  background: var(--accent-glow);
  padding: 4px 12px;
  border-radius: 0;
  display: inline-block;
  margin-bottom: 16px;
}

.showcase-text h2 {
  font-family: 'Anybody', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 2.8vw, 2.4rem);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 16px;
}

.showcase-text p {
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.7;
  margin-bottom: 24px;
}

.showcase-features-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.showcase-features-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.showcase-features-list li::before {
  content: '→';
  color: var(--accent-light);
  font-family: 'Space Mono', monospace;
  font-weight: 700;
}

.showcase-img {
  position: relative;
}

.showcase-img img {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.showcase-img-sm img {
  width: 66%;
  margin-left: auto;
}

.showcase-img-stack {
  position: relative;
}

.showcase-img-stack img:first-child {
  width: 100%;
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.showcase-img-stack img:nth-child(2) {
  position: absolute;
  bottom: -30px;
  right: -20px;
  width: 60%;
  border-radius: 0;
  border: 1px solid var(--border);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
}

/* AI SECTION */
.ai-section {
  padding: 120px 0;
  position: relative;
}

.ai-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--accent-glow) 30%, var(--accent-glow) 70%, transparent);
  pointer-events: none;
}

.ai-header {
  text-align: center;
  margin-bottom: 60px;
  position: relative;
}

.ai-header .section-desc {
  margin-left: auto;
  margin-right: auto;
}


/* API SECTION */
.api-section {
  padding: 100px 0;
  border-top: 1px solid var(--border);
}

.api-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.code-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0;
  overflow: hidden;
}

.code-header {
  padding: 12px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.code-dot:nth-child(1) { background: var(--hot); }
.code-dot:nth-child(2) { background: var(--warm); }
.code-dot:nth-child(3) { background: var(--green); }

.code-body {
  padding: 20px;
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.8;
  color: var(--text-muted);
  overflow-x: auto;
  white-space: pre;
}

.code-body .keyword { color: var(--accent-light); }
.code-body .string { color: var(--green); }
.code-body .comment { color: #555570; }

/* CTA */
.cta-section {
  padding: 120px 0;
  text-align: center;
  position: relative;
}

.cta-section::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(circle, var(--accent-glow) 0%, transparent 70%);
  pointer-events: none;
}

.cta-content {
  position: relative;
}

.cta-content h2 {
  font-family: 'Anybody', sans-serif;
  font-weight: 900;
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin-bottom: 20px;
}

.cta-content p {
  color: var(--text-muted);
  font-size: 1.15rem;
  max-width: 500px;
  margin: 0 auto 40px;
  line-height: 1.7;
}

.cta-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

/* FOOTER */
footer {
  border-top: 1px solid var(--border);
  padding: 48px 0;
}

.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.footer-text {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.footer-links {
  display: flex;
  gap: 24px;
  list-style: none;
}

.footer-links a {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.85rem;
  transition: color 0.2s;
}

.footer-links a:hover { color: var(--text); }

/* ANIMATIONS */
@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-content > * {
  animation: fade-up 0.8s ease-out forwards;
}

.hero-content > :nth-child(2) {
  animation-delay: 0.15s;
}

/* RESPONSIVE */
@media (max-width: 900px) {
  .hero-content,
  .showcase-block,
  .ai-grid,
  .ai-showcase,
  .api-block {
    grid-template-columns: 1fr;
  }

  .showcase-block:nth-child(even) {
    direction: ltr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .hero-screenshot {
    order: -1;
  }

  .nav-links { display: none; }

  .hero-actions, .cta-actions {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .footer-inner {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .footer-left { flex-direction: column; }
}
</style>
