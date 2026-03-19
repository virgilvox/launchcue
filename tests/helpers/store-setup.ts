import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { initContainer, getContainer } from '@/core/service-container'
import { initEventBus } from '@/core/event-bus'
import { AUTH_ADAPTER } from '@/adapters/repository-keys'
import { createMockAuthAdapter, makeJwt, makeUser, makeTeamSummary } from './mock-factories'
import type { AuthAdapter } from '@/adapters/types'

interface StoreRegistration {
  key: symbol
  factory: () => unknown
}

/**
 * Set up Pinia + DI container + mock registrations for store tests.
 * Returns the container, event bus, and a pre-configured mock auth adapter.
 */
export function setupStoreTest(registrations: StoreRegistration[] = []) {
  sessionStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)

  const container = initContainer()
  const eventBus = initEventBus()

  const mockAuth = createMockAuthAdapter()
  container.register(AUTH_ADAPTER, () => mockAuth)

  for (const { key, factory } of registrations) {
    container.register(key, factory)
  }

  return { container, eventBus, mockAuth, pinia }
}

/**
 * Pre-authenticate sessionStorage for store tests.
 * Seeds user, teams, and currentTeam metadata in sessionStorage.
 * Also configures the mock auth adapter's getSession to return a valid token,
 * so initAuth() works without sessionStorage token fallback.
 */
export function seedAuth(options: {
  user?: Record<string, unknown>
  teams?: Array<Record<string, unknown>>
  currentTeam?: Record<string, unknown>
  mockAuth?: AuthAdapter
} = {}) {
  const futureExp = Math.floor(Date.now() / 1000) + 3600
  const token = makeJwt(futureExp)
  const user = options.user ?? makeUser()
  const teams = options.teams ?? [makeTeamSummary()]
  const currentTeam = options.currentTeam ?? teams[0]

  // Only app metadata in sessionStorage — tokens owned by Supabase SDK
  sessionStorage.setItem('user', JSON.stringify(user))
  sessionStorage.setItem('teams', JSON.stringify(teams))
  sessionStorage.setItem('currentTeam', JSON.stringify(currentTeam))

  // Configure mock auth's getSession so initAuth() picks up the token from SDK path
  const mockAuth = options.mockAuth ?? resolveCurrentMockAuth()
  if (mockAuth) {
    ;(mockAuth as any).getSession = vi.fn().mockResolvedValue({ access_token: token })
  }

  return { token, user, teams, currentTeam }
}

/** Try to resolve mock auth from the current DI container */
function resolveCurrentMockAuth(): AuthAdapter | null {
  try {
    return getContainer().resolve<AuthAdapter>(AUTH_ADAPTER)
  } catch {
    return null
  }
}
