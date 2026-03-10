import type { FeatureModule } from '@/core/types'

const Projects = () => import('@/modules/projects/pages/Projects.vue')
const ProjectDetail = () => import('@/modules/projects/pages/ProjectDetail.vue')
const ProjectForm = () => import('@/modules/projects/pages/ProjectForm.vue')

export const projectsModule: FeatureModule = {
  id: 'projects',
  name: 'Projects',
  dependencies: ['clients'],
  routes: [
    {
      path: 'projects',
      name: 'projects',
      component: Projects,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projects' }] }
    },
    {
      path: 'projects/:id',
      name: 'project-detail',
      component: ProjectDetail,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projects', to: '/projects' }] }
    },
    {
      path: 'projects/:id/edit',
      name: 'project-edit',
      component: ProjectForm,
      meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projects', to: '/projects' }] }
    }
  ],
  navItems: [
    {
      label: 'WORK',
      items: [
        { name: 'Projects', href: '/projects', icon: 'BriefcaseIcon' }
      ]
    }
  ]
}
