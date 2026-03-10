import { vi } from 'vitest'

/**
 * Call this in your test file to mock the router module.
 * Usage: vi.mock('@/router', () => mockRouter())
 */
export function mockRouter() {
  return {
    default: {
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: { path: '/', params: {}, query: {} } },
    },
  }
}
