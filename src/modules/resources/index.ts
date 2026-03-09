import type { FeatureModule } from '@/core/types'

const Resources = () => import('@/pages/Resources.vue')

export const resourcesModule: FeatureModule = {
  id: 'resources',
  name: 'Resources',
  routes: [
    {
      path: 'resources',
      name: 'resources',
      component: Resources,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Resources' }] }
    }
  ],
  navItems: [
    {
      label: 'KNOWLEDGE',
      items: [
        { name: 'Resources', href: '/resources', icon: 'FolderOpenIcon' }
      ]
    }
  ]
}
