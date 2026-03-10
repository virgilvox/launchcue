<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <AppLogo :size="48" class="mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-[var(--text-secondary)]">Sign in to your account</h2>
      </div>

      <div class="mt-8 bg-[var(--surface-elevated)] py-8 px-4 shadow-brutal-md sm:px-10">
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div v-if="error" class="border-2 border-[var(--danger)] bg-[var(--surface)] p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-[var(--danger)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-[var(--danger)]">{{ error }}</h3>
              </div>
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-[var(--text-primary)]">Email</label>
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
            <label for="password" class="block text-sm font-medium text-[var(--text-primary)]">Password</label>
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

          <div class="flex items-center justify-end">
            <div class="text-sm">
              <router-link to="/forgot-password" class="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Forgot password?</router-link>
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
            <span class="text-[var(--text-secondary)]">Don't have an account?</span>
            <router-link to="/register" class="ml-1 font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Sign up</router-link>
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
import AppLogo from '@/components/ui/AppLogo.vue';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const email = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    await authStore.login(email.value, password.value);

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