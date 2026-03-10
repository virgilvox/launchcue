import type { ServiceContainer } from '@/core/types'
import {
  TASK_REPO, PROJECT_REPO, CLIENT_REPO, CAMPAIGN_REPO,
  CALENDAR_EVENT_REPO, NOTE_REPO, RESOURCE_REPO, BRAIN_DUMP_REPO,
  SCOPE_REPO, SCOPE_TEMPLATE_REPO, INVOICE_REPO, TEAM_REPO,
  ONBOARDING_REPO, API_KEY_REPO, WEBHOOK_REPO, CLIENT_INVITATION_REPO,
  AUDIT_LOG_REPO,
  AUTH_ADAPTER, SEARCH_ADAPTER, AI_ADAPTER, COMMENT_REPO, NOTIFICATION_REPO
} from '../repository-keys'

import { SupabaseTaskRepository } from './task.repository'
import { SupabaseProjectRepository } from './project.repository'
import { SupabaseClientRepository } from './client.repository'
import { SupabaseCampaignRepository } from './campaign.repository'
import { SupabaseCalendarEventRepository } from './calendar-event.repository'
import { SupabaseNoteRepository } from './note.repository'
import { SupabaseResourceRepository } from './resource.repository'
import { SupabaseBrainDumpRepository } from './brain-dump.repository'
import { SupabaseScopeRepository } from './scope.repository'
import { SupabaseScopeTemplateRepository } from './scope-template.repository'
import { SupabaseInvoiceRepository } from './invoice.repository'
import { SupabaseTeamRepository } from './team.repository'
import { SupabaseOnboardingRepository } from './onboarding.repository'
import { SupabaseApiKeyRepository } from './api-key.repository'
import { SupabaseWebhookRepository } from './webhook.repository'
import { SupabaseClientInvitationRepository } from './client-invitation.repository'
import { SupabaseAuthAdapter } from './auth.adapter'
import { SupabaseSearchAdapter } from './search.adapter'
import { SupabaseAiAdapter } from './ai.adapter'
import { SupabaseCommentRepository } from './comment.repository'
import { SupabaseNotificationRepository } from './notification.repository'
import { SupabaseAuditLogRepository } from './audit-log.repository'

/**
 * Register all Supabase/PostgreSQL adapters into the service container.
 */
export function registerSupabaseAdapters(container: ServiceContainer): void {
  // Entity repositories
  container.register(TASK_REPO, () => new SupabaseTaskRepository())
  container.register(PROJECT_REPO, () => new SupabaseProjectRepository())
  container.register(CLIENT_REPO, () => new SupabaseClientRepository())
  container.register(CAMPAIGN_REPO, () => new SupabaseCampaignRepository())
  container.register(CALENDAR_EVENT_REPO, () => new SupabaseCalendarEventRepository())
  container.register(NOTE_REPO, () => new SupabaseNoteRepository())
  container.register(RESOURCE_REPO, () => new SupabaseResourceRepository())
  container.register(BRAIN_DUMP_REPO, () => new SupabaseBrainDumpRepository())
  container.register(SCOPE_REPO, () => new SupabaseScopeRepository())
  container.register(SCOPE_TEMPLATE_REPO, () => new SupabaseScopeTemplateRepository())
  container.register(INVOICE_REPO, () => new SupabaseInvoiceRepository())
  container.register(TEAM_REPO, () => new SupabaseTeamRepository())
  container.register(ONBOARDING_REPO, () => new SupabaseOnboardingRepository())
  container.register(API_KEY_REPO, () => new SupabaseApiKeyRepository())
  container.register(WEBHOOK_REPO, () => new SupabaseWebhookRepository())
  container.register(CLIENT_INVITATION_REPO, () => new SupabaseClientInvitationRepository())
  container.register(AUDIT_LOG_REPO, () => new SupabaseAuditLogRepository())

  // Non-entity adapters
  container.register(AUTH_ADAPTER, () => new SupabaseAuthAdapter())
  container.register(SEARCH_ADAPTER, () => new SupabaseSearchAdapter())
  container.register(AI_ADAPTER, () => new SupabaseAiAdapter())
  container.register(COMMENT_REPO, () => new SupabaseCommentRepository())
  container.register(NOTIFICATION_REPO, () => new SupabaseNotificationRepository())
}
