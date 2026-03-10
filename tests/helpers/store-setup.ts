import { createPinia, setActivePinia } from 'pinia'
import { initContainer } from '@/core/service-container'
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
 * Seeds a valid token, user, teams, and currentTeam.
 */
export function seedAuth(options: {
  user?: Record<string, unknown>
  teams?: Array<Record<string, unknown>>
  currentTeam?: Record<string, unknown>
} = {}) {
  const futureExp = Math.floor(Date.now() / 1000) + 3600
  const token = makeJwt(futureExp)
  const user = options.user ?? makeUser()
  const teams = options.teams ?? [makeTeamSummary()]
  const currentTeam = options.currentTeam ?? teams[0]

  sessionStorage.setItem('token', token)
  sessionStorage.setItem('user', JSON.stringify(user))
  sessionStorage.setItem('teams', JSON.stringify(teams))
  sessionStorage.setItem('currentTeam', JSON.stringify(currentTeam))

  return { token, user, teams, currentTeam }
}
