import type { OnboardingChecklist } from '@/types/models'
import type { OnboardingCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseOnboardingRepository extends SupabaseBaseRepository<OnboardingChecklist, OnboardingCreateRequest, Partial<OnboardingChecklist>> {
  constructor() {
    super('onboarding_checklists', 'active_onboarding_checklists', {
      teamId: 'team_id',
      clientId: 'client_id',
      projectId: 'project_id',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): OnboardingChecklist {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      clientId: row.client_id as string,
      projectId: row.project_id as string | null,
      title: row.title as string,
      steps: (row.steps as OnboardingChecklist['steps']) || [],
      status: row.status as OnboardingChecklist['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
