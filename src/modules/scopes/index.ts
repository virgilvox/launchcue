import type { FeatureModule } from '@/core/types'

const ScopeTemplates = () => import('@/pages/ScopeTemplates.vue')
const ScopeBuilder = () => import('@/pages/ScopeBuilder.vue')

export const scopesModule: FeatureModule = {
  id: 'scopes',
  name: 'Scopes',
  dependencies: ['clients', 'projects'],
  routes: [
    {
      path: 'scopes',
      name: 'scopes',
      component: ScopeTemplates,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes' }] }
    },
    {
      path: 'scopes/new',
      name: 'scope-new',
      component: ScopeBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'New Scope' }] }
    },
    {
      path: 'scopes/:id',
      name: 'scope-detail',
      component: ScopeBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'Edit Scope' }] },
      props: true
    },
    {
      path: 'scope-templates/new',
      name: 'scope-template-new',
      component: ScopeBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'New Template' }] }
    },
    {
      path: 'scope-templates/:id',
      name: 'scope-template-detail',
      component: ScopeBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'Edit Template' }] },
      props: true
    }
  ],
  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Scopes', href: '/scopes', icon: 'ClipboardDocumentListIcon' }
      ]
    }
  ]
}
