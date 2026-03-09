/** Symbol keys for service container registration */

// Entity repositories
export const TASK_REPO = Symbol('TaskRepository')
export const PROJECT_REPO = Symbol('ProjectRepository')
export const CLIENT_REPO = Symbol('ClientRepository')
export const CAMPAIGN_REPO = Symbol('CampaignRepository')
export const CALENDAR_EVENT_REPO = Symbol('CalendarEventRepository')
export const NOTE_REPO = Symbol('NoteRepository')
export const RESOURCE_REPO = Symbol('ResourceRepository')
export const BRAIN_DUMP_REPO = Symbol('BrainDumpRepository')
export const SCOPE_REPO = Symbol('ScopeRepository')
export const SCOPE_TEMPLATE_REPO = Symbol('ScopeTemplateRepository')
export const INVOICE_REPO = Symbol('InvoiceRepository')
export const TEAM_REPO = Symbol('TeamRepository')
export const ONBOARDING_REPO = Symbol('OnboardingRepository')
export const API_KEY_REPO = Symbol('ApiKeyRepository')
export const WEBHOOK_REPO = Symbol('WebhookRepository')
export const CLIENT_INVITATION_REPO = Symbol('ClientInvitationRepository')

// Non-entity adapters
export const AUTH_ADAPTER = Symbol('AuthAdapter')
export const SEARCH_ADAPTER = Symbol('SearchAdapter')
export const AI_ADAPTER = Symbol('AiAdapter')
export const COMMENT_REPO = Symbol('CommentRepository')
export const NOTIFICATION_REPO = Symbol('NotificationRepository')
