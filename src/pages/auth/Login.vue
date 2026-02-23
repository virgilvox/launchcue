<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-primary-950/30 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <img src="/logo-placeholder.png" alt="LaunchCue" class="h-12 w-12 mx-auto mb-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">Sign in to your account</h2>
      </div>
      
      <div class="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-md sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-md p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">{{ error }}</h3>
              </div>
            </div>
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div class="mt-1">
              <input 
                id="email" 
                v-model="email" 
                type="email" 
                required 
                class="input" 
                placeholder="your@email.com"
                autocomplete="email" 
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div class="mt-1">
              <input 
                id="password" 
                v-model="password" 
                type="password" 
                required 
                class="input" 
                placeholder="••••••••"
                autocomplete="current-password" 
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input 
                id="remember-me" 
                v-model="rememberMe" 
                type="checkbox" 
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-900" 
              />
              <label for="remember-me" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">Remember me</label>
            </div>

            <div class="text-sm">
              <router-link to="/forgot-password" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Forgot password?</router-link>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              class="w-full btn btn-primary"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ isLoading ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="text-sm text-center">
            <span class="text-gray-500 dark:text-gray-400">Don't have an account?</span>
            <router-link to="/register" class="ml-1 font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Sign up</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToast } from 'vue-toastification';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;
  
  try {
    await authStore.login(email.value, password.value);
    
    if (rememberMe.value) {
      // In a real app, we'd implement proper "remember me" functionality
      // For MVP, we'll just save the fact that the user chose to be remembered
      localStorage.setItem('rememberMe', 'true');
    }
    
    toast.success('Welcome back!');
    router.push('/dashboard');
  } catch (err) {
    error.value = err.message || 'Invalid credentials. Please try again.';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
};
</script> 