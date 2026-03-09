import type { FeatureModule } from '@/core/types'

const Invoices = () => import('@/pages/Invoices.vue')
const InvoiceBuilder = () => import('@/pages/InvoiceBuilder.vue')

export const invoicesModule: FeatureModule = {
  id: 'invoices',
  name: 'Invoices',
  dependencies: ['clients'],
  routes: [
    {
      path: 'invoices',
      name: 'invoices',
      component: Invoices,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices' }] }
    },
    {
      path: 'invoices/new',
      name: 'invoice-new',
      component: InvoiceBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }, { label: 'New Invoice' }] }
    },
    {
      path: 'invoices/:id',
      name: 'invoice-detail',
      component: InvoiceBuilder,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }, { label: 'Edit Invoice' }] },
      props: true
    }
  ],
  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Invoices', href: '/invoices', icon: 'CurrencyDollarIcon' }
      ]
    }
  ]
}
