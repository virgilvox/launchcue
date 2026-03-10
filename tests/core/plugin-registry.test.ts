import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PluginRegistry, initPluginRegistry, getPluginRegistry } from '@/core/plugin-registry'
import type { FeatureModule, ServiceContainer } from '@/core/types'

function makeModule(overrides: Partial<FeatureModule> & { id: string }): FeatureModule {
  return {
    name: overrides.id,
    ...overrides,
  }
}

function makeMockContainer(): ServiceContainer {
  return {
    register: vi.fn(),
    resolve: vi.fn(),
    has: vi.fn(),
  }
}

describe('PluginRegistry', () => {
  let registry: PluginRegistry

  beforeEach(() => {
    registry = new PluginRegistry()
  })

  it('register + getModule returns the module', () => {
    const mod = makeModule({ id: 'tasks' })
    registry.register(mod)
    expect(registry.getModule('tasks')).toBe(mod)
  })

  it('duplicate register throws', () => {
    const mod = makeModule({ id: 'tasks' })
    registry.register(mod)
    expect(() => registry.register(makeModule({ id: 'tasks' }))).toThrowError(/already registered/)
  })

  it('getModule returns undefined for unregistered id', () => {
    expect(registry.getModule('nonexistent')).toBeUndefined()
  })

  it('hasModule returns correct boolean', () => {
    registry.register(makeModule({ id: 'tasks' }))
    expect(registry.hasModule('tasks')).toBe(true)
    expect(registry.hasModule('nope')).toBe(false)
  })

  it('getRoutes collects from all modules', () => {
    const routeA = { path: '/a', component: {} as any }
    const routeB = { path: '/b', component: {} as any }

    registry.register(makeModule({ id: 'modA', routes: [routeA] }))
    registry.register(makeModule({ id: 'modB', routes: [routeB] }))

    const routes = registry.getRoutes()
    expect(routes).toHaveLength(2)
    expect(routes).toContain(routeA)
    expect(routes).toContain(routeB)
  })

  it('getRoutes returns empty array when no modules have routes', () => {
    registry.register(makeModule({ id: 'noRoutes' }))
    expect(registry.getRoutes()).toEqual([])
  })

  it('getNavGroups merges groups with same label', () => {
    registry.register(makeModule({
      id: 'modA',
      navItems: [{ label: 'CORE', items: [{ name: 'Tasks', href: '/tasks', icon: 'tasks' }] }],
    }))
    registry.register(makeModule({
      id: 'modB',
      navItems: [{ label: 'CORE', items: [{ name: 'Projects', href: '/projects', icon: 'projects' }] }],
    }))

    const groups = registry.getNavGroups()
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('CORE')
    expect(groups[0].items).toHaveLength(2)
    expect(groups[0].items[0].name).toBe('Tasks')
    expect(groups[0].items[1].name).toBe('Projects')
  })

  it('getNavGroups keeps different labels separate', () => {
    registry.register(makeModule({
      id: 'modA',
      navItems: [{ label: 'CORE', items: [{ name: 'Tasks', href: '/tasks', icon: 'tasks' }] }],
    }))
    registry.register(makeModule({
      id: 'modB',
      navItems: [{ label: 'ADMIN', items: [{ name: 'Settings', href: '/settings', icon: 'settings' }] }],
    }))

    const groups = registry.getNavGroups()
    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('CORE')
    expect(groups[1].label).toBe('ADMIN')
  })

  describe('topological sort + initialize', () => {
    it('respects dependencies — setup called in order', async () => {
      const order: string[] = []
      const container = makeMockContainer()

      registry.register(makeModule({
        id: 'base',
        setup: () => { order.push('base') },
      }))
      registry.register(makeModule({
        id: 'dependent',
        dependencies: ['base'],
        setup: () => { order.push('dependent') },
      }))

      await registry.initialize(container)
      expect(order).toEqual(['base', 'dependent'])
    })

    it('circular dependency throws', async () => {
      const container = makeMockContainer()
      registry.register(makeModule({ id: 'a', dependencies: ['b'] }))
      registry.register(makeModule({ id: 'b', dependencies: ['a'] }))

      await expect(registry.initialize(container)).rejects.toThrowError(/Circular dependency/)
    })

    it('missing dependency throws', async () => {
      const container = makeMockContainer()
      registry.register(makeModule({ id: 'orphan', dependencies: ['missing'] }))

      await expect(registry.initialize(container)).rejects.toThrowError(/Missing dependency/)
    })

    it('initialize calls setup in dependency order for deep chains', async () => {
      const order: string[] = []
      const container = makeMockContainer()

      registry.register(makeModule({
        id: 'c',
        dependencies: ['b'],
        setup: () => { order.push('c') },
      }))
      registry.register(makeModule({
        id: 'a',
        setup: () => { order.push('a') },
      }))
      registry.register(makeModule({
        id: 'b',
        dependencies: ['a'],
        setup: () => { order.push('b') },
      }))

      await registry.initialize(container)
      expect(order).toEqual(['a', 'b', 'c'])
    })

    it('initialize is idempotent (second call is no-op)', async () => {
      const setup = vi.fn()
      const container = makeMockContainer()
      registry.register(makeModule({ id: 'mod', setup }))

      await registry.initialize(container)
      await registry.initialize(container)
      expect(setup).toHaveBeenCalledOnce()
    })
  })

  describe('getSearchProviders', () => {
    it('collects search providers from all modules', () => {
      const providerA = { name: 'tasks', search: vi.fn() }
      const providerB = { name: 'projects', search: vi.fn() }

      registry.register(makeModule({ id: 'modA', searchProviders: [providerA] }))
      registry.register(makeModule({ id: 'modB', searchProviders: [providerB] }))

      const providers = registry.getSearchProviders()
      expect(providers).toHaveLength(2)
      expect(providers).toContain(providerA)
      expect(providers).toContain(providerB)
    })

    it('returns empty array when no modules have search providers', () => {
      registry.register(makeModule({ id: 'noSearch' }))
      expect(registry.getSearchProviders()).toEqual([])
    })
  })

  describe('teardown', () => {
    it('calls teardown in reverse dependency order', () => {
      const order: string[] = []

      registry.register(makeModule({
        id: 'base',
        teardown: () => { order.push('base') },
      }))
      registry.register(makeModule({
        id: 'dependent',
        dependencies: ['base'],
        teardown: () => { order.push('dependent') },
      }))

      registry.teardown()
      expect(order).toEqual(['dependent', 'base'])
    })

    it('teardown resets initialized flag so initialize can run again', async () => {
      const setup = vi.fn()
      const container = makeMockContainer()
      registry.register(makeModule({ id: 'mod', setup }))

      await registry.initialize(container)
      registry.teardown()
      await registry.initialize(container)
      expect(setup).toHaveBeenCalledTimes(2)
    })
  })
})

describe('initPluginRegistry + getPluginRegistry', () => {
  it('initPluginRegistry creates a registry and getPluginRegistry returns it', () => {
    const registry = initPluginRegistry()
    expect(registry).toBeInstanceOf(PluginRegistry)
    expect(getPluginRegistry()).toBe(registry)
  })

  it('getPluginRegistry throws before init', async () => {
    vi.resetModules()
    const { getPluginRegistry: freshGet } = await import('@/core/plugin-registry')
    expect(() => freshGet()).toThrowError(/not initialized/)
  })
})
