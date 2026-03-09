import type { FeatureModule } from '@/core/types'

export const notificationsModule: FeatureModule = {
  id: 'notifications',
  name: 'Notifications',
  // No routes or nav — notifications are a cross-cutting concern
  // rendered in the DefaultLayout header via the notification store
}
