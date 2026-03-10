import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { PluginRegistry } from '@/core/plugin-registry'

// Module augmentation for route meta
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    portalOnly?: boolean
    requiredRole?: 'owner' | 'admin'
    breadcrumbs?: Array<{ label: string; to?: string }>
  }
}

// Layouts
const DefaultLayout = () => import('../layouts/DefaultLayout.vue')
const AuthLayout = () => import('../layouts/AuthLayout.vue')

// Auth Pages
const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')

// Dashboard (always registered — not part of any feature module)
const Home = () => import('../pages/Home.vue')
const Dashboard = () => import('../modules/dashboard/pages/Dashboard.vue')

/**
 * Static routes that are always present regardless of registered modules.
 */
function getStaticRoutes(): RouteRecordRaw[] {
  return [
    // Public / auth routes
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

    // Client invitation accept page (no auth required)
    {
      path: '/invite/:token',
      name: 'accept-invite',
      component: () => import('../pages/auth/AcceptInvite.vue'),
      meta: { requiresAuth: false }
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

    // 404 route (must be last)
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../pages/NotFound.vue')
    }
  ]
}

/**
 * Create the app router with dynamic routes from the plugin registry.
 */
export function createAppRouter(registry: PluginRegistry) {
  // Collect dynamic routes from registered modules
  const moduleRoutes = registry.getRoutes()

  // Build the DefaultLayout route with dashboard + module children
  const appRoute: RouteRecordRaw = {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: { requiresAuth: true, breadcrumbs: [{ label: 'Dashboard' }] }
      },
      // Spread all module routes as children of DefaultLayout
      ...moduleRoutes
    ]
  }

  const staticRoutes = getStaticRoutes()

  // Insert app route before the 404 catch-all (which is last)
  const routes: RouteRecordRaw[] = [
    ...staticRoutes.slice(0, -1), // everything except 404
    appRoute,
    staticRoutes[staticRoutes.length - 1] // 404 last
  ]

  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
  })

  // Navigation guards
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const isPortalRoute = to.matched.some(record => record.meta.portalOnly)
    const isClientRole = authStore.user?.role === 'client'

    if (requiresAuth && !authStore.isAuthenticated) {
      next('/login')
    } else if (requiresAuth && authStore.isAuthenticated && !authStore.currentTeam && to.path !== '/dashboard') {
      // No team context — redirect to dashboard which can handle the empty state
      next('/dashboard')
    } else if (isClientRole && !isPortalRoute && to.path !== '/login' && to.path !== '/') {
      next('/portal')
    } else if (!isClientRole && isPortalRoute) {
      next('/dashboard')
    } else {
      // Role-based route guard
      const requiredRole = to.matched.find(record => record.meta.requiredRole)?.meta.requiredRole
      if (requiredRole) {
        const userRole = authStore.userRole
        const allowed = requiredRole === 'admin'
          ? ['owner', 'admin'].includes(userRole as string)
          : userRole === 'owner'
        if (!allowed) {
          next({ path: '/dashboard', query: { accessDenied: '1' } })
        } else {
          next()
        }
      } else {
        next()
      }
    }
  })

  return router
}

// Legacy default export for backward compatibility during migration
// Components that import `router` directly will still work
import { getPluginRegistry } from '@/core/plugin-registry'

let _router: ReturnType<typeof createRouter> | null = null

export function getRouter() {
  if (!_router) {
    _router = createAppRouter(getPluginRegistry())
  }
  return _router
}

// Default export for components that `import router from '@/router'`
// This creates a proxy that defers to the actual router instance
export default new Proxy({} as ReturnType<typeof createRouter>, {
  get(_target, prop) {
    return (getRouter() as unknown as Record<string | symbol, unknown>)[prop]
  }
})
