<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h2>

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
          <h3 class="text-lg font-semibold mb-4">Profile</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">Manage your personal information and password.</p>
          <router-link to="/profile" class="btn btn-secondary">Go to Profile Page</router-link>
        </section>

        <!-- API Keys Section -->
        <ApiKeyManager />

        <!-- Billing Section -->
        <section id="billing" class="card">
          <h3 class="text-lg font-semibold mb-4">Billing</h3>
          <p class="text-gray-600 dark:text-gray-400">You are currently on the <span class="font-semibold text-primary-600 dark:text-primary-400">Free Plan</span>.</p>
          <!-- Add upgrade options later if needed -->
        </section>

        <!-- Integrations Section -->
        <section id="integrations" class="card">
          <h3 class="text-lg font-semibold mb-4">Integrations</h3>
          <p class="text-gray-600 dark:text-gray-400">Connect LaunchCue with other tools.</p>
          <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-center">
            <p class="font-medium text-gray-700 dark:text-gray-300">Coming Soon!</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ApiKeyManager from '../components/settings/ApiKeyManager.vue';

// const activeSection = ref('profile'); // Optional: for highlighting active nav link if sidebar nav is added

</script>

<style scoped>
.nav-link {
  @apply block px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white;
}
.nav-link-active {
   @apply bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold;
}
</style> 