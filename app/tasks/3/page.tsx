'use client'

import { useState } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task3Page() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskNumber: 3 }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Submission failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 3: REACTOR BOMB DEFUSAL" />

      <div className="mt-8 flex w-full max-w-xl flex-col gap-6 px-4">
        <Panel variant="red" className="flex flex-col gap-4">
          <h2 className="font-orbitron text-xl font-bold text-skeld-glow-red">
            Reactor Core Stabilization
          </h2>
          <p className="font-rajdhani text-gray-300">
            Defuse the explosive module inside the Reactor Chamber before critical meltdown.
          </p>

          <div className="rounded border border-skeld-red/40 bg-skeld-red/10 p-4 text-center">
            <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-glow-red">
              Defusal Terminal Link
            </span>
            <div className="mt-2">
              <a
                href="https://rc-nitw.org/freshers"
                target="_blank"
                rel="noreferrer"
                className="font-rajdhani text-lg font-bold text-white underline hover:text-skeld-glow-red"
              >
                ACCESS DEFUSAL MODULE ↗
              </a>
            </div>
          </div>

          {result ? (
            <div className="rounded border border-skeld-green bg-skeld-green/20 p-4 text-center">
              <h3 className="font-orbitron text-lg font-bold text-skeld-green">
                ✓ REACTOR STABILIZED!
              </h3>
              <p className="mt-1 font-rajdhani text-sm text-gray-200">
                Finished at Rank #{result.rank} (+{result.points} points awarded)
              </p>
              <div className="mt-4">
                <Link href="/tasks/4">
                  <Button variant="primary">PROCEED TO TASK 4 (FINALS) →</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {error && (
                <div className="rounded border border-skeld-red bg-skeld-red/20 p-2 font-rajdhani text-xs text-skeld-red">
                  {error}
                </div>
              )}
              <p className="font-rajdhani text-xs text-gray-400">
                Note: Only the designated Team Leader can submit the defusal confirmation.
              </p>
              <Button
                variant="danger"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Defusing...' : 'CONFIRM DEFUSAL COMPLETE'}
              </Button>
            </div>
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
