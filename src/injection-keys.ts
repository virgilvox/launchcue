import type { InjectionKey } from 'vue'
import type { ServiceContainer, EventBus } from './core/types'
import type { PluginRegistry } from './core/plugin-registry'

export const containerKey: InjectionKey<ServiceContainer> = Symbol('container')
export const eventBusKey: InjectionKey<EventBus> = Symbol('eventBus')
export const registryKey: InjectionKey<PluginRegistry> = Symbol('registry')
