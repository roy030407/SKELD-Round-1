'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task3BombDefusalPage() {
  const [loading, setLoading] = useState(true)
  const [bombDefusalLink, setBombDefusalLink] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch('/api/tasks/3/state')
      const data = await res.json()
      if (res.ok) {
        setBlockedReason(null)
        setBombDefusalLink(data.bombDefusalLink)
        setCompleted(!!data.completed)
      } else {
        setBlockedReason(data.error ?? 'Task 3 is not currently available for your team.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-skeld-void text-white">
        <p className="font-orbitron animate-pulse text-skeld-cyan">Loading mission briefing...</p>
      </main>
    )
  }

  // Blocked/gated state — same visual pattern as the Task 4 "waiting for
  // organizers" panel (Panel variant="amber", auto-refresh note, return link).
  if (blockedReason) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void p-4 text-white">
        <Panel variant="amber" className="max-w-md text-center">
          <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
            Task 3: Bomb Defusal — Locked
          </h1>
          <p className="mt-4 font-rajdhani text-gray-300">{blockedReason}</p>
          <p className="mt-2 font-rajdhani text-xs text-gray-500">
            This page auto-refreshes every 5 seconds.
          </p>
          <div className="mt-6">
            <Link href="/player" className="text-skeld-cyan hover:underline font-rajdhani text-sm">
              ← Return to Player Hub
            </Link>
          </div>
        </Panel>
      </main>
    )
  }

  if (completed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void text-white">
        <Panel variant="red" className="max-w-md text-center">
          <h1 className="font-bangers text-4xl text-green-400 animate-pulse">BOMB DEFUSED!</h1>
          <p className="mt-4 font-rajdhani text-lg text-gray-200">
            Your team's Bomb Defusal result has been recorded by the organizers.
          </p>
          <div className="mt-6">
            <Link href="/tasks/4"><Button variant="primary">PROCEED TO TASK 4 (FINALS) →</Button></Link>
          </div>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 3: REACTOR BOMB DEFUSAL — ALL HANDS" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-8 px-4">
        <Panel variant="red" className="flex flex-col gap-4">
          <h2 className="font-orbitron text-xl font-bold text-skeld-glow-red">
            Round 3 — Bomb Defusal Mission
          </h2>
          <p className="font-rajdhani text-sm text-gray-300">
            Your team must complete the bomb defusal challenge together on the site below. Click the
            link when instructed by the organizers.
          </p>

          {bombDefusalLink && (
            <a
              href={bombDefusalLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded border border-skeld-red bg-skeld-red/10 px-4 py-4 font-orbitron text-sm font-bold text-skeld-glow-red hover:bg-skeld-red/20 transition-colors"
            >
              ENTER BOMB DEFUSAL MISSION ↗
            </a>
          )}

          <div className="rounded border border-skeld-amber/40 bg-skeld-amber/5 p-3">
            <p className="font-rajdhani text-xs text-skeld-amber">
              ⚠ Once your team has finished, notify the organizers so they can record your result.
            </p>
          </div>
        </Panel>

        <div className="text-center">
          <Link href="/player" className="font-rajdhani text-sm text-skeld-cyan hover:underline">
            ← Return to Player Hub
          </Link>
        </div>
      </div>
    </main>
  )
}
