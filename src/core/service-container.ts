import type { ServiceContainer } from './types'

/**
 * Simple DI container with singleton caching.
 * register(key, factory) stores factories; resolve(key) creates + caches instances.
 */
export function createServiceContainer(): ServiceContainer {
  const factories = new Map<symbol, () => unknown>()
  const instances = new Map<symbol, unknown>()

  return {
    register<T>(key: symbol, factory: () => T): void {
      factories.set(key, factory)
      // Clear cached instance when re-registering (allows adapter swaps)
      instances.delete(key)
    },

    resolve<T>(key: symbol): T {
      // Return cached instance if available
      if (instances.has(key)) {
        return instances.get(key) as T
      }

      const factory = factories.get(key)
      if (!factory) {
        throw new Error(`No factory registered for key: ${key.toString()}`)
      }

      const instance = factory() as T
      instances.set(key, instance)
      return instance
    },

    has(key: symbol): boolean {
      return factories.has(key)
    }
  }
}

/** Global singleton container — initialized once in main.ts */
let _container: ServiceContainer | null = null

export function initContainer(): ServiceContainer {
  _container = createServiceContainer()
  return _container
}

export function getContainer(): ServiceContainer {
  if (!_container) {
    throw new Error('Service container not initialized. Call initContainer() in main.ts first.')
  }
  return _container
}
