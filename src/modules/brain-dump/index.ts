import type { FeatureModule } from '@/core/types'

const BrainDump = () => import('@/modules/brain-dump/pages/BrainDump.vue')

export const brainDumpModule: FeatureModule = {
  id: 'brain-dump',
  name: 'Brain Dump',
  routes: [
    {
      path: 'brain-dump',
      name: 'braindump',
      component: BrainDump,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Brain Dump' }] }
    }
  ],
  navItems: [
    {
      label: 'KNOWLEDGE',
      items: [
        { name: 'Brain Dump', href: '/brain-dump', icon: 'LightBulbIcon' }
      ]
    }
  ]
}
