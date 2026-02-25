<template>
  <PageContainer>
    <PageHeader title="Settings" />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Left Navigation (Optional) -->
      <!-- <nav class="md:col-span-1">
        <ul class="space-y-1">
          <li><a href="#profile" class="nav-link" :class="{'nav-link-active': activeSection === 'profile'}" @click.prevent="activeSection='profile'">Profile</a></li>
          <li><a href="#api-keys" class="nav-link" :class="{'nav-link-active': activeSection === 'api-keys'}" @click.prevent="activeSection='api-keys'">API Keys</a></li>
          <li><a href="#billing" class="nav-link" :class="{'nav-link-active': activeSection === 'billing'}" @click.prevent="activeSection='billing'">Billing</a></li>
          <li><a href="#integrations" class="nav-link" :class="{'nav-link-active': activeSection === 'integrations'}" @click.prevent="activeSection='integrations'">Integrations</a></li>
        </ul>
      </nav> -->

      <!-- Main Settings Content -->
      <div class="md:col-span-3 space-y-8">
         <!-- Profile Section (Placeholder - Link to existing Profile page) -->
        <section id="profile" class="card">
          <h3 class="heading-card mb-4">Profile</h3>
          <p class="text-[var(--text-secondary)] mb-4">Manage your personal information and password.</p>
          <router-link to="/profile" class="btn btn-secondary">Go to Profile Page</router-link>
        </section>

        <!-- API Keys Section -->
        <ApiKeyManager />

        <!-- Webhooks Section -->
        <WebhookManager />

        <!-- Audit Log Section -->
        <AuditLogViewer />

        <!-- Billing Section -->
        <section id="billing" class="card">
          <h3 class="heading-card mb-4">Billing</h3>
          <p class="text-[var(--text-secondary)]">You are currently on the <span class="font-semibold text-[var(--accent-primary)]">Free Plan</span>.</p>
          <!-- Add upgrade options later if needed -->
        </section>

        <!-- Integrations Section -->
        <section id="integrations" class="card">
          <h3 class="heading-card mb-4">Integrations</h3>
          <p class="text-[var(--text-secondary)]">Connect LaunchCue with other tools.</p>
          <div class="mt-4 p-4 bg-[var(--surface)] text-center">
            <p class="font-medium text-[var(--text-primary)]">Coming Soon!</p>
          </div>
        </section>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref } from 'vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import ApiKeyManager from '../components/settings/ApiKeyManager.vue';
import WebhookManager from '../components/settings/WebhookManager.vue';
import AuditLogViewer from '../components/settings/AuditLogViewer.vue';

// const activeSection = ref('profile'); // Optional: for highlighting active nav link if sidebar nav is added

</script>

<style scoped>
.nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.nav-link:hover {
  background-color: var(--surface);
  color: var(--text-primary);
}
.nav-link-active {
  background-color: var(--surface);
  color: var(--text-primary);
  font-weight: 600;
}
</style> 