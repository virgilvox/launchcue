<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <!-- Hero Section -->
    <div class="py-16 px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center">
      <div class="text-center max-w-3xl mx-auto">
        <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
          Launch<span class="text-primary-600 dark:text-primary-400">Cue</span>
        </h1>
        <p class="mt-6 text-xl text-gray-500 dark:text-gray-300 max-w-2xl mx-auto">
          AI-powered project management and content coordination for DevRel teams.
        </p>
        <div class="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <RouterLink 
            v-if="!isAuthenticated" 
            to="/login" 
            class="btn btn-primary btn-lg"
          >
            Log In
          </RouterLink>
          <RouterLink 
            v-if="!isAuthenticated" 
            to="/register" 
            class="btn btn-secondary btn-lg"
          >
            Sign Up
          </RouterLink>
          <RouterLink 
            v-if="isAuthenticated" 
            to="/dashboard" 
            class="btn btn-primary btn-lg"
          >
            Go to Dashboard
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Feature Section -->
    <div class="py-12 bg-white dark:bg-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Built for DevRel Teams
          </h2>
          <p class="mt-4 text-lg text-gray-500 dark:text-gray-300 max-w-2xl mx-auto">
            Streamline project management, enhance content coordination, and leverage AI to boost productivity.
          </p>
        </div>

        <div class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div class="text-center">
            <div class="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Client & Project Management</h3>
            <p class="mt-2 text-base text-gray-500 dark:text-gray-400">
              Organize clients and projects in one centralized platform designed for DevRel workflows.
            </p>
          </div>

          <div class="text-center">
            <div class="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
              </svg>
            </div>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">AI-Powered Workflows</h3>
            <p class="mt-2 text-base text-gray-500 dark:text-gray-400">
              Convert raw notes and brain dumps into structured tasks and actionable workflows automatically.
            </p>
          </div>

          <div class="text-center">
            <div class="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">Visual Campaign Builder</h3>
            <p class="mt-2 text-base text-gray-500 dark:text-gray-400">
              Create and visualize multi-phase campaigns across content, community, and advocacy tracks.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const isAuthenticated = computed(() => !!authStore.user);

onMounted(() => {
  // Redirect to dashboard if user is already logged in
  if (isAuthenticated.value) {
    router.push('/dashboard');
  }
});
</script> 