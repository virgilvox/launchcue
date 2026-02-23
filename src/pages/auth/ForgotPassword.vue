<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">Reset your password</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div class="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-md sm:rounded-lg sm:px-10">
        <div v-if="success" class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900 rounded-md p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-200">{{ successMessage }}</h3>
            </div>
          </div>
        </div>

        <form v-if="!success" class="space-y-6" @submit.prevent="handleSubmit">
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
            <button
              type="submit"
              class="w-full btn btn-primary"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ isLoading ? 'Sending...' : 'Send reset link' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="text-sm text-center">
            <router-link to="/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Back to sign in</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import apiService from '../../services/api.service';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const toast = useToast();

const email = ref('');
const error = ref('');
const success = ref(false);
const successMessage = ref('');
const isLoading = ref(false);

const handleSubmit = async () => {
  error.value = '';
  isLoading.value = true;

  try {
    await apiService.forgotPassword(email.value);
    success.value = true;
    successMessage.value = 'If an account with that email exists, a password reset link has been sent. Check your inbox.';
    toast.success('Reset link sent!');
  } catch (err) {
    error.value = err.message || 'Something went wrong. Please try again.';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
};
</script>
