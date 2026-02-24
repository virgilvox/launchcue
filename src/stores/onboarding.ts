import { ref } from 'vue'
import { defineStore } from 'pinia'
import onboardingService from '../services/onboarding.service'
import type { ClientInvitation, OnboardingChecklist } from '../types/models'
import type { ClientInvitationCreateRequest, OnboardingCreateRequest } from '../types/api'

export const useOnboardingStore = defineStore('onboarding', () => {
  // State
  const invitations = ref<ClientInvitation[]>([])
  const checklists = ref<OnboardingChecklist[]>([])
  const isLoading = ref(false)

  // ─── Invitation Actions ───

  const fetchInvitations = async (clientId?: string): Promise<ClientInvitation[]> => {
    isLoading.value = true
    try {
      const response = await onboardingService.getInvitations(clientId)
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
      const result = await onboardingService.createInvitation(data)
      if (result && result.id) {
        invitations.value.push(result)
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const deleteInvitation = async (id: string): Promise<void> => {
    try {
      await onboardingService.deleteInvitation(id)
      invitations.value = invitations.value.filter(inv => inv.id !== id)
    } catch (error) {
      throw error
    }
  }

  // ─── Checklist Actions ───

  const fetchChecklists = async (params?: { clientId?: string; projectId?: string }): Promise<OnboardingChecklist[]> => {
    isLoading.value = true
    try {
      const response = await onboardingService.getChecklists(params)
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
      const result = await onboardingService.createChecklist(data)
      if (result && result.id) {
        checklists.value.push(result)
      }
      return result
    } catch (error) {
      throw error
    }
  }

  const updateChecklist = async (id: string, data: Partial<OnboardingCreateRequest>): Promise<OnboardingChecklist> => {
    isLoading.value = true
    try {
      const updated = await onboardingService.updateChecklist(id, data)
      const index = checklists.value.findIndex(c => c.id === id)
      if (index !== -1) {
        checklists.value[index] = updated
      }
      return updated
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const completeStep = async (checklistId: string, stepId: string, response?: Record<string, unknown>): Promise<OnboardingChecklist> => {
    try {
      const updated = await onboardingService.completeStep(checklistId, stepId, response)
      const index = checklists.value.findIndex(c => c.id === checklistId)
      if (index !== -1) {
        checklists.value[index] = updated
      }
      return updated
    } catch (error) {
      throw error
    }
  }

  const deleteChecklist = async (id: string): Promise<void> => {
    try {
      await onboardingService.deleteChecklist(id)
      checklists.value = checklists.value.filter(c => c.id !== id)
    } catch (error) {
      throw error
    }
  }

  // Return state and actions
  return {
    invitations,
    checklists,
    isLoading,
    fetchInvitations,
    createInvitation,
    deleteInvitation,
    fetchChecklists,
    createChecklist,
    updateChecklist,
    completeStep,
    deleteChecklist,
  }
})
