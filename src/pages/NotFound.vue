<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="text-center px-4 py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-lg">
      <h1 class="text-6xl font-bold text-primary-600 dark:text-primary-400 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Page Not Found</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <div class="flex justify-center space-x-4">
        <button @click="goBack" class="btn btn-secondary">
          Go Back
        </button>
        <router-link to="/dashboard" class="btn btn-primary">
          Go to Dashboard
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.back();
}
</script> 