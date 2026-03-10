import { vi } from 'vitest'

/** Shared mock for vue-toastification */
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

/**
 * Call this in your test file to mock vue-toastification.
 * Usage: vi.mock('vue-toastification', () => mockToastification())
 */
export function mockToastification() {
  return {
    useToast: () => mockToast,
  }
}
