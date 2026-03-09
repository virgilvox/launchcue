import type { FeatureModule } from '@/core/types'

const Tasks = () => import('@/pages/Tasks.vue')
const TaskDetail = () => import('@/pages/TaskDetail.vue')

export const tasksModule: FeatureModule = {
  id: 'tasks',
  name: 'Tasks',
  routes: [
    {
      path: 'tasks',
      name: 'tasks',
      component: Tasks,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Tasks' }] }
    },
    {
      path: 'tasks/:id',
      name: 'task-detail',
      component: TaskDetail,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Tasks', to: '/tasks' }] },
      props: true
    }
  ],
  navItems: [
    {
      label: 'CORE',
      items: [
        { name: 'Tasks', href: '/tasks', icon: 'ChartBarSquareIcon' }
      ]
    }
  ]
}
