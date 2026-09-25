'use client'

import { useState, useEffect } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import Link from 'next/link'

export default function CheckInPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/check-in/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCheckIn = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(data.message)
        if (data.teamStatus) setStatus(data.teamStatus)
      } else {
        setError(data.error || 'Failed to check in')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="EVENT CHECK-IN" />

      <div className="mt-12 flex w-full max-w-xl flex-col gap-6 px-4">
        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
            <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
              Crewmate Check-In
            </h1>
            <StatusPill
              status={
                status?.isFullyCheckedIn
                  ? 'complete'
                  : status?.checkedInCount > 0
                  ? 'open'
                  : 'waiting'
              }
            />
          </div>

          <p className="font-rajdhani text-gray-300">
            Welcome to Project Skeld! Confirm your check-in when you arrive at NAB.
            All 6 crewmates in your team must be checked in before your team can enter Task 1.
          </p>

          {message && (
            <div className="rounded border border-skeld-green bg-skeld-green/20 p-3 font-rajdhani text-sm text-skeld-green">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-red">
              {error}
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2">
            <Button
              variant="primary"
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Confirming...' : 'CONFIRM MY CHECK-IN'}
            </Button>
          </div>

          {status && (
            <div className="mt-4 rounded-md border border-skeld-panel bg-skeld-void/80 p-4">
              <div className="flex items-center justify-between">
                <span className="font-orbitron text-sm uppercase text-gray-400">
                  Team Progress
                </span>
                <span className="font-mono text-sm font-bold text-skeld-cyan">
                  {status.checkedInCount} / {status.totalPlayers || 6} Checked In
                </span>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-skeld-panel">
                <div
                  className="h-full bg-skeld-cyan transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      ((status.checkedInCount || 0) / (status.totalPlayers || 6)) * 100
                    )}%`,
                  }}
                />
              </div>

              {status.players && status.players.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <span className="font-orbitron text-xs uppercase text-gray-500">
                    Crewmate Roster
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {status.players.map((p: any) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded border border-skeld-panel/60 bg-skeld-panel/40 px-2 py-1 text-xs"
                      >
                        <span className="font-rajdhani truncate">{p.name}</span>
                        <span
                          className={
                            p.isCheckedIn
                              ? 'font-bold text-skeld-green'
                              : 'text-gray-500'
                          }
                        >
                          {p.isCheckedIn ? '✓ IN' : 'WAITING'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex justify-between pt-2 text-xs">
            <Link href="/player" className="text-skeld-cyan hover:underline">
              ← Go to Player Hub
            </Link>
            <Link href="/" className="text-gray-400 hover:underline">
              Landing Page
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  )
}
