import type { ServiceContainer } from '@/core/types'
import {
  TASK_REPO, PROJECT_REPO, CLIENT_REPO, CAMPAIGN_REPO,
  CALENDAR_EVENT_REPO, NOTE_REPO, RESOURCE_REPO, BRAIN_DUMP_REPO,
  SCOPE_REPO, SCOPE_TEMPLATE_REPO, INVOICE_REPO, TEAM_REPO,
  ONBOARDING_REPO, API_KEY_REPO, WEBHOOK_REPO, CLIENT_INVITATION_REPO,
  AUTH_ADAPTER, SEARCH_ADAPTER, AI_ADAPTER, COMMENT_REPO, NOTIFICATION_REPO
} from '../repository-keys'

import { NetlifyTaskRepository } from './task.repository'
import { NetlifyProjectRepository } from './project.repository'
import { NetlifyClientRepository } from './client.repository'
import { NetlifyCampaignRepository } from './campaign.repository'
import { NetlifyCalendarEventRepository } from './calendar-event.repository'
import { NetlifyNoteRepository } from './note.repository'
import { NetlifyResourceRepository } from './resource.repository'
import { NetlifyBrainDumpRepository } from './brain-dump.repository'
import { NetlifyScopeRepository } from './scope.repository'
import { NetlifyScopeTemplateRepository } from './scope-template.repository'
import { NetlifyInvoiceRepository } from './invoice.repository'
import { NetlifyTeamRepository } from './team.repository'
import { NetlifyOnboardingRepository } from './onboarding.repository'
import { NetlifyApiKeyRepository } from './api-key.repository'
import { NetlifyWebhookRepository } from './webhook.repository'
import { NetlifyClientInvitationRepository } from './client-invitation.repository'
import { NetlifyAuthAdapter } from './auth.adapter'
import { NetlifySearchAdapter } from './search.adapter'
import { NetlifyAiAdapter } from './ai.adapter'
import { NetlifyCommentRepository } from './comment.repository'
import { NetlifyNotificationRepository } from './notification.repository'

/**
 * Register all Netlify/MongoDB adapters into the service container.
 * This is the single import to swap when migrating to Supabase.
 */
export function registerNetlifyAdapters(container: ServiceContainer): void {
  // Entity repositories
  container.register(TASK_REPO, () => new NetlifyTaskRepository())
  container.register(PROJECT_REPO, () => new NetlifyProjectRepository())
  container.register(CLIENT_REPO, () => new NetlifyClientRepository())
  container.register(CAMPAIGN_REPO, () => new NetlifyCampaignRepository())
  container.register(CALENDAR_EVENT_REPO, () => new NetlifyCalendarEventRepository())
  container.register(NOTE_REPO, () => new NetlifyNoteRepository())
  container.register(RESOURCE_REPO, () => new NetlifyResourceRepository())
  container.register(BRAIN_DUMP_REPO, () => new NetlifyBrainDumpRepository())
  container.register(SCOPE_REPO, () => new NetlifyScopeRepository())
  container.register(SCOPE_TEMPLATE_REPO, () => new NetlifyScopeTemplateRepository())
  container.register(INVOICE_REPO, () => new NetlifyInvoiceRepository())
  container.register(TEAM_REPO, () => new NetlifyTeamRepository())
  container.register(ONBOARDING_REPO, () => new NetlifyOnboardingRepository())
  container.register(API_KEY_REPO, () => new NetlifyApiKeyRepository())
  container.register(WEBHOOK_REPO, () => new NetlifyWebhookRepository())
  container.register(CLIENT_INVITATION_REPO, () => new NetlifyClientInvitationRepository())

  // Non-entity adapters
  container.register(AUTH_ADAPTER, () => new NetlifyAuthAdapter())
  container.register(SEARCH_ADAPTER, () => new NetlifySearchAdapter())
  container.register(AI_ADAPTER, () => new NetlifyAiAdapter())
  container.register(COMMENT_REPO, () => new NetlifyCommentRepository())
  container.register(NOTIFICATION_REPO, () => new NetlifyNotificationRepository())
}
