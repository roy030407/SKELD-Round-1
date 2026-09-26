'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { VotingMotif, VotingPlayer } from '@/components/ui/voting-motif'
import { HoldToReveal } from '@/components/ui/hold-to-reveal-button'
import Link from 'next/link'

export default function Task4ShufflingPage() {
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
        if (data.active && data.assigned) {
          setGameState(data)
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
          setGameResult(data.result.winner === 'crewmates' ? 'CREWMATES WIN! IMPOSTER CAUGHT!' : 'IMPOSTER WINS! THEY SURVIVED!')
        }
      } else {
        setError(data.error || 'Failed to submit vote')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-skeld-void text-white">
        <p className="font-orbitron animate-pulse text-skeld-cyan">Preparing Shuffling Protocol...</p>
      </main>
    )
  }

  if (!gameState) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void p-4 text-white">
        <Panel variant="amber" className="max-w-md text-center">
          <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
            Task 4: Table Shuffling Protocol
          </h1>
          <p className="mt-4 font-rajdhani text-gray-300">
            Waiting for organizers to initiate the table shuffle. You will be assigned to a cross-team table.
          </p>
          <p className="mt-2 font-rajdhani text-xs text-gray-500">
            This page auto-refreshes every 3 seconds.
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

  // Format players for VotingMotif
  const motifPlayers: VotingPlayer[] = gameState.players.map((p: any) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    state: p.hasVoted ? 'voted' : ('idle' as const),
    isYou: p.isYou,
  }))

  const me = gameState.players.find((p: any) => p.isYou)

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text={`TABLE ${gameState.tableNumber}: SHUFFLING PROTOCOL — ROUND ${gameState.currentRound}`} />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-8 px-4">
        {gameResult ? (
          <Panel variant="red" className="text-center p-8">
            <h2 className="font-bangers text-4xl text-skeld-glow-red animate-pulse">
              {gameResult}
            </h2>
            <p className="mt-4 font-rajdhani text-lg text-gray-200">
              Task 4 is complete. Scores have been recorded.
            </p>
            <div className="mt-6">
              <Link href="/leaderboard">
                <Button variant="ghost">VIEW LEADERBOARD →</Button>
              </Link>
            </div>
          </Panel>
        ) : (
          <>
            {/* Word Reveal */}
            {me && (
              <Panel variant="amber" className="flex flex-col items-center text-center">
                <span className="font-orbitron text-xs uppercase tracking-widest text-skeld-amber/80">
                  Secret Identity — Task 4
                </span>
                <p className="mt-1 font-rajdhani text-sm text-gray-400">
                  Hold to reveal your role and word. Do not show your screen!
                </p>
                <div className="mt-4">
                  <HoldToReveal duration={1200}>
                    <div className="flex flex-col items-center gap-2">
                      <span className="font-pixel text-2xl font-bold text-skeld-glow-red">
                        {me.yourWord ?? 'WORD TBD'}
                      </span>
                      <span className="font-orbitron text-xs text-gray-400">
                        {me.isImposter ? '⚠️ YOU ARE THE IMPOSTER' : '✓ YOU ARE A CREWMATE'}
                      </span>
                    </div>
                  </HoldToReveal>
                </div>
              </Panel>
            )}

            {/* Security Map */}
            <Panel className="flex flex-col items-center">
              <span className="mb-2 font-orbitron text-xs uppercase tracking-wider text-gray-400">
                Security Table
              </span>
              <VotingMotif players={motifPlayers} />
            </Panel>

            {/* Voting Controls */}
            <Panel variant="amber" className="flex flex-col gap-4">
              <h3 className="font-orbitron text-sm uppercase text-skeld-amber">
                Cast Your Vote (Round {gameState.currentRound} of 2)
              </h3>

              {error && (
                <div className="rounded border border-skeld-red bg-skeld-red/20 p-2 font-rajdhani text-xs text-skeld-red">
                  {error}
                </div>
              )}

              {voteSubmitted ? (
                <div className="rounded border border-green-500/50 bg-green-900/20 p-3 text-center font-rajdhani text-sm text-green-400">
                  ✓ Vote cast. Waiting for tablemates...
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {gameState.players
                      .filter((p: any) => !p.isYou)
                      .map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedTargetId(p.id)}
                          className={`flex items-center justify-between rounded border p-2 text-left font-rajdhani text-sm transition-all ${
                            selectedTargetId === p.id
                              ? 'border-skeld-amber bg-skeld-amber/20 text-white font-bold'
                              : 'border-skeld-panel bg-skeld-void/50 text-gray-300 hover:border-skeld-amber/50'
                          }`}
                        >
                          <span>{p.name}</span>
                          <span className="text-xs uppercase font-mono text-gray-500">{p.color}</span>
                        </button>
                      ))}
                  </div>

                  <Button
                    variant="danger"
                    onClick={handleCastVote}
                    disabled={!selectedTargetId}
                    className="mt-2 w-full"
                  >
                    CONFIRM VOTE
                  </Button>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </main>
  )
}
