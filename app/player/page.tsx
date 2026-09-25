'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import Link from 'next/link'

export default function PlayerHubPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/check-in/status')
      .then((res) => {
        if (!res.ok && res.status === 401) {
          window.location.href = '/login'
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="PLAYER COMMAND HUB" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
            <div>
              <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
                Crewmate Mission Terminal
              </h1>
              <p className="font-rajdhani text-sm text-gray-400">
                Project Skeld: Round 1. Follow the 4 mission stages in sequence.
              </p>
            </div>
            <Link href="/api/auth/logout">
              <Button variant="ghost" className="text-xs px-2 py-1">
                LOGOUT
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Stage 0: Check-In */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-cyan/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-cyan">STAGE 0</span>
                  <StatusPill status="open" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Team Check-In</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  All 6 crewmates in your team must confirm attendance.
                </p>
              </div>
              <Link href="/check-in" className="mt-4">
                <Button variant="primary" className="w-full text-xs">GO TO CHECK-IN →</Button>
              </Link>
            </div>

            {/* Stage 1: Quiz & Tactical Betting */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-cyan/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-cyan">TASK 1</span>
                  <StatusPill status="open" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Auditorium Quiz</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Participate in the central quiz, then place your tactical rank bet.
                </p>
              </div>
              <Link href="/tasks/1" className="mt-4">
                <Button variant="primary" className="w-full text-xs">OPEN QUIZ & BETTING →</Button>
              </Link>
            </div>

            {/* Stage 2: Cipher Task */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-amber/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-amber">TASK 2</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Multi-Crew Cipher</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Each crewmate solves 1 fragment, then leader assembles the master sentence.
                </p>
              </div>
              <Link href="/tasks/2" className="mt-4">
                <Button variant="primary" className="w-full text-xs">OPEN CIPHER STATION →</Button>
              </Link>
            </div>

            {/* Stage 3: Bomb Defusal */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-red/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-red">TASK 3</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Reactor Bomb Defusal</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Solve 5 logic gate modules one by one. Fastest team wins maximum points.
                </p>
              </div>
              <Link href="/tasks/3" className="mt-4">
                <Button variant="danger" className="w-full text-xs">DEFUSAL TERMINAL →</Button>
              </Link>
            </div>

            {/* Stage 4: Shuffling Imposter Game */}
            <div className="col-span-1 md:col-span-2 flex flex-col justify-between rounded-lg border border-purple-500/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-purple-400">TASK 4: FINALS</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Table Shuffling Protocol</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  6 players shuffled from 6 teams at each table. Receive secret words, debate, and vote out the imposter!
                </p>
              </div>
              <Link href="/tasks/4" className="mt-4">
                <Button variant="primary" className="w-full text-xs">ENTER SHUFFLED TABLE →</Button>
              </Link>
            </div>
          </div>

          {/* Leaderboard CTA */}
          <div className="mt-4 rounded border border-skeld-panel bg-skeld-void/80 p-4 flex items-center justify-between">
            <div>
              <span className="font-orbitron text-sm font-bold text-skeld-amber">
                Confidential Mission Telemetry
              </span>
              <p className="font-rajdhani text-xs text-gray-400">
                View your team's score breakdown. Overall leaderboard is projected on the NAB stage screen.
              </p>
            </div>
            <Link href="/leaderboard">
              <Button variant="primary" className="text-xs">VIEW MY TEAM</Button>
            </Link>
          </div>
        </Panel>
      </div>
    </main>
  )
}
