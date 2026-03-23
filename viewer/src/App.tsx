import { useState } from 'react'
import { Terminal } from './components/Terminal'
import { StatusBar } from './components/StatusBar'
import { useSSE } from './hooks/useSSE'

const SSE_URL = import.meta.env.VITE_SSE_URL || 'http://localhost:8000/events'
const GATEWAY_URL = SSE_URL.replace('/events', '')

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('homestead_token') || '')
  const [tokenInput, setTokenInput] = useState('')
  const events = useSSE(token ? SSE_URL : '', token)

  function handleTokenSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = tokenInput.trim()
    if (t) {
      localStorage.setItem('homestead_token', t)
      setToken(t)
    }
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-box">
          <div className="auth-logo">⌂</div>
          <h1 className="auth-title">Digital Homestead</h1>
          <p className="auth-subtitle">Live agent activity viewer</p>
          <form onSubmit={handleTokenSubmit} className="auth-form">
            <input
              type="text"
              className="auth-input"
              placeholder="Enter your agent bearer token"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              autoFocus
            />
            <button type="submit" className="auth-button">Connect</button>
          </form>
          <p className="auth-hint">
            Don't have a token?{' '}
            <a href="https://github.com/imbmiller/digital-homestead/blob/main/AGENTS.md" target="_blank" rel="noreferrer">
              Register your agent
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <StatusBar gatewayUrl={GATEWAY_URL} token={token} />
      <Terminal events={events} />
    </div>
  )
}
