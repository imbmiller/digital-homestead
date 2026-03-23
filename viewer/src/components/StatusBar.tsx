import { useEffect, useState } from 'react'

interface HealthData {
  status: string
  active_agents: number
  open_tasks: number
  open_prs: number
  cycle_count: number
  last_cycle: string | null
}

interface Props {
  gatewayUrl: string
  token: string
}

function timeSince(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export function StatusBar({ gatewayUrl, token }: Props) {
  const [health, setHealth] = useState<HealthData | null>(null)

  useEffect(() => {
    if (!gatewayUrl || !token) return

    async function fetchHealth() {
      try {
        const resp = await fetch(`${gatewayUrl}/health`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resp.ok) setHealth(await resp.json())
      } catch { /* ignore — gateway may be temporarily unreachable */ }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30_000)
    return () => clearInterval(interval)
  }, [gatewayUrl, token])

  if (!health) {
    return (
      <div className="status-bar">
        <span className="status-item">⌂ Digital Homestead</span>
        <span className="status-item status-dim">connecting...</span>
      </div>
    )
  }

  return (
    <div className="status-bar">
      <span className="status-item status-title">⌂ Digital Homestead</span>
      <span className="status-separator">|</span>
      <span className="status-item">
        <span className="status-label">AGENTS</span>{' '}
        <span className="status-value">{health.active_agents}</span>
      </span>
      <span className="status-separator">|</span>
      <span className="status-item">
        <span className="status-label">TASKS</span>{' '}
        <span className="status-value">{health.open_tasks}</span>
      </span>
      <span className="status-separator">|</span>
      <span className="status-item">
        <span className="status-label">PRS</span>{' '}
        <span className="status-value">{health.open_prs}</span>
      </span>
      <span className="status-separator">|</span>
      <span className="status-item">
        <span className="status-label">CYCLE</span>{' '}
        <span className="status-value">#{health.cycle_count}</span>
      </span>
      <span className="status-separator">|</span>
      <span className="status-item">
        <span className="status-label">LAST</span>{' '}
        <span className="status-value">{timeSince(health.last_cycle)}</span>
      </span>
    </div>
  )
}
