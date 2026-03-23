import { useEffect, useRef } from 'react'
import type { SSEEvent } from '../hooks/useSSE'

interface Props {
  events: SSEEvent[]
}

const EVENT_STYLES: Record<string, { prefix: string; color: string }> = {
  'commit.pushed':          { prefix: '>', color: '#4ade80' },  // green
  'task.created':           { prefix: '+', color: '#60a5fa' },  // blue
  'task.claimed':           { prefix: '~', color: '#a78bfa' },  // purple
  'task.completed':         { prefix: '✓', color: '#4ade80' },  // green
  'pr.opened':              { prefix: '*', color: '#fbbf24' },  // amber
  'pr.reviewed':            { prefix: '?', color: '#fb923c' },  // orange
  'pr.merged':              { prefix: '✓', color: '#4ade80' },  // green
  'pr.closed':              { prefix: 'x', color: '#f87171' },  // red
  'agent.connected':        { prefix: '@', color: '#34d399' },  // teal
  'agent.disconnected':     { prefix: '@', color: '#6b7280' },  // gray
  'orchestrator.broadcast': { prefix: '!', color: '#f472b6' },  // pink
  'roadmap.updated':        { prefix: '=', color: '#38bdf8' },  // sky
}

function formatEvent(event: SSEEvent): { prefix: string; color: string; text: string } {
  const style = EVENT_STYLES[event.type] || { prefix: '·', color: '#9ca3af' }
  const p = event.payload

  let text = ''
  switch (event.type) {
    case 'commit.pushed':
      text = `commit.pushed     ${p.sha}  "${p.message}"  by ${p.author}`
      break
    case 'task.created':
      text = `task.created      "${p.title}"  [${p.epic || 'none'}]  priority=${p.priority}`
      break
    case 'task.claimed':
      text = `task.claimed      ${String(p.task_id).slice(0, 8)}  by ${p.agent_name}`
      break
    case 'task.completed':
      text = `task.completed    task=${String(p.task_id).slice(0, 8)}  PR #${p.pr_number}`
      break
    case 'pr.opened':
      text = `pr.opened         PR #${p.pr_number}  "${p.title}"`
      break
    case 'pr.reviewed':
      text = `pr.reviewed       PR #${p.pr_number}  score=${p.score}/100  ${p.approved ? 'APPROVED' : 'changes requested'}`
      break
    case 'pr.merged':
      text = `pr.merged         PR #${p.pr_number}  "${p.title}"  score=${p.review_score}/100`
      break
    case 'pr.closed':
      text = `pr.closed         PR #${p.pr_number}  "${p.title}"`
      break
    case 'agent.connected':
      text = `agent.connected   ${p.name}`
      break
    case 'agent.disconnected':
      text = `agent.disconnected  ${p.name}`
      break
    case 'orchestrator.broadcast':
      text = `broadcast         "${p.message}"`
      break
    case 'roadmap.updated':
      text = `roadmap.updated   ${p.epic} → ${p.status}`
      break
    default:
      text = `${event.type}  ${JSON.stringify(event.payload).slice(0, 80)}`
  }

  return { ...style, text }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false })
  } catch {
    return iso.slice(11, 19)
  }
}

export function Terminal({ events }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="terminal-body">
      {events.length === 0 && (
        <div className="terminal-line" style={{ color: '#6b7280' }}>
          <span className="terminal-time">--:--:--</span>
          <span className="terminal-prefix"> · </span>
          <span>Connecting to event stream...</span>
        </div>
      )}
      {events.map((event) => {
        const { prefix, color, text } = formatEvent(event)
        return (
          <div key={event.id} className="terminal-line">
            <span className="terminal-time">{formatTime(event.ts)}</span>
            <span className="terminal-prefix" style={{ color }}> {prefix} </span>
            <span style={{ color }}>{text}</span>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
