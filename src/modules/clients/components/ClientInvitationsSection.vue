<template>
  <div class="card p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="heading-card">Client Portal Access</h3>
      <button
        v-if="!showInviteForm"
        @click="showInviteForm = true"
        class="btn btn-sm btn-primary"
      >
        Invite
      </button>
    </div>

    <!-- Invite Form -->
    <div v-if="showInviteForm" class="mb-4 p-4 bg-[var(--surface)] border border-[var(--border)]">
      <form @submit.prevent="createInvite" class="space-y-3">
        <div>
          <label for="inviteEmail" class="label">Email</label>
          <input
            id="inviteEmail"
            v-model="inviteForm.email"
            type="email"
            class="input"
            placeholder="client@company.com"
            required
          />
        </div>
        <div>
          <label for="inviteName" class="label">Name</label>
          <input
            id="inviteName"
            v-model="inviteForm.name"
            type="text"
            class="input"
            placeholder="Contact name"
            required
            maxlength="200"
          />
        </div>
        <div class="flex gap-2">
          <button type="submit" class="btn btn-sm btn-primary" :disabled="creating">
            {{ creating ? 'Creating...' : 'Create Invite' }}
          </button>
          <button type="button" @click="cancelInviteForm" class="btn btn-sm btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <!-- Generated Invite Link (shown after creation) -->
    <div v-if="generatedInvite" class="mb-4 p-4 bg-[var(--surface)] border-2 border-[var(--accent-primary)]">
      <p class="text-sm font-medium text-[var(--text-primary)] mb-2">Invitation created for {{ generatedInvite.name }}</p>

      <!-- Copy Link -->
      <div class="flex items-center gap-2 mb-3">
        <input
          :value="generatedInvite.url"
          readonly
          class="input flex-1 text-xs font-mono"
          @click="selectAll"
        />
        <button
          @click="copyLink"
          class="btn btn-sm btn-secondary whitespace-nowrap"
          :class="{ '!border-[var(--success)] !text-[var(--success)]': copied }"
        >
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2">
        <a
          :href="mailtoLink"
          class="btn btn-sm btn-secondary"
        >
          Open in Email
        </a>
        <button
          @click="generatedInvite = null"
          class="btn btn-sm btn-ghost text-xs"
        >
          Dismiss
        </button>
      </div>

      <p class="text-xs text-[var(--text-tertiary)] mt-2">
        Expires {{ formatRelativeDate(generatedInvite.expiresAt) }}
      </p>
    </div>

    <!-- Existing invitations list -->
    <div v-if="loading" class="py-3 text-center">
      <p class="text-caption">Loading invitations...</p>
    </div>

    <div v-else-if="invitations.length === 0 && !showInviteForm && !generatedInvite" class="py-3 text-center">
      <p class="text-caption">No portal invitations sent yet.</p>
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="inv in invitations"
        :key="inv.id"
        class="flex items-center justify-between py-2 px-3 bg-[var(--surface)] border border-[var(--border)]"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-[var(--text-primary)] truncate">{{ inv.name }}</p>
          <p class="text-xs text-[var(--text-secondary)] truncate">{{ inv.email }}</p>
        </div>
        <div class="flex items-center gap-2 ml-3 shrink-0">
          <span
            :class="statusClasses(inv.status)"
            class="text-xs px-2 py-0.5 border"
          >
            {{ inv.status }}
          </span>
          <button
            v-if="inv.status === 'pending'"
            @click="$emit('delete-invitation', inv.id)"
            class="text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors"
            title="Revoke invitation"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { getSupabase } from '@/adapters/supabase/client'

const props = defineProps({
  clientId: { type: String, required: true },
  clientName: { type: String, default: '' },
  invitations: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['invitation-created', 'delete-invitation'])
const toast = useToast()

const showInviteForm = ref(false)
const creating = ref(false)
const copied = ref(false)
const generatedInvite = ref(null)

const inviteForm = ref({
  email: '',
  name: '',
})

const mailtoLink = computed(() => {
  if (!generatedInvite.value) return ''
  const subject = encodeURIComponent(`You're invited to collaborate on LaunchCue`)
  const body = encodeURIComponent(
    `Hi ${generatedInvite.value.name},\n\n` +
    `You've been invited to the ${props.clientName} client portal on LaunchCue.\n\n` +
    `Click the link below to set up your account:\n${generatedInvite.value.url}\n\n` +
    `This invitation expires in 7 days.`
  )
  return `mailto:${generatedInvite.value.email}?subject=${subject}&body=${body}`
})

function cancelInviteForm() {
  showInviteForm.value = false
  inviteForm.value = { email: '', name: '' }
}

async function createInvite() {
  if (!inviteForm.value.email || !inviteForm.value.name) return
  creating.value = true

  try {
    const sb = getSupabase()
    const { data, error } = await sb.rpc('create_client_invitation', {
      p_client_id: props.clientId,
      p_email: inviteForm.value.email,
      p_name: inviteForm.value.name,
      p_project_ids: [],
    })

    if (error) throw new Error(error.message)

    const baseUrl = window.location.origin
    const url = `${baseUrl}/invite/${data.token}`

    generatedInvite.value = {
      id: data.id,
      email: data.email,
      name: data.name,
      url,
      expiresAt: data.expiresAt,
    }

    showInviteForm.value = false
    inviteForm.value = { email: '', name: '' }
    emit('invitation-created')
    toast.success('Invitation created')
  } catch (err) {
    toast.error(err.message || 'Failed to create invitation')
  } finally {
    creating.value = false
  }
}

async function copyLink() {
  if (!generatedInvite.value) return
  try {
    await navigator.clipboard.writeText(generatedInvite.value.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback: select the input text
    toast.info('Press Ctrl+C to copy')
  }
}

function selectAll(e) {
  e.target.select()
}

function statusClasses(status) {
  switch (status) {
    case 'accepted':
      return 'bg-[var(--success-bg,transparent)] text-[var(--success)] border-[var(--success)]'
    case 'pending':
      return 'bg-[var(--warning-bg,transparent)] text-[var(--warning)] border-[var(--warning)]'
    case 'expired':
      return 'bg-[var(--surface)] text-[var(--text-tertiary)] border-[var(--border)]'
    default:
      return 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
  }
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'expired'
  if (diffDays === 1) return 'in 1 day'
  return `in ${diffDays} days`
}
</script>
