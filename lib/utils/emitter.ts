type EventMap = {
  'candidate:finalized': { candidateId: string }
}

type EventHandler<T> = (data: T) => void

class EventEmitter {
  private events = new Map<string, Set<EventHandler>>()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)

    return () => {
      const handlers = this.events.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.events.delete(event)
        }
      }
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }
}

export const emitter = new EventEmitter()
