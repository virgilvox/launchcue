import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { initContainer } from '@/core/service-container'
import { initEventBus } from '@/core/event-bus'
import { AUTH_ADAPTER } from '@/adapters/repository-keys'
import { createMockAuthAdapter, makeUser, makeTeamSummary } from '../helpers/mock-factories'
import { seedAuth } from '../helpers/store-setup'
import { useAuthStore } from '@/stores/auth'

// Mock the router default export used by the auth store (avoids circular PluginRegistry dep)
vi.mock('@/router/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/router/index')>()
  return {
    ...actual,
    default: { push: vi.fn() },
    getRouter: vi.fn(() => ({ push: vi.fn() })),
  }
})

/**
 * Recreate the navigation guard logic from src/router/index.ts (lines 144-176)
 * in a standalone router so we can test guard behavior without importing
 * the full createAppRouter (which needs real PluginRegistry + layout components).
 */
function buildTestRouter(extraRoutes: RouteRecordRaw[] = []): Router {
  const Stub = { template: '<div/>' }

  const routes: RouteRecordRaw[] = [
    // Public routes (no requiresAuth)
    { path: '/', name: 'home', component: Stub },
    { path: '/login', name: 'login', component: Stub },
    { path: '/register', name: 'register', component: Stub },

    // Portal routes (requiresAuth + portalOnly)
    { path: '/portal', name: 'portal-dashboard', component: Stub, meta: { requiresAuth: true, portalOnly: true } },

    // Standard auth routes
    { path: '/dashboard', name: 'dashboard', component: Stub, meta: { requiresAuth: true } },
    { path: '/tasks', name: 'tasks', component: Stub, meta: { requiresAuth: true } },

    // Role-restricted routes
    { path: '/settings', name: 'settings', component: Stub, meta: { requiresAuth: true, requiredRole: 'admin' as const } },
    { path: '/admin-only', name: 'admin-only', component: Stub, meta: { requiresAuth: true, requiredRole: 'owner' as const } },

    ...extraRoutes,
  ]

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  })

  // Replicate the guard from src/router/index.ts
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
    const isPortalRoute = to.matched.some(record => record.meta.portalOnly)
    const isClientRole = authStore.user?.role === 'client'

    if (requiresAuth && !authStore.isAuthenticated) {
      next('/login')
    } else if (requiresAuth && authStore.isAuthenticated && !authStore.currentTeam && to.path !== '/dashboard') {
      next('/dashboard')
    } else if (isClientRole && !isPortalRoute && to.path !== '/login' && to.path !== '/') {
      next('/portal')
    } else if (!isClientRole && isPortalRoute) {
      next('/dashboard')
    } else {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Set up Pinia + DI + mock auth adapter, seed sessionStorage, create the auth store. */
function setupAuth(opts: {
  role?: string
  withTeam?: boolean
  authenticated?: boolean
} = {}) {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const container = initContainer()
  initEventBus()
  container.register(AUTH_ADAPTER, () => createMockAuthAdapter())

  const authenticated = opts.authenticated ?? true

  if (authenticated) {
    const role = opts.role ?? 'owner'
    const team = makeTeamSummary({ role })
    const user = makeUser({ role })
    const withTeam = opts.withTeam ?? true

    if (withTeam) {
      seedAuth({ user, teams: [team], currentTeam: team })
    } else {
      // Seed user but no team — set sessionStorage manually to avoid seedAuth's
      // fallback of currentTeam = teams[0] which produces 'undefined' when teams is empty.
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const fakeToken = `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ exp: futureExp, sub: 'user-1' }))}.fake`
      sessionStorage.setItem('token', fakeToken)
      sessionStorage.setItem('user', JSON.stringify(user))
      sessionStorage.setItem('teams', JSON.stringify([]))
      // Do NOT set currentTeam — store will read null
    }

    // Create the store (reads user/currentTeam from sessionStorage)
    const authStore = useAuthStore()
    // token is NOT read from sessionStorage by the store constructor — set it manually
    authStore.token = 'test-token'

    return authStore
  } else {
    // Unauthenticated: no sessionStorage data, token stays null
    const authStore = useAuthStore()
    return authStore
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Router navigation guards', () => {
  let router: Router

  describe('authentication checks', () => {
    it('redirects unauthenticated user to /login for auth-required routes', async () => {
      setupAuth({ authenticated: false })
      router = buildTestRouter()
      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('allows unauthenticated user to access public routes', async () => {
      setupAuth({ authenticated: false })
      router = buildTestRouter()
      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('allows unauthenticated user to access home (/)', async () => {
      setupAuth({ authenticated: false })
      router = buildTestRouter()
      await router.push('/')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('team context checks', () => {
    it('redirects to /dashboard when authenticated but no current team', async () => {
      setupAuth({ role: 'owner', withTeam: false })
      router = buildTestRouter()
      await router.push('/tasks')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('allows navigation to /dashboard even without a team', async () => {
      setupAuth({ role: 'owner', withTeam: false })
      router = buildTestRouter()
      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('client role restrictions', () => {
    it('redirects client to /portal from non-portal auth routes', async () => {
      setupAuth({ role: 'client' })
      router = buildTestRouter()
      await router.push('/dashboard')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/portal')
    })

    it('allows client to access portal routes', async () => {
      setupAuth({ role: 'client' })
      router = buildTestRouter()
      await router.push('/portal')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/portal')
    })

    it('allows client to access /login without redirect', async () => {
      setupAuth({ role: 'client' })
      router = buildTestRouter()
      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/login')
    })

    it('allows client to access / without redirect', async () => {
      setupAuth({ role: 'client' })
      router = buildTestRouter()
      await router.push('/')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('portal route blocking for non-clients', () => {
    it('redirects non-client users from portal to /dashboard', async () => {
      setupAuth({ role: 'owner' })
      router = buildTestRouter()
      await router.push('/portal')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })

    it('redirects member from portal to /dashboard', async () => {
      setupAuth({ role: 'member' })
      router = buildTestRouter()
      await router.push('/portal')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
    })
  })

  describe('role-based route access (requiredRole: admin)', () => {
    it('allows owner to access admin-required routes', async () => {
      setupAuth({ role: 'owner' })
      router = buildTestRouter()
      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/settings')
    })

    it('allows admin to access admin-required routes', async () => {
      setupAuth({ role: 'admin' })
      router = buildTestRouter()
      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/settings')
    })

    it('denies member access to admin-required routes with accessDenied query', async () => {
      setupAuth({ role: 'member' })
      router = buildTestRouter()
      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
      expect(router.currentRoute.value.query).toEqual({ accessDenied: '1' })
    })

    it('denies viewer access to admin-required routes', async () => {
      setupAuth({ role: 'viewer' })
      router = buildTestRouter()
      await router.push('/settings')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
      expect(router.currentRoute.value.query).toEqual({ accessDenied: '1' })
    })
  })

  describe('role-based route access (requiredRole: owner)', () => {
    it('allows owner to access owner-only routes', async () => {
      setupAuth({ role: 'owner' })
      router = buildTestRouter()
      await router.push('/admin-only')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/admin-only')
    })

    it('denies admin access to owner-only routes', async () => {
      setupAuth({ role: 'admin' })
      router = buildTestRouter()
      await router.push('/admin-only')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
      expect(router.currentRoute.value.query).toEqual({ accessDenied: '1' })
    })

    it('denies member access to owner-only routes', async () => {
      setupAuth({ role: 'member' })
      router = buildTestRouter()
      await router.push('/admin-only')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/dashboard')
      expect(router.currentRoute.value.query).toEqual({ accessDenied: '1' })
    })
  })

  describe('normal navigation (authenticated with team)', () => {
    it('allows owner to navigate to standard auth routes', async () => {
      setupAuth({ role: 'owner' })
      router = buildTestRouter()
      await router.push('/tasks')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/tasks')
    })

    it('allows member to navigate to standard auth routes', async () => {
      setupAuth({ role: 'member' })
      router = buildTestRouter()
      await router.push('/tasks')
      await router.isReady()

      expect(router.currentRoute.value.path).toBe('/tasks')
    })
  })
})
