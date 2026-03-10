import type { FeatureModule } from '@/core/types'

const Settings = () => import('@/modules/settings/pages/Settings.vue')
const Profile = () => import('@/modules/settings/pages/Profile.vue')

export const settingsModule: FeatureModule = {
  id: 'settings',
  name: 'Settings',
  routes: [
    {
      path: 'settings',
      name: 'settings',
      component: Settings,
      meta: { requiresAuth: true, requiredRole: 'admin', breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }] }
    },
    {
      path: 'profile',
      name: 'profile',
      component: Profile,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }] }
    }
  ],
  navItems: [
    {
      label: 'ADMIN',
      items: [
        { name: 'Settings', href: '/settings', icon: 'CogIcon' }
      ]
    }
  ]
}
