import type { FeatureModule } from '@/core/types'

const Clients = () => import('@/pages/Clients.vue')
const ClientDetail = () => import('@/pages/ClientDetail.vue')
const ProjectForm = () => import('@/pages/ProjectForm.vue')

export const clientsModule: FeatureModule = {
  id: 'clients',
  name: 'Clients',
  routes: [
    {
      path: 'clients',
      name: 'clients',
      component: Clients,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Clients' }] }
    },
    {
      path: 'clients/:id',
      name: 'client-detail',
      component: ClientDetail,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Clients', to: '/clients' }] }
    },
    {
      path: 'clients/:clientId/projects/new',
      name: 'new-client-project',
      component: ProjectForm,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Clients', to: '/clients' }] }
    }
  ],
  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Clients', href: '/clients', icon: 'UsersIcon' }
      ]
    }
  ]
}
