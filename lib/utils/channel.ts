type MessageShape = {
  type: string
  payload?: any
}

const CHANNEL_NAME = 'interviewee-flow'

export class FlowChannel {
  private channel: BroadcastChannel | null

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
    } else {
      this.channel = null
    }
  }

  post<T = any>(type: string, payload?: T) {
    try {
      this.channel?.postMessage({ type, payload } as MessageShape)
    } catch {}
    try {
      // Fallback via localStorage event
      if (typeof window !== 'undefined') {
        const key = `${CHANNEL_NAME}:${type}`
        window.localStorage.setItem(key, JSON.stringify({ t: Date.now(), payload }))
        window.localStorage.removeItem(key)
      }
    } catch {}
  }

  on(type: string, handler: (payload: any) => void) {
    const bcListener = (e: MessageEvent<MessageShape>) => {
      if (e.data?.type === type) handler(e.data.payload)
    }
    this.channel?.addEventListener('message', bcListener as any)

    const lsListener = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return
      const [ns, msgType] = e.key.split(':')
      if (ns === CHANNEL_NAME && msgType === type) {
        try {
          const parsed = JSON.parse(e.newValue)
          handler(parsed?.payload)
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', lsListener)
    }

    return () => {
      this.channel?.removeEventListener('message', bcListener as any)
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', lsListener)
      }
    }
  }

  close() {
    try { this.channel?.close() } catch {}
  }
}

export const flowChannel = new FlowChannel()


