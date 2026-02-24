<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <img class="h-12 w-auto mx-auto" src="/logo-placeholder.png" alt="LaunchCue">
        <h1 class="mt-4 text-2xl font-bold text-[var(--text-primary)]">Join LaunchCue</h1>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">Set up your account to access the client portal</p>
      </div>

      <div class="bg-[var(--surface-elevated)] shadow-brutal-md p-6">
        <div v-if="loading" class="text-center py-6">
          <LoadingSpinner text="Processing invitation..." />
        </div>

        <div v-else-if="error" class="text-center py-6">
          <p class="text-[var(--danger)] mb-4">{{ error }}</p>
          <router-link to="/login" class="btn btn-primary">Go to Login</router-link>
        </div>

        <div v-else-if="accepted" class="text-center py-6">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[var(--surface)] border-2 border-[var(--success)] mb-4">
            <svg class="h-6 w-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-[var(--text-primary)] mb-2">Account Created!</h3>
          <p class="text-sm text-[var(--text-secondary)] mb-4">Redirecting to your portal...</p>
        </div>

        <form v-else @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="password" class="label">Create Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="input"
              placeholder="At least 10 characters"
              required
              minlength="10"
            />
          </div>

          <div>
            <label for="confirmPassword" class="label">Confirm Password</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              class="input"
              placeholder="Repeat your password"
              required
            />
          </div>

          <ul class="text-xs text-[var(--text-secondary)] space-y-1">
            <li :class="password.length >= 10 ? 'text-[var(--success)]' : ''">At least 10 characters</li>
            <li :class="/[a-z]/.test(password) ? 'text-[var(--success)]' : ''">One lowercase letter</li>
            <li :class="/[A-Z]/.test(password) ? 'text-[var(--success)]' : ''">One uppercase letter</li>
            <li :class="/[0-9]/.test(password) ? 'text-[var(--success)]' : ''">One number</li>
            <li :class="/[^a-zA-Z0-9]/.test(password) ? 'text-[var(--success)]' : ''">One special character</li>
          </ul>

          <p v-if="formError" class="text-sm text-[var(--danger)]">{{ formError }}</p>

          <button type="submit" class="btn btn-primary w-full" :disabled="submitting">
            {{ submitting ? 'Creating Account...' : 'Create Account' }}
          </button>
        </form>
      </div>

      <p class="mt-4 text-center text-sm text-[var(--text-secondary)]">
        Already have an account? <router-link to="/login" class="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">Sign in</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import onboardingService from '@/services/onboarding.service'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref(null)
const accepted = ref(false)
const submitting = ref(false)
const formError = ref(null)
const password = ref('')
const confirmPassword = ref('')
const inviteToken = ref('')

onMounted(() => {
  inviteToken.value = route.params.token
  if (!inviteToken.value) {
    error.value = 'Invalid invitation link. Please check the URL and try again.'
  }
})

async function handleSubmit() {
  formError.value = null

  if (password.value !== confirmPassword.value) {
    formError.value = 'Passwords do not match.'
    return
  }

  if (password.value.length < 10) {
    formError.value = 'Password must be at least 10 characters.'
    return
  }

  submitting.value = true

  try {
    const result = await onboardingService.acceptInvitation(inviteToken.value, password.value)

    if (result.token) {
      // Set auth session (token + user data)
      const userData = {
        ...result.user,
        role: 'client',
        projectIds: result.projectIds || []
      }
      authStore.setSession(userData, result.token)

      accepted.value = true

      // Redirect to portal after brief delay
      setTimeout(() => {
        router.push('/portal')
      }, 1500)
    } else {
      formError.value = 'Unexpected response. Please try again.'
    }
  } catch (err) {
    formError.value = err.message || 'Failed to create account. The invitation may have expired.'
  } finally {
    submitting.value = false
  }
}
</script>
