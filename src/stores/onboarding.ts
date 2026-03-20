import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { ONBOARDING_REPO, CLIENT_INVITATION_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { ClientInvitation, OnboardingChecklist } from '../types/models'
import type { ClientInvitationCreateRequest, OnboardingCreateRequest } from '../types/api'
import { useAuthStore } from './auth'


export const useOnboardingStore = defineStore('onboarding', () => {
  const invitations = ref<ClientInvitation[]>([])
  const checklists = ref<OnboardingChecklist[]>([])
  const isLoading = ref(false)

  function getChecklistRepo() {
    return getContainer().resolve<Repository<OnboardingChecklist, OnboardingCreateRequest, Partial<OnboardingCreateRequest>>>(ONBOARDING_REPO)
  }

  function getInvitationRepo() {
    return getContainer().resolve<Repository<ClientInvitation, ClientInvitationCreateRequest, Partial<ClientInvitationCreateRequest>>>(CLIENT_INVITATION_REPO)
  }

  // ─── Invitation Actions ───

  const fetchInvitations = async (clientId?: string): Promise<ClientInvitation[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const filter = clientId ? { clientId } : {}
      const response = await getInvitationRepo().findAll(filter)
      invitations.value = Array.isArray(response) ? response : []
      return invitations.value
    } catch (error) {
      invitations.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createInvitation = async (data: ClientInvitationCreateRequest): Promise<ClientInvitation & { token: string }> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()
    const { data: result, error } = await sb.rpc('create_client_invitation', {
      p_client_id: data.clientId,
      p_email: data.email,
      p_name: data.name,
      p_project_ids: data.projectIds || [],
    })
    if (error) throw new Error(error.message)
    const invitation = {
      id: result.id,
      email: result.email,
      name: result.name,
      token: result.token,
      expiresAt: result.expiresAt,
      role: 'client' as const,
      status: 'pending' as const,
    } as ClientInvitation & { token: string }
    invitations.value.push(invitation)
    getEventBus().emit('invitation.created', { invitation })
    return invitation
  }

  const acceptInvitation = async (token: string, password: string): Promise<{
    userId: string
    teamId: string
    teamName: string
    clientId: string
    projectIds: string[]
    name: string
    email: string
  }> => {
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()

    // Step 1: Validate token and get invitation details
    const { data: inviteData, error: inviteError } = await sb.rpc('accept_client_invitation', {
      p_token: token,
    })

    if (inviteError) throw new Error(inviteError.message || 'Invalid or expired invitation')

    const { email, name, teamId, clientId, projectIds, hasExistingAccount } = inviteData

    // Step 2: Sign up or sign in
    if (hasExistingAccount) {
      // Existing user — sign in with the password they provided
      const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw new Error('Account exists for this email. ' + signInError.message)
      if (!signInData.user) throw new Error('Sign-in failed')
    } else {
      // New user — create auth account
      const { data: signUpData, error: signUpError } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (signUpError) throw new Error(signUpError.message)
      if (!signUpData.user) throw new Error('Signup failed — no user returned')
    }

    // Step 3: Now authenticated — finalize the invitation (creates app user + team membership)
    const { data: { user: authUser } } = await sb.auth.getUser()
    if (!authUser) throw new Error('Authentication failed')

    const { data: finalizeResult, error: finalizeError } = await sb.rpc('finalize_client_invitation', {
      p_token: token,
      p_auth_id: authUser.id,
    })
    if (finalizeError) throw new Error(finalizeError.message)

    // Step 4: Set current team in JWT and refresh session
    await sb.auth.updateUser({ data: { current_team_id: finalizeResult.teamId } })
    await sb.auth.refreshSession()

    return {
      userId: finalizeResult.userId,
      teamId: finalizeResult.teamId,
      teamName: finalizeResult.teamName || '',
      clientId: finalizeResult.clientId,
      projectIds: finalizeResult.projectIds || [],
      name: finalizeResult.name || name,
      email,
    }
  }

  const deleteInvitation = async (id: string): Promise<void> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    await getInvitationRepo().delete(id)
    invitations.value = invitations.value.filter(inv => inv.id !== id)
    getEventBus().emit('invitation.deleted', { id })
  }

  // ─── Checklist Actions ───

  const fetchChecklists = async (params?: { clientId?: string; projectId?: string }): Promise<OnboardingChecklist[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getChecklistRepo().findAll(params)
      checklists.value = Array.isArray(response) ? response : []
      return checklists.value
    } catch (error) {
      checklists.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createChecklist = async (data: OnboardingCreateRequest): Promise<OnboardingChecklist> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const result = await getChecklistRepo().create(data)
    if (result && result.id) {
      checklists.value.push(result)
      getEventBus().emit('onboarding.created', { checklist: result })
    }
    return result
  }

  const updateChecklist = async (id: string, data: Partial<OnboardingCreateRequest>): Promise<OnboardingChecklist> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    isLoading.value = true
    try {
      const updated = await getChecklistRepo().update(id, data)
      const index = checklists.value.findIndex(c => c.id === id)
      if (index !== -1) {
        checklists.value[index] = updated
      }
      getEventBus().emit('onboarding.updated', { checklist: updated })
      return updated
    } finally {
      isLoading.value = false
    }
  }

  const completeStep = async (checklistId: string, stepId: string, response?: Record<string, unknown>): Promise<OnboardingChecklist> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    const updated = await getChecklistRepo().update(checklistId, {
      stepId,
      action: 'completeStep',
      response,
    } as unknown as Partial<OnboardingCreateRequest>)
    const index = checklists.value.findIndex(c => c.id === checklistId)
    if (index !== -1) {
      checklists.value[index] = updated
    }
    getEventBus().emit('onboarding.step-completed', { checklistId, stepId })
    return updated
  }

  const deleteChecklist = async (id: string): Promise<void> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    await getChecklistRepo().delete(id)
    checklists.value = checklists.value.filter(c => c.id !== id)
    getEventBus().emit('onboarding.deleted', { id })
  }

  return {
    invitations,
    checklists,
    isLoading,
    fetchInvitations,
    createInvitation,
    acceptInvitation,
    deleteInvitation,
    fetchChecklists,
    createChecklist,
    updateChecklist,
    completeStep,
    deleteChecklist,
  }
})
