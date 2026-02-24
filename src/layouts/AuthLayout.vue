<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4">
    <div class="max-w-md w-full">
      <!-- Logo/App Name -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-[var(--accent-primary)]">
          {{ appName }}
        </h1>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">
          DevRel project management and content coordination
        </p>
      </div>

      <!-- Auth Form Container -->
      <div class="bg-[var(--surface-elevated)] shadow-brutal-md overflow-hidden">
        <div class="p-6">
          <router-view></router-view>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
</script> 