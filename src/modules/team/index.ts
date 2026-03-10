import type { FeatureModule } from '@/core/types'

const Team = () => import('@/modules/team/pages/Team.vue')

export const teamModule: FeatureModule = {
  id: 'team',
  name: 'Team',
  routes: [
    {
      path: 'team',
      name: 'team',
      component: Team,
      meta: { requiresAuth: true, requiredRole: 'admin', breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Team' }] }
    }
  ],
  navItems: [
    {
      label: 'ADMIN',
      items: [
        { name: 'Team', href: '/team', icon: 'UserGroupIcon' }
      ]
    }
  ]
}
