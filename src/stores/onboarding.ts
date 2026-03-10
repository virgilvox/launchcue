import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { ONBOARDING_REPO, CLIENT_INVITATION_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { ClientInvitation, OnboardingChecklist } from '../types/models'
import type { ClientInvitationCreateRequest, OnboardingCreateRequest } from '../types/api'


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
    try {
      const result = await getInvitationRepo().create(data) as ClientInvitation & { token: string }
      if (result && result.id) {
        invitations.value.push(result)
        getEventBus().emit('invitation.created', { invitation: result })
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const acceptInvitation = async (token: string, password: string): Promise<any> => {
    try {
      // Accept invitation is a special action on the invitation repo
      const result = await getInvitationRepo().create({
        action: 'accept',
        token,
        password,
      } as unknown as ClientInvitationCreateRequest)
      return result
    } catch (error) {
      throw error
    }
  }

  const deleteInvitation = async (id: string): Promise<void> => {
    try {
      await getInvitationRepo().delete(id)
      invitations.value = invitations.value.filter(inv => inv.id !== id)
      getEventBus().emit('invitation.deleted', { id })
    } catch (error) {
      throw error
    }
  }

  // ─── Checklist Actions ───

  const fetchChecklists = async (params?: { clientId?: string; projectId?: string }): Promise<OnboardingChecklist[]> => {
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
    try {
      const result = await getChecklistRepo().create(data)
      if (result && result.id) {
        checklists.value.push(result)
        getEventBus().emit('onboarding.created', { checklist: result })
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const updateChecklist = async (id: string, data: Partial<OnboardingCreateRequest>): Promise<OnboardingChecklist> => {
    isLoading.value = true
    try {
      const updated = await getChecklistRepo().update(id, data)
      const index = checklists.value.findIndex(c => c.id === id)
      if (index !== -1) {
        checklists.value[index] = updated
      }
      getEventBus().emit('onboarding.updated', { checklist: updated })
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const completeStep = async (checklistId: string, stepId: string, response?: Record<string, unknown>): Promise<OnboardingChecklist> => {
    try {
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
    } catch (error) {
      throw error
    }
  }

  const deleteChecklist = async (id: string): Promise<void> => {
    try {
      await getChecklistRepo().delete(id)
      checklists.value = checklists.value.filter(c => c.id !== id)
      getEventBus().emit('onboarding.deleted', { id })
    } catch (error) {
      throw error
    }
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
