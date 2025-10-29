// @ts-nocheck
import { emitter } from '@/lib/utils/emitter'

export const runtime = 'edge'

// Keep a module-level set of connected sockets for broadcast
const sockets = new Set<WebSocket>()

function broadcast(message: unknown) {
  const payload = JSON.stringify(message)
  for (const ws of sockets) {
    try {
      ws.readyState === ws.OPEN && ws.send(payload)
    } catch {}
  }
}

// Bridge internal emitter events to websocket clients
emitter.on('candidate:finalized', (d) => {
  broadcast({ event: 'candidate:finalized', ...d })
})

export async function GET() {
  const { 0: client, 1: server } = new WebSocketPair()

  const ws = server as unknown as WebSocket

  ws.accept()

  sockets.add(ws)

  try {
    ws.send(JSON.stringify({ event: 'connected' }))
  } catch {}

  ws.addEventListener('message', (event: MessageEvent) => {
    // Optionally allow pings from client
    try {
      const msg = JSON.parse(String(event.data || '{}'))
      if (msg?.type === 'ping') {
        try { ws.send(JSON.stringify({ type: 'pong', t: Date.now() })) } catch {}
      }
    } catch {}
  })

  ws.addEventListener('close', () => {
    sockets.delete(ws)
  })

  ws.addEventListener('error', () => {
    try { ws.close() } catch {}
    sockets.delete(ws)
  })

  return new Response(null, {
    status: 101,
    webSocket: client as unknown as WebSocket,
  })
}


