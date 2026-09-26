'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import Link from 'next/link'

export default function PlayerHubPage() {
  const [loading, setLoading] = useState(true)
  const [teamStatus, setTeamStatus] = useState<{ checkedInCount: number; totalPlayers: number; isFullyCheckedIn: boolean } | null>(null)
  const [justRegisteredCode, setJustRegisteredCode] = useState<string | null>(null)

  useEffect(() => {
    // Registration now checks the player in automatically (arriving at the
    // venue in person and registering IS check-in), so this is read-only
    // team-roster info, not a manual "confirm" action anymore.
    fetch('/api/check-in/status')
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) window.location.href = '/login'
          return
        }
        const data = await res.json()
        if (data.status) setTeamStatus(data.status)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    // One-time "save this" banner right after registering, then never again.
    const code = sessionStorage.getItem('justRegisteredCode')
    if (code) {
      setJustRegisteredCode(code)
      sessionStorage.removeItem('justRegisteredCode')
    }
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="PLAYER COMMAND HUB" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        {justRegisteredCode && (
          <Panel variant="red" className="flex flex-col gap-1 text-center">
            <span className="font-orbitron text-xs font-bold text-skeld-red">SAVE YOUR PLAYER CODE</span>
            <p className="font-mono text-2xl font-bold text-white">{justRegisteredCode}</p>
            <p className="font-rajdhani text-xs text-gray-400">
              You&apos;ll need this plus your roll number to log back in on another device.
            </p>
          </Panel>
        )}

        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
            <div>
              <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
                Crewmate Terminal
              </h1>
              <p className="font-rajdhani text-sm text-gray-400">
                Welcome to Project Skeld Round 1. Follow the mission stages below.
              </p>
            </div>
            <Link href="/api/auth/logout">
              <Button variant="ghost" className="text-xs px-2 py-1">
                LOGOUT
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Team status - check-in happens automatically at registration now,
                this is just a live view of who else on the team has arrived. */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-cyan/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-cyan">CREW STATUS</span>
                  <StatusPill status={teamStatus?.isFullyCheckedIn ? 'complete' : 'waiting'} />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">
                  {teamStatus ? `${teamStatus.checkedInCount}/${teamStatus.totalPlayers} crewmates here` : 'Loading...'}
                </h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Tasks unlock once your whole team has registered.
                </p>
              </div>
            </div>

            {/* Task 1: Quiz + Betting */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-cyan/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-cyan">TASK 1</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Quiz &amp; Betting</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Complete the mission quiz, then bet on your final rank.
                </p>
              </div>
              <Link href="/tasks/1" className="mt-4">
                <Button variant="ghost" className="w-full text-xs">OPEN QUIZ →</Button>
              </Link>
            </div>

            {/* Task 2: Cipher */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-panel bg-skeld-void/60 p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-gray-400">TASK 2</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Cipher Puzzle</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Team-based cryptographic decryption challenge.
                </p>
              </div>
              <Link href="/tasks/2" className="mt-4">
                <Button variant="ghost" className="w-full text-xs">OPEN CIPHER →</Button>
              </Link>
            </div>

            {/* Task 3: Bomb Defusal */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-panel bg-skeld-void/60 p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-gray-400">TASK 3</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Bomb Defusal</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Cooperative reactor module stabilization.
                </p>
              </div>
              <Link href="/tasks/3" className="mt-4">
                <Button variant="ghost" className="w-full text-xs">DEFUSAL MODULE →</Button>
              </Link>
            </div>

            {/* Task 4: Imposter Game */}
            <div className="flex flex-col justify-between rounded-lg border border-skeld-red/40 bg-skeld-panel p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-orbitron text-xs font-bold text-skeld-red">TASK 4</span>
                  <StatusPill status="waiting" />
                </div>
                <h3 className="font-orbitron text-base font-bold text-white mt-2">Imposter Word Game</h3>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">
                  Receive secret word, debate tablemates, and catch the imposter.
                </p>
              </div>
              <Link href="/tasks/4" className="mt-4">
                <Button variant="danger" className="w-full text-xs">ENTER AIRLOCK →</Button>
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  )
}
