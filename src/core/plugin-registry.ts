import type { RouteRecordRaw } from 'vue-router'
import type { FeatureModule, NavGroup, SearchProvider, ServiceContainer } from './types'

/**
 * Module registration, dependency resolution (topological sort),
 * and route/nav/search collection.
 */
export class PluginRegistry {
  private modules = new Map<string, FeatureModule>()
  private initialized = false

  /** Register a module (does not initialize yet) */
  register(mod: FeatureModule): void {
    if (this.modules.has(mod.id)) {
      throw new Error(`Module "${mod.id}" is already registered`)
    }
    this.modules.set(mod.id, mod)
  }

  private failedModules = new Set<string>()

  /** Initialize all modules in dependency order */
  async initialize(container: ServiceContainer): Promise<void> {
    if (this.initialized) return

    const sorted = this.topologicalSort()

    for (const mod of sorted) {
      if (mod.setup) {
        try {
          await mod.setup(container)
        } catch (err) {
          console.error(`[PluginRegistry] Module "${mod.id}" setup() failed:`, err)
          this.failedModules.add(mod.id)
        }
      }
    }

    this.initialized = true
  }

  /** Get IDs of modules whose setup() failed */
  getFailedModules(): string[] {
    return [...this.failedModules]
  }

  /** Tear down all modules in reverse order */
  teardown(): void {
    const sorted = this.topologicalSort().reverse()
    for (const mod of sorted) {
      if (mod.teardown) {
        mod.teardown()
      }
    }
    this.initialized = false
  }

  /** Collect all routes from registered modules */
  getRoutes(): RouteRecordRaw[] {
    const routes: RouteRecordRaw[] = []
    for (const mod of this.modules.values()) {
      if (mod.routes) {
        routes.push(...mod.routes)
      }
    }
    return routes
  }

  /** Collect all nav groups from registered modules, in registration order */
  getNavGroups(): NavGroup[] {
    const groups: NavGroup[] = []
    const groupMap = new Map<string, NavGroup>()

    for (const mod of this.modules.values()) {
      if (mod.navItems) {
        for (const group of mod.navItems) {
          if (groupMap.has(group.label)) {
            // Merge items into existing group
            groupMap.get(group.label)!.items.push(...group.items)
          } else {
            const clone = { label: group.label, items: [...group.items] }
            groupMap.set(group.label, clone)
            groups.push(clone)
          }
        }
      }
    }

    return groups
  }

  /** Collect all search providers from registered modules */
  getSearchProviders(): SearchProvider[] {
    const providers: SearchProvider[] = []
    for (const mod of this.modules.values()) {
      if (mod.searchProviders) {
        providers.push(...mod.searchProviders)
      }
    }
    return providers
  }

  /** Get a registered module by ID */
  getModule(id: string): FeatureModule | undefined {
    return this.modules.get(id)
  }

  /** Check if a module is registered */
  hasModule(id: string): boolean {
    return this.modules.has(id)
  }

  /** Topological sort of modules based on dependencies */
  private topologicalSort(): FeatureModule[] {
    const visited = new Set<string>()
    const sorted: FeatureModule[] = []
    const visiting = new Set<string>() // cycle detection

    const visit = (id: string) => {
      if (visited.has(id)) return
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving module "${id}"`)
      }

      const mod = this.modules.get(id)
      if (!mod) {
        throw new Error(`Missing dependency: module "${id}" is not registered`)
      }

      visiting.add(id)

      if (mod.dependencies) {
        for (const dep of mod.dependencies) {
          visit(dep)
        }
      }

      visiting.delete(id)
      visited.add(id)
      sorted.push(mod)
    }

    for (const id of this.modules.keys()) {
      visit(id)
    }

    return sorted
  }
}

/** Global singleton registry */
let _registry: PluginRegistry | null = null

export function initPluginRegistry(): PluginRegistry {
  _registry = new PluginRegistry()
  return _registry
}

export function getPluginRegistry(): PluginRegistry {
  if (!_registry) {
    throw new Error('Plugin registry not initialized. Call initPluginRegistry() in main.ts first.')
  }
  return _registry
}
