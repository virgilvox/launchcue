<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
    <div class="max-w-md w-full">
      <!-- Logo/App Name -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {{ appName }}
        </h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          DevRel project management and content coordination
        </p>
      </div>
      
      <!-- Auth Form Container -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
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