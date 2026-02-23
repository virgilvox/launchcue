import apiService, { CLIENT_INVITATION_ENDPOINT, ONBOARDING_ENDPOINT } from './api.service'
import type { ClientInvitation, OnboardingChecklist } from '@/types/models'
import type { ClientInvitationCreateRequest, OnboardingCreateRequest } from '@/types/api'

class OnboardingService {
  // ─── Client Invitations ───

  async getInvitations(clientId?: string): Promise<ClientInvitation[]> {
    const params: Record<string, string> = clientId ? { clientId } : {}
    return apiService.get<ClientInvitation[]>(CLIENT_INVITATION_ENDPOINT, params)
  }

  async getInvitation(id: string): Promise<ClientInvitation> {
    return apiService.get<ClientInvitation>(`${CLIENT_INVITATION_ENDPOINT}/${id}`)
  }

  async createInvitation(data: ClientInvitationCreateRequest): Promise<ClientInvitation & { token: string }> {
    return apiService.post<ClientInvitation & { token: string }>(CLIENT_INVITATION_ENDPOINT, data)
  }

  async deleteInvitation(id: string): Promise<unknown> {
    return apiService.delete(`${CLIENT_INVITATION_ENDPOINT}/${id}`)
  }

  async acceptInvitation(token: string, password: string): Promise<any> {
    return apiService.post(`${CLIENT_INVITATION_ENDPOINT}?action=accept`, { token, password })
  }

  // ─── Onboarding Checklists ───

  async getChecklists(params?: { clientId?: string; projectId?: string }): Promise<OnboardingChecklist[]> {
    const queryParams: Record<string, string> = {}
    if (params?.clientId) queryParams.clientId = params.clientId
    if (params?.projectId) queryParams.projectId = params.projectId
    return apiService.get<OnboardingChecklist[]>(ONBOARDING_ENDPOINT, queryParams)
  }

  async getChecklist(id: string): Promise<OnboardingChecklist> {
    return apiService.get<OnboardingChecklist>(`${ONBOARDING_ENDPOINT}/${id}`)
  }

  async createChecklist(data: OnboardingCreateRequest): Promise<OnboardingChecklist> {
    return apiService.post<OnboardingChecklist>(ONBOARDING_ENDPOINT, data)
  }

  async updateChecklist(id: string, data: Partial<OnboardingCreateRequest>): Promise<OnboardingChecklist> {
    return apiService.put<OnboardingChecklist>(`${ONBOARDING_ENDPOINT}/${id}`, data)
  }

  async completeStep(checklistId: string, stepId: string, response?: Record<string, unknown>): Promise<OnboardingChecklist> {
    return apiService.put<OnboardingChecklist>(
      `${ONBOARDING_ENDPOINT}/${checklistId}?action=complete-step`,
      { stepId, response }
    )
  }

  async deleteChecklist(id: string): Promise<unknown> {
    return apiService.delete(`${ONBOARDING_ENDPOINT}/${id}`)
  }
}

export default new OnboardingService()
