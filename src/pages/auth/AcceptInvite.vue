<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <AppLogo :size="48" class="mx-auto" />
        <h1 class="mt-4 text-2xl font-bold text-[var(--text-primary)]">Join LaunchCue</h1>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">
          {{ hasExistingAccount ? 'Sign in to access the client portal' : 'Set up your account to access the client portal' }}
        </p>
      </div>

      <div class="bg-[var(--surface-elevated)] shadow-brutal-md p-6">
        <!-- Loading: validating token -->
        <div v-if="loading" class="text-center py-6">
          <LoadingSpinner text="Validating invitation..." />
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-6">
          <p class="text-[var(--danger)] mb-4">{{ error }}</p>
          <router-link to="/login" class="btn btn-primary">Go to Login</router-link>
        </div>

        <!-- Success state -->
        <div v-else-if="accepted" class="text-center py-6">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[var(--surface)] border-2 border-[var(--success)] mb-4">
            <svg class="h-6 w-6 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-[var(--text-primary)] mb-2">
            {{ hasExistingAccount ? 'Portal Access Granted!' : 'Account Created!' }}
          </h3>
          <p class="text-sm text-[var(--text-secondary)] mb-4">Redirecting to your portal...</p>
        </div>

        <!-- Existing user: sign in form -->
        <form v-else-if="hasExistingAccount" @submit.prevent="handleSubmit" class="space-y-4">
          <p class="text-sm text-[var(--text-secondary)]">
            An account exists for <strong>{{ inviteEmail }}</strong>. Enter your password to accept this invitation.
          </p>

          <div>
            <label for="password" class="label">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="input"
              placeholder="Your existing password"
              required
            />
          </div>

          <p v-if="formError" class="text-sm text-[var(--danger)]">{{ formError }}</p>

          <button type="submit" class="btn btn-primary w-full" :disabled="submitting">
            {{ submitting ? 'Signing In...' : 'Sign In & Accept' }}
          </button>
        </form>

        <!-- New user: create password form -->
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
import { useOnboardingStore } from '@/stores/onboarding'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import AppLogo from '@/components/ui/AppLogo.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const onboardingStore = useOnboardingStore()

const loading = ref(true)
const error = ref(null)
const accepted = ref(false)
const submitting = ref(false)
const formError = ref(null)
const password = ref('')
const confirmPassword = ref('')
const inviteToken = ref('')
const inviteEmail = ref('')
const hasExistingAccount = ref(false)

onMounted(async () => {
  inviteToken.value = route.params.token
  if (!inviteToken.value) {
    error.value = 'Invalid invitation link. Please check the URL and try again.'
    loading.value = false
    return
  }

  // If already authenticated, sign out to avoid session conflicts
  // (e.g., a team admin clicking an invite link meant for a client)
  try {
    const { getSupabase: getSb } = await import('@/adapters/supabase/client')
    const { data: sessionCheck } = await getSb().auth.getSession()
    if (sessionCheck?.session) {
      await getSb().auth.signOut()
      sessionStorage.clear()
    }
  } catch {
    // Non-critical — proceed with invitation flow
  }

  // Validate token and check if user already exists
  try {
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()
    const { data, error: rpcError } = await sb.rpc('accept_client_invitation', {
      p_token: inviteToken.value,
    })
    if (rpcError) throw new Error(rpcError.message)

    inviteEmail.value = data.email
    hasExistingAccount.value = data.hasExistingAccount
  } catch (err) {
    error.value = err.message || 'Invalid or expired invitation link.'
  } finally {
    loading.value = false
  }
})

async function handleSubmit() {
  formError.value = null

  if (!hasExistingAccount.value) {
    if (password.value !== confirmPassword.value) {
      formError.value = 'Passwords do not match.'
      return
    }
    if (password.value.length < 10) {
      formError.value = 'Password must be at least 10 characters.'
      return
    }
  }

  submitting.value = true

  try {
    const result = await onboardingStore.acceptInvitation(inviteToken.value, password.value)

    // Build user data for auth store
    const userData = {
      id: result.userId,
      name: result.name,
      email: result.email,
      role: 'client',
      clientId: result.clientId,
    }

    // Get current session token
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()
    const { data: sessionData } = await sb.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (accessToken) {
      authStore.setSession(userData, accessToken)

      // Store team info
      const teamSummary = { id: result.teamId, name: result.teamName || '', role: 'client' }
      sessionStorage.setItem('teams', JSON.stringify([teamSummary]))
      sessionStorage.setItem('currentTeam', JSON.stringify(teamSummary))

      accepted.value = true
      setTimeout(() => router.push('/portal'), 1500)
    } else {
      formError.value = 'Account created. Please sign in with your new password.'
      setTimeout(() => router.push('/login'), 2000)
    }
  } catch (err) {
    formError.value = err.message || 'Failed to accept invitation.'
  } finally {
    submitting.value = false
  }
}
</script>
