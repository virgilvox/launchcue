import type { FeatureModule } from '@/core/types'

const Dashboard = () => import('@/modules/dashboard/pages/Dashboard.vue')

export const dashboardModule: FeatureModule = {
  id: 'dashboard',
  name: 'Dashboard',
  routes: [
    {
      path: 'dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard' }] }
    }
  ],
  // Dashboard nav item is hardcoded in Sidebar.vue, so no navItems needed here
  navItems: []
}
