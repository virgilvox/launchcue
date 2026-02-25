import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Module augmentation for route meta
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    portalOnly?: boolean
    breadcrumbs?: Array<{ label: string; to?: string }>
  }
}

// Layouts
const DefaultLayout = () => import('../layouts/DefaultLayout.vue')
const AuthLayout = () => import('../layouts/AuthLayout.vue')

// Auth Pages
const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')

// App Pages
const Home = () => import('../pages/Home.vue')
const Dashboard = () => import('../pages/Dashboard.vue')
const BrainDump = () => import('../pages/BrainDump.vue')
const Calendar = () => import('../pages/Calendar.vue')
const Clients = () => import('../pages/Clients.vue')
const ClientDetail = () => import('../pages/ClientDetail.vue')
const Projects = () => import('../pages/Projects.vue')
const ProjectDetail = () => import('../pages/ProjectDetail.vue')
const Tasks = () => import('../pages/Tasks.vue')
const CampaignsList = () => import('../pages/CampaignsList.vue')
const CampaignsBuilder = () => import('../pages/Campaigns.vue')
const CampaignDetail = () => import('../pages/CampaignDetail.vue')
const Team = () => import('../pages/Team.vue')
const Notes = () => import('../pages/Notes.vue')
const Resources = () => import('../pages/Resources.vue')
const Settings = () => import('../pages/Settings.vue')
const TaskDetail = () => import('../pages/TaskDetail.vue')

const routes: RouteRecordRaw[] = [
  // Auth routes (no layout)
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'login',
    component: Login
  },
  {
    path: '/register',
    name: 'register',
    component: Register
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../pages/auth/ForgotPassword.vue')
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../pages/auth/ResetPassword.vue')
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../pages/auth/VerifyEmail.vue')
  },

  // App routes (with DefaultLayout)
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard' }] }
      },
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
        component: () => import('../pages/ProjectForm.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Projects', to: '/projects' }] }
      },
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
        component: () => import('../pages/ProjectForm.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Clients', to: '/clients' }] }
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: Calendar,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Calendar' }] }
      },
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
      },
      {
        path: 'team',
        name: 'team',
        component: Team,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Team' }] }
      },
      {
        path: 'notes',
        name: 'notes',
        component: Notes,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notes' }] }
      },
      {
        path: 'resources',
        name: 'resources',
        component: Resources,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Resources' }] }
      },
      {
        path: 'brain-dump',
        name: 'braindump',
        component: BrainDump,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Brain Dump' }] }
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../pages/Profile.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Profile' }] }
      },
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
      },
      {
        path: 'scopes',
        name: 'scopes',
        component: () => import('../pages/ScopeTemplates.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes' }] }
      },
      {
        path: 'scopes/new',
        name: 'scope-new',
        component: () => import('../pages/ScopeBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'New Scope' }] }
      },
      {
        path: 'scopes/:id',
        name: 'scope-detail',
        component: () => import('../pages/ScopeBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'Edit Scope' }] },
        props: true
      },
      {
        path: 'scope-templates/new',
        name: 'scope-template-new',
        component: () => import('../pages/ScopeBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'New Template' }] }
      },
      {
        path: 'scope-templates/:id',
        name: 'scope-template-detail',
        component: () => import('../pages/ScopeBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Scopes', to: '/scopes' }, { label: 'Edit Template' }] },
        props: true
      },
      {
        path: 'invoices',
        name: 'invoices',
        component: () => import('../pages/Invoices.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices' }] }
      },
      {
        path: 'invoices/new',
        name: 'invoice-new',
        component: () => import('../pages/InvoiceBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }, { label: 'New Invoice' }] }
      },
      {
        path: 'invoices/:id',
        name: 'invoice-detail',
        component: () => import('../pages/InvoiceBuilder.vue'),
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Invoices', to: '/invoices' }, { label: 'Edit Invoice' }] },
        props: true
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }] }
      }
    ]
  },

  // Client Portal routes (with ClientLayout)
  {
    path: '/portal',
    component: () => import('../layouts/ClientLayout.vue'),
    children: [
      {
        path: '',
        name: 'portal-dashboard',
        component: () => import('../pages/client-portal/PortalDashboard.vue'),
        meta: { requiresAuth: true, portalOnly: true }
      },
      {
        path: 'projects/:id',
        name: 'portal-project',
        component: () => import('../pages/client-portal/PortalProject.vue'),
        meta: { requiresAuth: true, portalOnly: true },
        props: true
      },
      {
        path: 'onboarding/:id',
        name: 'portal-onboarding',
        component: () => import('../pages/client-portal/PortalOnboarding.vue'),
        meta: { requiresAuth: true, portalOnly: true },
        props: true
      }
    ]
  },

  // Client invitation accept page (no auth required)
  {
    path: '/invite/:token',
    name: 'accept-invite',
    component: () => import('../pages/auth/AcceptInvite.vue'),
    meta: { requiresAuth: false }
  },

  // 404 route
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guards
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isPortalRoute = to.matched.some(record => record.meta.portalOnly)
  const isClientRole = authStore.user?.role === 'client'

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (isClientRole && !isPortalRoute && to.path !== '/login' && to.path !== '/') {
    // Client users can only access portal routes
    next('/portal')
  } else if (!isClientRole && isPortalRoute) {
    // Non-client users shouldn't access portal routes
    next('/dashboard')
  } else {
    next()
  }
})

export default router
