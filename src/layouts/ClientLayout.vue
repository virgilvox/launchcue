<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center gap-3">
            <img class="h-8 w-auto" src="/logo-placeholder.png" alt="LaunchCue">
            <span class="text-xl font-semibold text-gray-900 dark:text-white">LaunchCue</span>
            <span class="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Client Portal</span>
          </div>
          <nav class="flex items-center gap-4">
            <router-link to="/portal" class="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600">Dashboard</router-link>
            <button @click="handleLogout" class="btn btn-sm btn-ghost text-gray-500">Logout</button>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <router-view />
    </main>
  </div>
</template>
