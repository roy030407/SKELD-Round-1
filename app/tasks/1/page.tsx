'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task1QuizPage() {
  const [loading, setLoading] = useState(true)
  const [quizLink, setQuizLink] = useState('https://kahoot.it')
  const [round1Declared, setRound1Declared] = useState(false)
  const [bettingOpen, setBettingOpen] = useState(false)
  const [currentBet, setCurrentBet] = useState<number | null>(null)
  const [selectedRank, setSelectedRank] = useState<number>(1)
  const [submittingBet, setSubmittingBet] = useState(false)
  const [betSuccessMsg, setBetSuccessMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      // 1. Fetch bet & round 1 status
      const betRes = await fetch('/api/bet')
      if (betRes.ok) {
        const bData = await betRes.json()
        setRound1Declared(bData.round1Declared)
        setBettingOpen(bData.bettingOpen)
        setCurrentBet(bData.currentBet)
      }

      // 2. Fetch quiz link from public endpoint or fallback
      const stateRes = await fetch('/api/tasks/1/quiz')
      if (stateRes.ok) {
        const sData = await stateRes.json()
        if (sData.quizLink) setQuizLink(sData.quizLink)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [])

  const handlePlaceBet = async () => {
    setSubmittingBet(true)
    setError(null)
    setBetSuccessMsg(null)
    try {
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictedRank: selectedRank }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentBet(selectedRank)
        setBetSuccessMsg(data.message || `Bet confirmed for Rank #${selectedRank}!`)
      } else {
        setError(data.error || 'Failed to place bet')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSubmittingBet(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 1: MISSION KNOWLEDGE QUIZ" />

      <div className="mt-8 flex w-full max-w-xl flex-col gap-6 px-4">
        {/* QUIZ PORTAL CARD */}
        <Panel variant="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-cyan/30 pb-3">
            <div>
              <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-cyan">
                Round 1 of 4
              </span>
              <h2 className="font-orbitron text-xl font-bold text-white">
                Auditorium Quiz Protocol
              </h2>
            </div>
            <span className={`rounded px-2.5 py-1 font-mono text-xs font-bold uppercase ${
              round1Declared
                ? 'bg-skeld-green/20 text-skeld-green border border-skeld-green/40'
                : 'bg-skeld-amber/20 text-skeld-amber border border-skeld-amber/40 animate-pulse'
            }`}>
              {round1Declared ? 'RESULTS DECLARED' : 'LIVE / IN PROGRESS'}
            </span>
          </div>

          <p className="font-rajdhani text-gray-300">
            All crewmates must participate in the knowledge screening quiz on the central platform. 
            Score as high as possible to establish your baseline team standing.
          </p>

          <div className="rounded border border-skeld-cyan/40 bg-skeld-cyan/10 p-5 text-center flex flex-col items-center gap-3">
            <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-cyan">
              Central Quiz Session
            </span>
            <a
              href={quizLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded bg-skeld-cyan px-6 py-3 font-orbitron text-sm font-bold text-black transition-all hover:bg-white hover:scale-105"
            >
              LAUNCH QUIZ PLATFORM ↗
            </a>
            <span className="font-mono text-xs text-gray-400 break-all">{quizLink}</span>
          </div>

          <div className="rounded border border-white/10 bg-black/40 p-4 font-rajdhani text-sm text-gray-300">
            <p className="font-bold text-white mb-1">Mission Control Instructions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click the link above to join the quiz room.</li>
              <li>Use your team name or player identifier as directed in the auditorium.</li>
              <li>Once the quiz concludes, Mission Control will declare official scores on the main projector screen.</li>
            </ul>
          </div>
        </Panel>

        {/* BETTING STATION: Unlocks after Round 1 results are declared */}
        <Panel variant={round1Declared ? 'amber' : 'default'} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎲</span>
              <h3 className="font-orbitron text-lg font-bold text-skeld-amber">
                TACTICAL RANK BETTING
              </h3>
            </div>
            <span className="font-mono text-xs text-gray-400">
              {round1Declared ? (bettingOpen ? 'BETTING OPEN' : 'BETTING CLOSED') : 'LOCKED'}
            </span>
          </div>

          {!round1Declared ? (
            <div className="py-6 text-center">
              <p className="font-rajdhani text-gray-400">
                🔒 Tactical betting unlocks immediately after Round 1 Quiz results are declared by Mission Control.
              </p>
              <p className="mt-2 font-mono text-xs text-skeld-amber">
                Keep an eye on the main stage screen!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded border border-skeld-amber/30 bg-skeld-amber/10 p-3 font-rajdhani text-sm text-gray-200">
                <span className="font-bold text-skeld-amber">Betting Rule: </span>
                Predict your team's exact final tournament rank (1 to 25).
                <br />
                <span className="text-skeld-green font-bold">✓ Exact Match: +10 Bonus Points</span>
                <span className="mx-2 text-gray-500">|</span>
                <span className="text-skeld-glow-red font-bold">✗ Incorrect: -10 Point Penalty</span>
              </div>

              {currentBet !== null ? (
                <div className="rounded border border-skeld-green bg-skeld-green/20 p-4 text-center">
                  <div className="font-orbitron text-xs text-skeld-green uppercase tracking-wider">
                    CURRENT BET CONFIRMED
                  </div>
                  <div className="mt-1 font-orbitron text-2xl font-black text-white">
                    PREDICTED RANK: #{currentBet}
                  </div>
                  <p className="mt-1 font-rajdhani text-xs text-gray-300">
                    Your bet is registered in the ledger. You can update it below as long as betting remains open.
                  </p>
                </div>
              ) : null}

              {bettingOpen ? (
                <div className="flex flex-col gap-3">
                  <label className="font-orbitron text-xs text-gray-300 uppercase">
                    Select Predicted Final Rank:
                  </label>
                  <select
                    value={selectedRank}
                    onChange={(e) => setSelectedRank(Number(e.target.value))}
                    className="w-full rounded border border-skeld-amber/40 bg-black/70 px-4 py-3 font-orbitron text-lg text-white focus:outline-none focus:border-skeld-amber"
                  >
                    {Array.from({ length: 25 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        Rank #{r} {r <= 8 ? '⭐ (Round 2 Qualification)' : ''}
                      </option>
                    ))}
                  </select>

                  {error && (
                    <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-glow-red">
                      {error}
                    </div>
                  )}

                  {betSuccessMsg && (
                    <div className="rounded border border-skeld-green bg-skeld-green/20 p-3 font-rajdhani text-sm text-skeld-green">
                      {betSuccessMsg}
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handlePlaceBet}
                    disabled={submittingBet}
                    className="w-full font-orbitron"
                  >
                    {submittingBet ? 'RECORDING BET...' : currentBet ? 'UPDATE BET' : 'CONFIRM & LOCK IN BET'}
                  </Button>
                </div>
              ) : (
                <div className="text-center font-rajdhani text-gray-400 py-3">
                  Betting is currently closed by Mission Control.
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* PROCEED TO ROUND 2 */}
        {round1Declared && (
          <div className="flex justify-center">
            <Link
              href="/tasks/2"
              className="inline-flex items-center justify-center gap-2 rounded bg-skeld-green px-8 py-4 font-orbitron text-base font-bold text-black transition-all hover:bg-white hover:scale-105"
            >
              PROCEED TO TASK 2: CIPHER MISSION →
            </Link>
          </div>
        )}

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
