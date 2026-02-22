<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-gray-600 dark:text-gray-400">Create your account</h2>
      </div>
      
      <div class="mt-8 bg-white dark:bg-gray-800 py-8 px-4 shadow-md sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="handleRegister">
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
            <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <div class="mt-1">
              <input 
                id="name" 
                v-model="name" 
                type="text" 
                required 
                class="input" 
                placeholder="John Doe"
                autocomplete="name" 
              />
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
                autocomplete="new-password" 
              />
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Password must be at least 10 characters with uppercase, lowercase, and a number
            </p>
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
                placeholder="••••••••"
                autocomplete="new-password" 
              />
            </div>
          </div>

          <div class="flex items-center">
            <input 
              id="terms" 
              v-model="acceptTerms" 
              type="checkbox" 
              required
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-900" 
            />
            <label for="terms" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              I agree to the <a href="#" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">Terms of Service</a> and <a href="#" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">Privacy Policy</a>
            </label>
          </div>

          <div>
            <button 
              type="submit" 
              class="w-full btn btn-primary"
              :disabled="isLoading || !isFormValid"
            >
              <span v-if="isLoading" class="inline-block animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ isLoading ? 'Creating account...' : 'Create account' }}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="text-sm text-center">
            <span class="text-gray-500 dark:text-gray-400">Already have an account?</span>
            <router-link to="/login" class="ml-1 font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">Sign in</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToast } from 'vue-toastification';

const appName = import.meta.env.VITE_APP_NAME || 'LaunchCue';
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const acceptTerms = ref(false);
const error = ref('');
const isLoading = ref(false);

const passwordRequirements = computed(() => ({
  length: password.value.length >= 10,
  lowercase: /[a-z]/.test(password.value),
  uppercase: /[A-Z]/.test(password.value),
  number: /[0-9]/.test(password.value),
}));

const isPasswordValid = computed(() => {
  const req = passwordRequirements.value;
  return req.length && req.lowercase && req.uppercase && req.number;
});

const isFormValid = computed(() => {
  return (
    name.value.trim() !== '' &&
    email.value.trim() !== '' &&
    isPasswordValid.value &&
    password.value === confirmPassword.value &&
    acceptTerms.value
  );
});

const handleRegister = async () => {
  error.value = '';
  
  if (!isFormValid.value) {
    if (!isPasswordValid.value) {
      error.value = 'Password must be at least 10 characters with uppercase, lowercase, and a number';
    } else if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match';
    } else {
      error.value = 'Please fill in all required fields';
    }
    return;
  }
  
  isLoading.value = true;
  
  try {
    await authStore.register(email.value, password.value, name.value);
    
    toast.success('Account created successfully!');
    router.push('/');
  } catch (err) {
    error.value = err.message || 'Failed to create account. Please try again.';
    toast.error(error.value);
  } finally {
    isLoading.value = false;
  }
};
</script> 