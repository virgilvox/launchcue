import type { FeatureModule } from '@/core/types'

const Notes = () => import('@/pages/Notes.vue')

export const notesModule: FeatureModule = {
  id: 'notes',
  name: 'Notes',
  routes: [
    {
      path: 'notes',
      name: 'notes',
      component: Notes,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notes' }] }
    }
  ],
  navItems: [
    {
      label: 'KNOWLEDGE',
      items: [
        { name: 'Notes', href: '/notes', icon: 'DocumentTextIcon' }
      ]
    }
  ]
}
