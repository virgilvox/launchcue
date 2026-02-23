<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">Set your new password</h2>
      </div>

      <div class="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-md sm:rounded-lg sm:px-10">
        <div v-if="!token" class="text-center">
          <p class="text-sm text-red-600 dark:text-red-400">Invalid or missing reset token.</p>
          <div class="mt-4">
            <router-link to="/forgot-password" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              Request a new reset link
            </router-link>
          </div>
        </div>

        <div v-else-if="success" class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.06l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
                Password reset successfully. Redirecting to login...
              </h3>
            </div>
          </div>
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
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
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
            <div class="mt-1">
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="input"
                placeholder="Enter new password"
                autocomplete="new-password"
              />
            </div>

            <!-- Password strength indicator -->
            <div class="mt-3 space-y-2">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Password requirements:</p>
              <div class="space-y-1">
                <div class="flex items-center text-xs">
                  <svg v-if="requirements.length" class="h-4 w-4 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-gray-300 dark:text-gray-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                  </svg>
                  <span :class="requirements.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                    At least 10 characters
                  </span>
                </div>
                <div class="flex items-center text-xs">
                  <svg v-if="requirements.uppercase" class="h-4 w-4 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-gray-300 dark:text-gray-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                  </svg>
                  <span :class="requirements.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                    One uppercase letter
                  </span>
                </div>
                <div class="flex items-center text-xs">
                  <svg v-if="requirements.lowercase" class="h-4 w-4 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-gray-300 dark:text-gray-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                  </svg>
                  <span :class="requirements.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                    One lowercase letter
                  </span>
                </div>
                <div class="flex items-center text-xs">
                  <svg v-if="requirements.number" class="h-4 w-4 text-green-500 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else class="h-4 w-4 text-gray-300 dark:text-gray-600 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                  </svg>
                  <span :class="requirements.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
                    One number
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <div class="mt-1">
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                required
                class="input"
                placeholder="Confirm new password"
                autocomplete="new-password"
              />
            </div>
            <p v-if="confirmPassword && password !== confirmPassword" class="mt-1 text-xs text-red-500 dark:text-red-400">
              Passwords do not match
            </p>
          </div>

          <div>
            <button
              type="submit"
              class="w-full btn btn-primary"
              :disabled="isLoading || !isFormValid"
            >
              <span v-if="isLoading" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ isLoading ? 'Resetting...' : 'Reset password' }}
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
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import apiService from '../../services/api.service';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const router = useRouter();
const route = useRoute();
const toast = useToast();

const token = ref('');
const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const success = ref(false);
const isLoading = ref(false);

onMounted(() => {
  token.value = route.query.token || '';
});

const requirements = computed(() => ({
  length: password.value.length >= 10,
  lowercase: /[a-z]/.test(password.value),
  uppercase: /[A-Z]/.test(password.value),
  number: /[0-9]/.test(password.value),
}));

const isPasswordValid = computed(() => {
  const req = requirements.value;
  return req.length && req.lowercase && req.uppercase && req.number;
});

const isFormValid = computed(() => {
  return isPasswordValid.value && password.value === confirmPassword.value;
});

const handleSubmit = async () => {
  error.value = '';

  if (!isPasswordValid.value) {
    error.value = 'Password does not meet requirements';
    return;
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  isLoading.value = true;

  try {
    await apiService.resetPassword(token.value, password.value);
    success.value = true;
    toast.success('Password reset successfully!');

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push({ path: '/login', query: { message: 'password-reset' } });
    }, 2000);
  } catch (err) {
    error.value = err.message || 'Failed to reset password. The link may have expired.';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
};
</script>
