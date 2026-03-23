import { useEffect, useRef, useState } from 'react'

export interface SSEEvent {
  id: string
  type: string
  payload: Record<string, unknown>
  ts: string
}

export function useSSE(url: string, token: string): SSEEvent[] {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef<number>(0)

  useEffect(() => {
    if (!url || !token) return

    let stopped = false

    function connect() {
      if (stopped) return

      // Append bearer token as query param (EventSource doesn't support headers)
      const fullUrl = `${url}?token=${encodeURIComponent(token)}`
      const es = new EventSource(fullUrl)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data)
          if (event.type === 'heartbeat') return
          setEvents(prev => {
            const next = [...prev, event]
            // Keep last 500 events in memory
            return next.length > 500 ? next.slice(next.length - 500) : next
          })
        } catch { /* ignore malformed events */ }
        retryRef.current = 0  // Reset backoff on successful message
      }

      es.onerror = () => {
        es.close()
        if (stopped) return
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000)
        retryRef.current++
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      stopped = true
      esRef.current?.close()
    }
  }, [url, token])

  return events
}
