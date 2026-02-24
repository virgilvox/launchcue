<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-[var(--text-secondary)]">Email Verification</h2>
      </div>

      <div class="mt-8 bg-[var(--surface-elevated)] py-8 px-4 shadow-brutal-md sm:px-10">
        <!-- Loading state -->
        <div v-if="isLoading" class="text-center">
          <span class="inline-block animate-spin h-8 w-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full"></span>
          <p class="mt-4 text-sm text-[var(--text-secondary)]">Verifying your email...</p>
        </div>

        <!-- Success state -->
        <div v-else-if="success" class="border-2 border-[var(--success)] bg-[var(--surface)] p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-[var(--success)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-[var(--success)]">
                Your email has been verified successfully!
              </h3>
            </div>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="border-2 border-[var(--danger)] bg-[var(--surface)] p-4">
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

        <!-- No token state -->
        <div v-else class="text-center">
          <p class="text-sm text-[var(--text-secondary)]">No verification token provided.</p>
        </div>

        <div class="mt-6">
          <div class="text-sm text-center">
            <router-link to="/login" class="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Go to sign in</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import apiService from '../../services/api.service';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const route = useRoute();
const toast = useToast();

const isLoading = ref(false);
const success = ref(false);
const error = ref('');

onMounted(async () => {
  const token = route.query.token;
  if (!token) return;

  isLoading.value = true;

  try {
    await apiService.verifyEmail(token);
    success.value = true;
    toast.success('Email verified successfully!');
  } catch (err) {
    error.value = err.message || 'Verification failed. The link may have expired.';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
});
</script>
