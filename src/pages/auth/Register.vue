<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <div class="text-center">
        <img src="/logo-placeholder.png" alt="LaunchCue" class="h-12 w-12 mx-auto mb-4">
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">{{ appName }}</h1>
        <h2 class="mt-2 text-lg font-medium text-[var(--text-secondary)]">Create your account</h2>
      </div>
      
      <div class="mt-8 bg-[var(--surface-elevated)] py-8 px-4 shadow-brutal-md sm:px-10">
        <form class="space-y-6" @submit.prevent="handleRegister">
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
            <label for="name" class="block text-sm font-medium text-[var(--text-primary)]">Full Name</label>
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
                autocomplete="new-password" 
              />
            </div>
            <p class="mt-1 text-xs text-[var(--text-secondary)]">
              Password must be at least 10 characters with uppercase, lowercase, and a number
            </p>
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-[var(--text-primary)]">Confirm Password</label>
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
              class="h-4 w-4 text-[var(--accent-primary)] border-[var(--border)]"
            />
            <label for="terms" class="ml-2 block text-sm text-[var(--text-primary)]">
              I agree to the <a href="#" class="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Terms of Service</a> and <a href="#" class="font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Privacy Policy</a>
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
            <span class="text-[var(--text-secondary)]">Already have an account?</span>
            <router-link to="/login" class="ml-1 font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Sign in</router-link>
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