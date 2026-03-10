import type { EventBus, EventPayload } from './types'

/**
 * Typed event bus for cross-module communication.
 * Usage: eventBus.emit('task.created', { task }); eventBus.on('task.created', handler)
 */
export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<(payload: EventPayload) => void>>()

  function getHandlers(event: string): Set<(payload: EventPayload) => void> {
    if (!handlers.has(event)) {
      handlers.set(event, new Set())
    }
    return handlers.get(event)!
  }

  return {
    emit<T extends EventPayload = EventPayload>(event: string, payload?: T): void {
      const set = handlers.get(event)
      if (set) {
        for (const handler of set) {
          try {
            handler(payload ?? ({} as T))
          } catch {
            // Swallow handler errors — one bad listener shouldn't break others
          }
        }
      }
    },

    on<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void {
      getHandlers(event).add(handler as (payload: EventPayload) => void)
    },

    off<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void {
      const set = handlers.get(event)
      if (set) {
        set.delete(handler as (payload: EventPayload) => void)
      }
    },

    once<T extends EventPayload = EventPayload>(event: string, handler: (payload: T) => void): void {
      const wrapper = (payload: EventPayload) => {
        getHandlers(event).delete(wrapper)
        handler(payload as T)
      }
      getHandlers(event).add(wrapper)
    }
  }
}

/** Global singleton event bus */
let _eventBus: EventBus | null = null

export function initEventBus(): EventBus {
  _eventBus = createEventBus()
  return _eventBus
}

export function getEventBus(): EventBus {
  if (!_eventBus) {
    throw new Error('Event bus not initialized. Call initEventBus() in main.ts first.')
  }
  return _eventBus
}
