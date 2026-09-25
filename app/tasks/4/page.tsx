'use client'

import { useState } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task4Page() {
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/kahoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Failed to submit nickname')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 4: KAHOOT FINALS" />

      <div className="mt-8 flex w-full max-w-xl flex-col gap-6 px-4">
        <Panel variant="amber" className="flex flex-col gap-4">
          <h2 className="font-orbitron text-xl font-bold text-skeld-amber">
            The Main Projector Quiz
          </h2>
          <p className="font-rajdhani text-gray-300">
            Look up at the main NAB projector screen for questions. Your team leader will answer questions directly on their device.
          </p>

          {submitted ? (
            <div className="rounded border border-skeld-green bg-skeld-green/20 p-4 text-center">
              <h3 className="font-orbitron text-lg font-bold text-skeld-green">
                ✓ NICKNAME SUBMITTED
              </h3>
              <p className="mt-2 font-mono text-xl text-white">"{nickname}"</p>
              <p className="mt-2 font-rajdhani text-sm text-gray-300">
                Organizers will match this nickname to your team on the final leaderboard. Play hard!
              </p>
              <div className="mt-4">
                <Link href="/leaderboard">
                  <Button variant="primary">VIEW LIVE LEADERBOARD →</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded border border-skeld-red bg-skeld-red/20 p-2 font-rajdhani text-xs text-skeld-red">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-orbitron text-xs uppercase text-gray-400">
                  Your Team's Kahoot Screen Nickname
                </label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. PolusCrew01"
                  className="rounded border border-skeld-panel bg-skeld-void p-3 font-mono text-white focus:border-skeld-amber focus:outline-none"
                />
                <span className="font-rajdhani text-xs text-gray-500">
                  Make sure this exactly matches the name you enter in Kahoot!
                </span>
              </div>

              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !nickname.trim()}
                className="w-full"
              >
                {submitting ? 'Registering...' : 'REGISTER KAHOOT NICKNAME'}
              </Button>
            </form>
          )}

          <div className="mt-2 text-xs">
            <Link href="/player" className="text-skeld-cyan hover:underline">
              ← Return to Player Hub
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  )
}
