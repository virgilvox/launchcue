import type { FeatureModule } from '@/core/types'

const CampaignsList = () => import('@/pages/CampaignsList.vue')
const CampaignsBuilder = () => import('@/pages/Campaigns.vue')

export const campaignsModule: FeatureModule = {
  id: 'campaigns',
  name: 'Campaigns',
  dependencies: ['clients', 'projects'],
  routes: [
    {
      path: 'campaigns',
      name: 'campaigns-list',
      component: CampaignsList,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Campaigns' }] }
    },
    {
      path: 'campaigns/new',
      name: 'campaign-new',
      component: CampaignsBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Campaigns', to: '/campaigns' }] }
    },
    {
      path: 'campaigns/:id',
      name: 'campaign-detail',
      component: CampaignsBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Campaigns', to: '/campaigns' }] },
      props: true
    }
  ],
  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Campaigns', href: '/campaigns', icon: 'SparklesIcon' }
      ]
    }
  ]
}
