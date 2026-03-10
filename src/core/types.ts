import type { RouteRecordRaw } from 'vue-router'

// ─── Service Container ───

export interface ServiceContainer {
  register<T>(key: symbol, factory: () => T): void
  resolve<T>(key: symbol): T
  has(key: symbol): boolean
}

// ─── Event Bus ───

export interface EventPayload {
  [key: string]: unknown
}

export interface EventBus {
  emit<T extends EventPayload = EventPayload>(event: string, payload?: T): void
  on<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void
  off<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void
  once<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void
}

// ─── Navigation ───

export interface NavItem {
  name: string
  href: string
  icon: string
  /** Matches against current route path for active state */
  matchPath?: string | RegExp
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// ─── Search ───

export interface SearchProvider {
  /** Entity type key (e.g., 'task', 'project') */
  type: string
  /** Human-readable label */
  label: string
  /** Icon identifier */
  icon: string
  /** Search function returning results */
  search(query: string): Promise<SearchProviderResult[]>
}

export interface SearchProviderResult {
  id: string
  title: string
  description?: string
  route: string
  type: string
}

// ─── Feature Module ───

export interface FeatureModule {
  /** Unique module identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Module dependencies (other module IDs) */
  dependencies?: string[]
  /** Routes to register under DefaultLayout */
  routes?: RouteRecordRaw[]
  /** Navigation items grouped for sidebar */
  navItems?: NavGroup[]
  /** Search providers for global search */
  searchProviders?: SearchProvider[]
  /** Called when module is registered */
  setup?: (container: ServiceContainer) => void | Promise<void>
  /** Called when module is torn down */
  teardown?: () => void
}
