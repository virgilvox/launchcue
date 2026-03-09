import type { OnboardingChecklist } from '@/types/models'
import type { OnboardingCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { ONBOARDING_ENDPOINT } from '@/services/api.service'

export class NetlifyOnboardingRepository implements Repository<OnboardingChecklist, OnboardingCreateRequest, Partial<OnboardingCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<OnboardingChecklist[]> {
    return apiService.get<OnboardingChecklist[]>(ONBOARDING_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<OnboardingChecklist> {
    return apiService.get<OnboardingChecklist>(`${ONBOARDING_ENDPOINT}/${id}`)
  }

  async create(data: OnboardingCreateRequest): Promise<OnboardingChecklist> {
    return apiService.post<OnboardingChecklist>(ONBOARDING_ENDPOINT, data)
  }

  async update(id: string, data: Partial<OnboardingCreateRequest>): Promise<OnboardingChecklist> {
    return apiService.put<OnboardingChecklist>(`${ONBOARDING_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${ONBOARDING_ENDPOINT}/${id}`)
  }
}
