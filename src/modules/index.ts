/**
 * Central module registry — imports all feature modules and exports
 * a function to register them with the plugin registry.
 */
import type { PluginRegistry } from '@/core/plugin-registry'

import { dashboardModule } from './dashboard'
import { tasksModule } from './tasks'
import { projectsModule } from './projects'
import { clientsModule } from './clients'
import { campaignsModule } from './campaigns'
import { calendarModule } from './calendar'
import { notesModule } from './notes'
import { resourcesModule } from './resources'
import { brainDumpModule } from './brain-dump'
import { scopesModule } from './scopes'
import { invoicesModule } from './invoices'
import { onboardingModule } from './onboarding'
import { settingsModule } from './settings'
import { teamModule } from './team'
import { notificationsModule } from './notifications'

export function registerAllModules(registry: PluginRegistry): void {
  // Order matters for nav group ordering (first registered = first displayed).
  // Dependencies are resolved by topological sort, but nav order follows registration.

  // Dashboard (registered as module but nav handled by Sidebar.vue)
  registry.register(dashboardModule)

  // CORE group
  registry.register(tasksModule)
  registry.register(calendarModule)

  // WORK group
  registry.register(clientsModule)
  registry.register(projectsModule)
  registry.register(campaignsModule)
  registry.register(scopesModule)
  registry.register(invoicesModule)

  // KNOWLEDGE group
  registry.register(notesModule)
  registry.register(brainDumpModule)
  registry.register(resourcesModule)

  // ADMIN group
  registry.register(teamModule)
  registry.register(settingsModule)

  // Cross-cutting (no nav/routes)
  registry.register(onboardingModule)
  registry.register(notificationsModule)
}
