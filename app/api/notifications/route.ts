import { NextRequest } from 'next/server'
import { json } from '@/lib/http/errors'
import { emitter } from '@/lib/utils/emitter'

export async function GET(_req: NextRequest) {
  // Server-Sent Events (SSE) endpoint
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(new TextEncoder().encode(payload))
        } catch (e) {
          // ignore
        }
      }

      const off = emitter.on('candidate:finalized', (d) => send({ event: 'candidate:finalized', ...d }))

      // Keep the connection alive every 15s
      const keepAlive = setInterval(() => controller.enqueue(new TextEncoder().encode(':\n\n')), 15000)

      controller.enqueue(new TextEncoder().encode('data: {"event":"connected"}\n\n'))

      return () => {
        off()
        clearInterval(keepAlive)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
