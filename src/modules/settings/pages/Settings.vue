<template>
  <PageContainer>
    <PageHeader title="Settings" />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Navigation -->
      <nav class="md:col-span-1 hidden md:block">
        <ul class="space-y-1 sticky top-24">
          <li>
            <a href="#profile" class="nav-link" :class="{'nav-link-active': activeSection === 'profile'}" @click.prevent="scrollToSection('profile')">Profile</a>
          </li>
          <li>
            <a href="#api-keys" class="nav-link" :class="{'nav-link-active': activeSection === 'api-keys'}" @click.prevent="scrollToSection('api-keys')">API Keys</a>
          </li>
          <li>
            <a href="#webhooks" class="nav-link" :class="{'nav-link-active': activeSection === 'webhooks'}" @click.prevent="scrollToSection('webhooks')">Webhooks</a>
          </li>
          <li>
            <a href="#audit-log" class="nav-link" :class="{'nav-link-active': activeSection === 'audit-log'}" @click.prevent="scrollToSection('audit-log')">Audit Log</a>
          </li>
          <li>
            <a href="#billing" class="nav-link" :class="{'nav-link-active': activeSection === 'billing'}" @click.prevent="scrollToSection('billing')">Billing</a>
          </li>
          <li>
            <a href="#integrations" class="nav-link" :class="{'nav-link-active': activeSection === 'integrations'}" @click.prevent="scrollToSection('integrations')">Integrations</a>
          </li>
        </ul>
      </nav>

      <!-- Main Settings Content -->
      <div class="md:col-span-2 space-y-8">
         <!-- Profile Section -->
        <section id="profile" class="card">
          <h3 class="heading-card mb-4">Profile</h3>
          <p class="text-[var(--text-secondary)] mb-4">Manage your personal information and password.</p>
          <router-link to="/profile" class="btn btn-secondary">Go to Profile Page</router-link>
        </section>

        <!-- API Keys Section -->
        <div id="api-keys">
          <ApiKeyManager />
        </div>

        <!-- Webhooks Section -->
        <div id="webhooks">
          <WebhookManager />
        </div>

        <!-- Audit Log Section -->
        <div id="audit-log">
          <AuditLogViewer />
        </div>

        <!-- Billing Section -->
        <section id="billing" class="card">
          <h3 class="heading-card mb-4">Billing</h3>
          <div class="flex items-center gap-3 mb-2">
            <span class="badge bg-[var(--accent-primary)] text-white px-3 py-1 text-sm font-semibold">Free Plan</span>
          </div>
          <p class="text-[var(--text-secondary)] text-sm">You have access to all features during the free tier. Upgrade options coming soon.</p>
        </section>

        <!-- Integrations Section -->
        <section id="integrations" class="card">
          <h3 class="heading-card mb-4">Integrations</h3>
          <p class="text-[var(--text-secondary)] mb-4">Connect LaunchCue with other tools.</p>
          <div class="border-2 border-dashed border-[var(--border)] p-8 text-center">
            <p class="font-medium text-[var(--text-primary)] mb-2">No integrations available yet</p>
            <p class="text-sm text-[var(--text-secondary)]">
              Planned: GitHub, Slack, Discord, Linear, and Zapier. Check back soon.
            </p>
          </div>
        </section>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import ApiKeyManager from '@/modules/settings/components/ApiKeyManager.vue';
import WebhookManager from '@/modules/settings/components/WebhookManager.vue';
import AuditLogViewer from '@/modules/settings/components/AuditLogViewer.vue';

const activeSection = ref('profile');

function scrollToSection(id) {
  activeSection.value = id;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Track active section on scroll
let observer = null;

onMounted(() => {
  const sections = document.querySelectorAll('#profile, #api-keys, #webhooks, #audit-log, #billing, #integrations');
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id;
        }
      }
    },
    { rootMargin: '-20% 0px -60% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
});

onUnmounted(() => {
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  border-left: 2px solid transparent;
  transition: all 0.15s;
}
.nav-link:hover {
  background-color: var(--surface);
  color: var(--text-primary);
}
.nav-link-active {
  background-color: var(--surface);
  color: var(--accent-primary);
  font-weight: 600;
  border-left-color: var(--accent-primary);
}
</style>
