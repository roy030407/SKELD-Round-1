'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task1QuizBettingPage() {
  const [loading, setLoading] = useState(true)
  const [quizLink, setQuizLink] = useState<string | null>(null)
  const [round1Declared, setRound1Declared] = useState(false)
  const [bettingOpen, setBettingOpen] = useState(false)
  const [existingBet, setExistingBet] = useState<number | null>(null)
  const [predictedRank, setPredictedRank] = useState<string>('1')
  const [betMsg, setBetMsg] = useState('')
  const [submittingBet, setSubmittingBet] = useState(false)

  async function load() {
    try {
      const [quizRes, betRes] = await Promise.all([
        fetch('/api/tasks/1/quiz'),
        fetch('/api/bet'),
      ])
      if (quizRes.ok) {
        const q = await quizRes.json()
        setQuizLink(q.quizLink)
        setRound1Declared(q.round1Declared)
        setBettingOpen(q.bettingOpen)
      }
      if (betRes.ok) {
        const b = await betRes.json()
        setExistingBet(b.bet?.predictedRank ?? null)
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

  async function handlePlaceBet() {
    setSubmittingBet(true)
    setBetMsg('')
    try {
      const res = await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictedRank: parseInt(predictedRank, 10) }),
      })
      const data = await res.json()
      if (res.ok) {
        setExistingBet(parseInt(predictedRank, 10))
        setBetMsg(`✓ Bet placed! You predicted rank #${predictedRank}`)
      } else {
        setBetMsg(data.error ?? 'Error placing bet.')
      }
    } catch (err: any) {
      setBetMsg(err.message)
    } finally {
      setSubmittingBet(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-skeld-void text-white">
        <p className="font-orbitron animate-pulse text-skeld-cyan">Loading mission briefing...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 1: QUIZ MISSION & BETTING STATION" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-8 px-4">
        {/* Quiz Link Section */}
        <Panel className="flex flex-col gap-4">
          <h2 className="font-orbitron text-xl font-bold text-skeld-cyan">
            Round 1 — Quiz Mission
          </h2>
          <p className="font-rajdhani text-sm text-gray-300">
            Your team must complete the quiz. Click the link below when instructed by the organizers.
          </p>

          {quizLink && (
            <a
              href={quizLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded border border-skeld-cyan bg-skeld-cyan/10 px-4 py-4 font-orbitron text-sm font-bold text-skeld-cyan hover:bg-skeld-cyan/20 transition-colors"
            >
              ENTER QUIZ MISSION ↗
            </a>
          )}

          {!round1Declared && (
            <div className="rounded border border-skeld-amber/40 bg-skeld-amber/5 p-3">
              <p className="font-rajdhani text-xs text-skeld-amber">
                ⏳ Waiting for results to be declared by organizers…
              </p>
            </div>
          )}
          {round1Declared && (
            <div className="rounded border border-green-500/40 bg-green-500/10 p-3">
              <p className="font-rajdhani text-sm text-green-400">
                ✓ Round 1 results have been declared! Scroll down to place your rank bet.
              </p>
            </div>
          )}
        </Panel>

        {/* Betting Station — only shown after Round 1 declared */}
        {round1Declared && (
          <Panel variant="amber" className="flex flex-col gap-4">
            <h2 className="font-orbitron text-xl font-bold text-skeld-amber">
              Betting Station
            </h2>
            <p className="font-rajdhani text-sm text-gray-300">
              Predict your team's <strong>final rank</strong> (1–25) after all tasks are complete.
              Exact match = <span className="text-green-400">+10 pts</span>. Wrong = <span className="text-skeld-red">-10 pts</span>.
            </p>

            {!bettingOpen ? (
              <div className="rounded border border-skeld-amber/40 bg-skeld-amber/5 p-3">
                <p className="font-rajdhani text-xs text-skeld-amber">
                  ⏳ Betting window not yet open. Wait for the organizers.
                </p>
              </div>
            ) : existingBet !== null ? (
              <div className="rounded border border-green-500/40 bg-green-500/10 p-4 text-center">
                <p className="font-orbitron text-sm text-green-400">✓ BET LOCKED IN</p>
                <p className="font-rajdhani text-lg text-white mt-1">You predicted: <strong>Rank #{existingBet}</strong></p>
                <p className="font-rajdhani text-xs text-gray-400 mt-1">Only one bet per team is allowed.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <label className="font-rajdhani text-sm text-gray-300 whitespace-nowrap">Predicted Rank:</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={predictedRank}
                    onChange={(e) => setPredictedRank(e.target.value)}
                    className="w-24 rounded border border-skeld-amber bg-skeld-void/50 px-3 py-2 font-mono text-lg text-center text-white focus:outline-none focus:border-skeld-cyan"
                  />
                  <span className="font-rajdhani text-sm text-gray-400">(1–25)</span>
                </div>

                {betMsg && (
                  <p className={`font-rajdhani text-sm ${betMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                    {betMsg}
                  </p>
                )}

                <Button
                  variant="primary"
                  onClick={handlePlaceBet}
                  disabled={submittingBet}
                  className="w-full"
                >
                  {submittingBet ? 'Placing Bet...' : 'LOCK IN BET'}
                </Button>
                <p className="font-rajdhani text-xs text-gray-500">
                  ⚠ Only the team leader should place the bet. One bet per team.
                </p>
              </div>
            )}
          </Panel>
        )}

        <div className="text-center">
          <Link href="/player" className="font-rajdhani text-sm text-skeld-cyan hover:underline">
            ← Return to Player Hub
          </Link>
        </div>
      </div>
    </main>
  )
}
