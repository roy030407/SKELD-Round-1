'use client'

import { useState } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Mode = 'player' | 'staff'

const inputClass =
  'w-full rounded border border-skeld-amber/60 bg-skeld-void/50 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-skeld-cyan'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('player')
  const [playerCode, setPlayerCode] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handlePlayerSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/auth/login/player', {
      method: 'POST',
      body: JSON.stringify({ playerCode, rollNumber }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const detail = (await res.text()).trim()
      setError(detail || 'Login failed. Check your player code and roll number.')
      setSubmitting(false)
    } else {
      window.location.href = '/'
    }
  }

  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/auth/login/staff', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const detail = (await res.text()).trim()
      setError(detail || 'Login failed. Check your staff username and password.')
      setSubmitting(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-orbitron text-xs tracking-widest text-gray-400">
            ROBOTICS CLUB NIT WARANGAL
          </span>
          <h1 className="font-bangers text-4xl text-skeld-glow-red">PROJECT SKELD</h1>
        </div>

        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setMode('player'); setError('') }}
              className={`flex-1 rounded py-2 font-orbitron text-xs uppercase transition-colors ${
                mode === 'player'
                  ? 'bg-skeld-amber/20 border border-skeld-amber text-skeld-amber'
                  : 'bg-skeld-void border border-skeld-panel/40 text-gray-400 hover:border-skeld-amber/40'
              }`}
            >
              Player
            </button>
            <button
              type="button"
              onClick={() => { setMode('staff'); setError('') }}
              className={`flex-1 rounded py-2 font-orbitron text-xs uppercase transition-colors ${
                mode === 'staff'
                  ? 'bg-skeld-amber/20 border border-skeld-amber text-skeld-amber'
                  : 'bg-skeld-void border border-skeld-panel/40 text-gray-400 hover:border-skeld-amber/40'
              }`}
            >
              Staff
            </button>
          </div>

          {mode === 'player' ? (
            <form onSubmit={handlePlayerSubmit} className="flex flex-col gap-3">
              <input
                placeholder="Player Code"
                value={playerCode}
                onChange={(e) => setPlayerCode(e.target.value)}
                required
                className={inputClass}
              />
              <input
                placeholder="Roll Number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                className={inputClass}
              />
              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStaffSubmit} className="flex flex-col gap-3">
              <input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={inputClass}
              />
              <Button type="submit" variant="primary" disabled={submitting} className="w-full">
                {submitting ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          )}

          {error && (
            <p className="font-rajdhani text-sm text-skeld-red">{error}</p>
          )}
        </Panel>

        {mode === 'player' && (
          <div className="mt-4 text-center">
            <Link href="/register" className="font-rajdhani text-sm text-skeld-cyan hover:underline">
              Not registered yet? Register here
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
