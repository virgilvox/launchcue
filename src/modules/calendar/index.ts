import type { FeatureModule } from '@/core/types'

const Calendar = () => import('@/modules/calendar/pages/Calendar.vue')

export const calendarModule: FeatureModule = {
  id: 'calendar',
  name: 'Calendar',
  routes: [
    {
      path: 'calendar',
      name: 'calendar',
      component: Calendar,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Calendar' }] }
    }
  ],
  navItems: [
    {
      label: 'CORE',
      items: [
        { name: 'Calendar', href: '/calendar', icon: 'CalendarIcon' }
      ]
    }
  ]
}
