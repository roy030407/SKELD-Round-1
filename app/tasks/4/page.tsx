'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { HoldToReveal } from '@/components/ui/hold-to-reveal-button'
import { VotingMotif, VotingPlayer, CrewmateColor, PlayerState } from '@/components/ui/voting-motif'
import Link from 'next/link'

export default function Task4ShufflingGamePage() {
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<any>(null)
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null)
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [gameResult, setGameResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchState = async () => {
    try {
      const res = await fetch('/api/tasks/4/state')
      if (res.ok) {
        const data = await res.json()
        if (data.active) {
          setGameState(data.gameState)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleCastVote = async () => {
    if (!selectedTargetId || !gameState) return
    setError(null)
    try {
      const res = await fetch('/api/tasks/4/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: gameState.tableId,
          targetPlayerId: selectedTargetId,
          round: gameState.currentRound,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setVoteSubmitted(true)
        if (data.result?.gameOver) {
          setGameResult(data.result.winner === 'crewmates' ? 'CREWMATES WIN!' : 'IMPOSTER WINS!')
        }
      } else {
        setError(data.error || 'Vote submission failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void text-white">
        <div className="font-orbitron animate-pulse text-skeld-cyan">
          Connecting to Table Shuffling Protocol...
        </div>
      </main>
    )
  }

  if (!gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
        <EmergencyBanner text="TASK 4: TABLE SHUFFLING PROTOCOL" />
        <div className="mt-12 flex w-full max-w-xl flex-col items-center gap-6 px-4 text-center">
          <Panel variant="amber" className="flex flex-col items-center gap-4 py-8">
            <span className="text-5xl animate-bounce">🔀</span>
            <h2 className="font-orbitron text-2xl font-bold text-skeld-amber">
              Awaiting Shuffling Session
            </h2>
            <p className="font-rajdhani text-gray-300">
              Mission Control will shuffle all checked-in crewmates across tables in the NAB auditorium.
              Each table contains 6 players from 6 different teams (1 Imposter + 5 Crewmates).
            </p>
            <div className="rounded border border-skeld-cyan/30 bg-skeld-cyan/10 px-4 py-2 font-mono text-xs text-skeld-cyan">
              Keep this screen open. Your table assignment will appear automatically!
            </div>
          </Panel>
          <Link href="/player" className="font-rajdhani text-sm text-gray-400 hover:text-white">
            ← Return to Crew Command Hub
          </Link>
        </div>
      </main>
    )
  }

  const votingPlayers: VotingPlayer[] = (gameState.players || []).map((p: any) => ({
    id: p.playerId,
    name: p.name,
    color: (p.crewmateColor || 'cyan') as CrewmateColor,
    state: (selectedTargetId === p.playerId ? 'voted' : 'idle') as PlayerState,
  }))

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text={`TASK 4: SHUFFLED TABLE #${gameState.tableNumber}`} />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        {/* ASSIGNED WORD CARD (HOLD TO REVEAL) */}
        <Panel variant={gameState.isImposter ? 'red' : 'default'} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <span className="font-orbitron text-xs uppercase tracking-wider text-gray-400">
                Classified Identity
              </span>
              <h2 className="font-orbitron text-xl font-bold text-white">
                Table #{gameState.tableNumber} Assignment
              </h2>
            </div>
            <span
              className={`rounded px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                gameState.isImposter
                  ? 'bg-skeld-red/20 text-skeld-glow-red border border-skeld-red'
                  : 'bg-skeld-cyan/20 text-skeld-cyan border border-skeld-cyan'
              }`}
            >
              {gameState.isImposter ? 'IMPOSTER' : 'CREWMATE'}
            </span>
          </div>

          <p className="font-rajdhani text-sm text-gray-300">
            Do not let adjacent competitors see your screen! Hold the button below to inspect your secret word.
          </p>

          <HoldToReveal className="w-full">
            <div className="rounded border border-skeld-cyan/40 bg-black/80 p-6 text-center">
              <div className="font-orbitron text-xs text-skeld-cyan uppercase tracking-wider">
                Your Secret Assigned Word:
              </div>
              <div className="mt-2 font-mono text-3xl font-black text-white">
                "{gameState.assignedWord || 'CONFIDENTIAL'}"
              </div>
              <p className="mt-2 font-rajdhani text-sm text-gray-300">
                {gameState.isImposter
                  ? 'You are the IMPOSTER. Blend in and survive the voting rounds!'
                  : 'You are a CREWMATE. Find the player whose word does not match!'}
              </p>
            </div>
          </HoldToReveal>
        </Panel>

        {/* VOTING PROTOCOL */}
        <Panel variant="amber" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
            <div>
              <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-amber">
                Emergency Meeting
              </span>
              <h3 className="font-orbitron text-lg font-bold text-white">
                Voting Round #{gameState.currentRound}
              </h3>
            </div>
            <span className="font-mono text-xs text-gray-400">
              Votes Cast: {gameState.votesCount} / {gameState.currentRound === 1 ? '6' : '5'}
            </span>
          </div>

          {gameResult ? (
            <div className="rounded border border-skeld-green bg-skeld-green/20 p-6 text-center">
              <h2 className="font-orbitron text-2xl font-black text-skeld-green">
                {gameResult}
              </h2>
              <p className="mt-2 font-rajdhani text-white">
                Scores have been updated in the master ledger! Check the main auditorium screen.
              </p>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/leaderboard"
                  className="rounded bg-skeld-green px-6 py-2 font-orbitron text-sm font-bold text-black"
                >
                  VIEW MISSION TELEMETRY
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="font-rajdhani text-sm text-gray-300">
                Discuss with your tablemates. Identify the player whose word does not match the rest of the crew!
              </p>

              {/* TABLE MOTIF */}
              <VotingMotif players={votingPlayers} />

              {/* SELECT TARGET CREWMATE BUTTONS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {votingPlayers.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      if (!voteSubmitted) setSelectedTargetId(player.id)
                    }}
                    className={`rounded border p-2 text-center transition-all ${
                      selectedTargetId === player.id
                        ? 'border-skeld-red bg-skeld-red/30 text-white font-bold ring-2 ring-skeld-red'
                        : 'border-white/10 bg-black/40 text-gray-300 hover:border-white/30'
                    }`}
                  >
                    <div className="font-orbitron text-xs truncate">{player.name}</div>
                    <div className="font-mono text-[10px] text-gray-400 capitalize">{player.color}</div>
                  </button>
                ))}
              </div>

              {error && (
                <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-glow-red">
                  {error}
                </div>
              )}

              {voteSubmitted ? (
                <div className="rounded border border-skeld-cyan/40 bg-skeld-cyan/10 p-4 text-center font-orbitron text-sm text-skeld-cyan">
                  ✓ YOUR VOTE HAS BEEN RECORDED. WAITING FOR OTHER PLAYERS...
                </div>
              ) : (
                <Button
                  variant="danger"
                  disabled={!selectedTargetId}
                  onClick={handleCastVote}
                  className="w-full font-orbitron"
                >
                  CAST VOTE AGAINST SELECTED CREWMATE
                </Button>
              )}
            </div>
          )}
        </Panel>

        <div className="flex justify-center">
          <Link
            href="/player"
            className="font-rajdhani text-sm text-gray-400 hover:text-skeld-cyan"
          >
            ← Return to Crew Command Hub
          </Link>
        </div>
      </div>
    </main>
  )
}
