'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'quiz' | 'betting' | 'shuffling' | 'teams'>('quiz')
  const [loading, setLoading] = useState(true)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Quiz state
  const [quizLink, setQuizLink] = useState('https://kahoot.it')
  const [round1Declared, setRound1Declared] = useState(false)
  const [bettingOpen, setBettingOpen] = useState(false)
  const [teamsWithScores, setTeamsWithScores] = useState<Array<{ id: string; code: string; name: string; points: number }>>([])
  const [savingQuiz, setSavingQuiz] = useState(false)

  // Betting state
  const [betsList, setBetsList] = useState<any[]>([])

  // Shuffling state
  const [shufflingLoading, setShufflingLoading] = useState(false)
  const [shufflingResult, setShufflingResult] = useState<any>(null)

  const loadData = async () => {
    try {
      // 1. Fetch Quiz state & teams
      const qRes = await fetch('/api/admin/quiz')
      if (qRes.ok) {
        const qData = await qRes.json()
        setQuizLink(qData.quizLink)
        setRound1Declared(qData.round1Declared)
        setBettingOpen(qData.bettingOpen)
        setTeamsWithScores(qData.teams || [])
      }

      // 2. Fetch Bets
      const bRes = await fetch('/api/admin/betting')
      if (bRes.ok) {
        const bData = await bRes.json()
        setBetsList(bData.bets || [])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleScoreChange = (teamId: string, pts: number) => {
    setTeamsWithScores((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, points: pts } : t))
    )
  }

  const handleSaveQuizAndScores = async (declareResults: boolean) => {
    setSavingQuiz(true)
    setStatusMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizLink,
          scores: teamsWithScores.map((t) => ({ teamId: t.id, points: Number(t.points) || 0 })),
          declareResults,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatusMsg(
          declareResults
            ? '✓ Round 1 Results DECLARED! Tactical Betting is now open for all teams.'
            : '✓ Quiz settings and scores saved to master ledger.'
        )
        if (declareResults) {
          setRound1Declared(true)
          setBettingOpen(true)
        }
      } else {
        setErrorMsg(data.error || 'Failed to save quiz scores')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error')
    } finally {
      setSavingQuiz(false)
    }
  }

  const handleToggleBetting = async (newState: boolean) => {
    try {
      const res = await fetch('/api/admin/betting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bettingOpen: newState }),
      })
      if (res.ok) {
        setBettingOpen(newState)
        setStatusMsg(`Betting status set to: ${newState ? 'OPEN' : 'CLOSED'}`)
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  const handleTriggerShuffling = async () => {
    setShufflingLoading(true)
    setStatusMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/tasks/4/session', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setShufflingResult(data)
        setStatusMsg(`✓ Shuffling complete! Created ${data.totalTables} tables with ${data.totalPlayers} crewmates.`)
      } else {
        setErrorMsg(data.error || 'Shuffling failed. Verify at least 6 teams are checked in.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error')
    } finally {
      setShufflingLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="MISSION CONTROL: CENTRAL ADMIN TERMINAL" />

      <div className="mt-8 flex w-full max-w-5xl flex-col gap-6 px-4">
        {/* TOP STATUS BAR */}
        <div className="flex items-center justify-between rounded border border-skeld-amber/30 bg-black/50 p-4">
          <div>
            <h1 className="font-orbitron text-xl font-bold text-skeld-amber">
              Project Skeld Event Console
            </h1>
            <p className="font-rajdhani text-xs text-gray-400">
              Robotics Club NIT Warangal — Live Event Management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/display" target="_blank">
              <Button variant="primary" className="text-xs font-orbitron">
                OPEN PROJECTOR VIEW ↗
              </Button>
            </Link>
            <Link href="/api/auth/logout">
              <Button variant="ghost" className="text-xs">
                LOGOUT
              </Button>
            </Link>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {statusMsg && (
          <div className="rounded border border-skeld-green bg-skeld-green/20 p-3 font-rajdhani text-sm text-skeld-green">
            {statusMsg}
          </div>
        )}
        {errorMsg && (
          <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-glow-red">
            {errorMsg}
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-white/10 gap-2">
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-4 py-3 font-orbitron text-xs transition-all ${
              activeTab === 'quiz'
                ? 'border-b-2 border-skeld-cyan text-skeld-cyan font-bold bg-skeld-cyan/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            1. ROUND 1 QUIZ & SCORES
          </button>
          <button
            onClick={() => setActiveTab('betting')}
            className={`px-4 py-3 font-orbitron text-xs transition-all ${
              activeTab === 'betting'
                ? 'border-b-2 border-skeld-amber text-skeld-amber font-bold bg-skeld-amber/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            2. TACTICAL BETTING ({betsList.length})
          </button>
          <button
            onClick={() => setActiveTab('shuffling')}
            className={`px-4 py-3 font-orbitron text-xs transition-all ${
              activeTab === 'shuffling'
                ? 'border-b-2 border-purple-400 text-purple-400 font-bold bg-purple-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            3. TASK 4 SHUFFLING
          </button>
        </div>

        {/* TAB 1: ROUND 1 QUIZ & MANUAL LEADERBOARD */}
        {activeTab === 'quiz' && (
          <Panel variant="default" className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-skeld-cyan/30 pb-3">
              <div>
                <h2 className="font-orbitron text-lg font-bold text-white">
                  Round 1: Quiz Configuration & Manual Scoring
                </h2>
                <p className="font-rajdhani text-xs text-gray-300">
                  Enter or update the external quiz link, input team scores, and declare results to unlock betting.
                </p>
              </div>
              <span className={`rounded px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                round1Declared
                  ? 'bg-skeld-green/20 text-skeld-green border border-skeld-green'
                  : 'bg-skeld-amber/20 text-skeld-amber border border-skeld-amber'
              }`}>
                {round1Declared ? 'RESULTS DECLARED' : 'QUIZ IN PROGRESS'}
              </span>
            </div>

            {/* QUIZ LINK INPUT */}
            <div className="flex flex-col gap-2">
              <label className="font-orbitron text-xs text-gray-300 uppercase">
                Active Quiz Link (Displayed on Player Devices):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quizLink}
                  onChange={(e) => setQuizLink(e.target.value)}
                  placeholder="https://kahoot.it or Google Forms URL"
                  className="flex-1 rounded border border-skeld-cyan/40 bg-black/70 px-4 py-2 font-mono text-sm text-white focus:outline-none focus:border-skeld-cyan"
                />
                <Button
                  variant="primary"
                  onClick={() => handleSaveQuizAndScores(false)}
                  disabled={savingQuiz}
                  className="font-orbitron text-xs"
                >
                  SAVE LINK
                </Button>
              </div>
            </div>

            {/* TEAM SCORE ENTRY TABLE */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-orbitron text-xs uppercase tracking-wider text-gray-300">
                  Manual Round 1 Scores Entry ({teamsWithScores.length} Teams):
                </span>
                <span className="font-rajdhani text-xs text-gray-400">
                  Enter points earned from Quiz platform.
                </span>
              </div>

              <div className="overflow-x-auto max-h-96 rounded border border-white/10 bg-black/40">
                <table className="w-full text-left font-rajdhani text-sm">
                  <thead className="sticky top-0 bg-skeld-panel border-b border-white/10 font-orbitron text-xs text-gray-400">
                    <tr>
                      <th className="py-2.5 px-4">TEAM CODE</th>
                      <th className="py-2.5 px-4">TEAM NAME</th>
                      <th className="py-2.5 px-4 text-right">QUIZ POINTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {teamsWithScores.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="py-2.5 px-4 font-orbitron font-bold text-skeld-cyan">
                          {t.code}
                        </td>
                        <td className="py-2.5 px-4 text-white">{t.name}</td>
                        <td className="py-2.5 px-4 text-right">
                          <input
                            type="number"
                            min="0"
                            value={t.points}
                            onChange={(e) => handleScoreChange(t.id, Number(e.target.value))}
                            className="w-24 rounded border border-skeld-cyan/40 bg-black px-2 py-1 text-right font-mono text-white focus:outline-none focus:border-skeld-cyan"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => handleSaveQuizAndScores(false)}
                disabled={savingQuiz}
                className="flex-1 font-orbitron text-xs"
              >
                {savingQuiz ? 'SAVING...' : 'SAVE DRAFT SCORES'}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveQuizAndScores(true)}
                disabled={savingQuiz}
                className="flex-1 font-orbitron text-xs py-3"
              >
                {savingQuiz ? 'PROCESSING...' : 'COMMIT SCORES & DECLARE ROUND 1 (OPENS BETTING)'}
              </Button>
            </div>
          </Panel>
        )}

        {/* TAB 2: TACTICAL BETTING OVERVIEW */}
        {activeTab === 'betting' && (
          <Panel variant="amber" className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
              <div>
                <h2 className="font-orbitron text-lg font-bold text-skeld-amber">
                  Tactical Rank Betting Management
                </h2>
                <p className="font-rajdhani text-xs text-gray-300">
                  Inspect teams' predicted ranks. Close betting before Round 2 begins!
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={bettingOpen ? 'danger' : 'primary'}
                  onClick={() => handleToggleBetting(!bettingOpen)}
                  className="font-orbitron text-xs"
                >
                  {bettingOpen ? 'LOCK / CLOSE BETTING' : 'OPEN BETTING'}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded border border-white/10 bg-black/40">
              <table className="w-full text-left font-rajdhani text-sm">
                <thead className="bg-skeld-panel border-b border-white/10 font-orbitron text-xs text-gray-400">
                  <tr>
                    <th className="py-2.5 px-4">TEAM CODE</th>
                    <th className="py-2.5 px-4">TEAM NAME</th>
                    <th className="py-2.5 px-4 text-center">PREDICTED RANK</th>
                    <th className="py-2.5 px-4 text-right">PLACED AT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {betsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 font-rajdhani">
                        No bets placed yet. Ensure Round 1 results are declared!
                      </td>
                    </tr>
                  ) : (
                    betsList.map((b) => (
                      <tr key={b.id} className="hover:bg-white/5">
                        <td className="py-2.5 px-4 font-orbitron font-bold text-skeld-amber">
                          {b.teamCode}
                        </td>
                        <td className="py-2.5 px-4 text-white">{b.teamName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center rounded bg-skeld-amber/20 border border-skeld-amber/40 px-3 py-1 font-mono font-bold text-skeld-amber">
                            Rank #{b.predictedRank}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-gray-400">
                          {b.placedAt ? new Date(b.placedAt).toLocaleTimeString() : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* TAB 3: TASK 4 SHUFFLING */}
        {activeTab === 'shuffling' && (
          <Panel variant="default" className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-orbitron text-lg font-bold text-white">
                  Task 4: Table Shuffling Protocol
                </h2>
                <p className="font-rajdhani text-xs text-gray-300">
                  Shuffles checked-in players into tables of 6 (no two from the same team) and assigns 1 Imposter + 5 Crewmates.
                </p>
              </div>
            </div>

            <div className="rounded border border-purple-500/30 bg-purple-500/10 p-5 flex flex-col items-center gap-4 text-center">
              <span className="text-5xl">🔀</span>
              <h3 className="font-orbitron text-xl font-bold text-white">
                Automated Table Partitioning Engine
              </h3>
              <p className="max-w-lg font-rajdhani text-sm text-gray-300">
                When you initiate shuffling, all checked-in players will be partitioned into tables.
                Words are pulled from the 104-word pair database and secretly assigned to players' screens.
              </p>

              <Button
                variant="primary"
                onClick={handleTriggerShuffling}
                disabled={shufflingLoading}
                className="font-orbitron px-8 py-3 text-sm font-bold"
              >
                {shufflingLoading ? 'SHUFFLING TABLES...' : 'START TASK 4 SHUFFLING NOW'}
              </Button>
            </div>

            {shufflingResult && (
              <div className="rounded border border-skeld-green bg-skeld-green/20 p-4 text-center">
                <span className="font-orbitron text-sm text-skeld-green font-bold">
                  ✓ SHUFFLING SESSION ACTIVE
                </span>
                <p className="font-rajdhani text-sm text-white mt-1">
                  Active Tables: {shufflingResult.totalTables} | Total Players: {shufflingResult.totalPlayers}
                </p>
              </div>
            )}
          </Panel>
        )}
      </div>
    </main>
  )
}
