'use client'

import { useState, useEffect } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import Link from 'next/link'

type Tab = 'quiz' | 'betting' | 'task4' | 'settling'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('quiz')

  // --- Round 1 Quiz State ---
  const [quizLink, setQuizLink] = useState('https://kahoot.it')
  const [round1Declared, setRound1Declared] = useState(false)
  const [bettingOpen, setBettingOpen] = useState(false)
  const [teamScores, setTeamScores] = useState<{ id: string; code: string; name: string; points: number }[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizMsg, setQuizMsg] = useState('')

  // --- Betting State ---
  const [betList, setBetList] = useState<any[]>([])
  const [betsSettled, setBetsSettled] = useState(false)
  const [betLoading, setBetLoading] = useState(false)
  const [betMsg, setBetMsg] = useState('')

  // --- Task 4 State ---
  const [t4Msg, setT4Msg] = useState('')
  const [t4Loading, setT4Loading] = useState(false)

  useEffect(() => {
    loadQuizState()
    loadBettingState()
  }, [])

  async function loadQuizState() {
    const res = await fetch('/api/admin/quiz')
    if (res.ok) {
      const data = await res.json()
      setQuizLink(data.quizLink ?? 'https://kahoot.it')
      setRound1Declared(data.round1Declared ?? false)
      setBettingOpen(data.bettingOpen ?? false)
      setTeamScores(data.teams ?? [])
    }
  }

  async function loadBettingState() {
    const res = await fetch('/api/admin/betting')
    if (res.ok) {
      const data = await res.json()
      setBetList(data.bets ?? [])
      setBetsSettled(data.betsSettled ?? false)
    }
  }

  async function handleSaveQuizLink() {
    setQuizLoading(true)
    setQuizMsg('')
    const res = await fetch('/api/admin/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizLink }),
    })
    const data = await res.json()
    setQuizMsg(res.ok ? '✓ Quiz link saved.' : data.error)
    setQuizLoading(false)
  }

  async function handleSaveScores() {
    setQuizLoading(true)
    setQuizMsg('')
    const res = await fetch('/api/admin/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: teamScores.map((t) => ({ teamId: t.id, points: t.points })) }),
    })
    const data = await res.json()
    setQuizMsg(res.ok ? '✓ Scores saved.' : data.error)
    setQuizLoading(false)
  }

  async function handleDeclareResults() {
    if (!confirm('Declare Round 1 results and OPEN BETTING? This cannot be undone.')) return
    setQuizLoading(true)
    setQuizMsg('')
    const res = await fetch('/api/admin/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ declareResults: true }),
    })
    if (res.ok) {
      setRound1Declared(true)
      setBettingOpen(true)
      setQuizMsg('✓ Results declared. Betting is now OPEN.')
    }
    setQuizLoading(false)
  }

  async function handleToggleBetting(open: boolean) {
    setBetLoading(true)
    const res = await fetch('/api/admin/betting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bettingOpen: open }),
    })
    if (res.ok) {
      setBettingOpen(open)
      setBetMsg(open ? 'Betting is now OPEN.' : 'Betting is now CLOSED.')
    }
    setBetLoading(false)
  }

  async function handleSettleBets() {
    if (!confirm('SETTLE ALL BETS? This will finalize +10/-10 for every team and cannot be undone.')) return
    setBetLoading(true)
    setBetMsg('')
    const res = await fetch('/api/admin/settle-bets', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setBetsSettled(true)
      setBetMsg(`✓ Bets settled for ${data.results?.length ?? 0} teams.`)
    } else {
      setBetMsg(data.error ?? 'Error settling bets.')
    }
    setBetLoading(false)
  }

  async function handleStartTask4() {
    if (!confirm('Shuffle all players into Task 4 tables? This cannot be undone.')) return
    setT4Loading(true)
    setT4Msg('')
    const res = await fetch('/api/tasks/4/session', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setT4Msg(`✓ Task 4 started: ${data.tables?.length ?? 0} tables created.`)
    } else {
      setT4Msg(data.error ?? 'Error starting Task 4.')
    }
    setT4Loading(false)
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 font-orbitron text-xs uppercase tracking-wider border-b-2 transition-colors ${
      tab === t
        ? 'border-skeld-cyan text-skeld-cyan'
        : 'border-transparent text-gray-400 hover:text-gray-200'
    }`

  return (
    <main className="flex min-h-screen flex-col bg-skeld-void text-white">
      <EmergencyBanner text="MISSION CONTROL — ADMIN CONSOLE" />

      <div className="mx-auto w-full max-w-4xl px-4 pt-6 pb-20">
        {/* Tab Nav */}
        <div className="flex gap-0 border-b border-skeld-panel/40 mb-6">
          <button className={tabClass('quiz')} onClick={() => setTab('quiz')}>Round 1 Quiz</button>
          <button className={tabClass('betting')} onClick={() => setTab('betting')}>Betting</button>
          <button className={tabClass('task4')} onClick={() => setTab('task4')}>Task 4 Shuffle</button>
          <button className={tabClass('settling')} onClick={() => setTab('settling')}>Settle Bets</button>
        </div>

        {/* === Round 1 Quiz Tab === */}
        {tab === 'quiz' && (
          <div className="flex flex-col gap-6">
            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-lg font-bold text-skeld-cyan">Quiz Link</h2>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={quizLink}
                  onChange={(e) => setQuizLink(e.target.value)}
                  className="flex-1 rounded border border-skeld-panel bg-skeld-void/50 px-3 py-2 font-rajdhani text-sm text-white placeholder-gray-500 focus:border-skeld-cyan focus:outline-none"
                  placeholder="https://kahoot.it/challenge/..."
                />
                <Button variant="primary" onClick={handleSaveQuizLink} disabled={quizLoading}>
                  SAVE
                </Button>
              </div>
              {quizMsg && (
                <p className={`font-rajdhani text-sm ${quizMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                  {quizMsg}
                </p>
              )}
            </Panel>

            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-lg font-bold text-skeld-amber">Manual Team Scores</h2>
              <p className="font-rajdhani text-sm text-gray-400">
                Enter quiz scores for each team, then click SAVE SCORES.
              </p>
              <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
                {teamScores.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 rounded border border-skeld-panel/40 px-3 py-2">
                    <span className="font-orbitron text-xs text-skeld-cyan w-16">{t.code}</span>
                    <span className="font-rajdhani text-sm text-gray-300 flex-1">{t.name}</span>
                    <input
                      type="number"
                      min={0}
                      value={t.points}
                      onChange={(e) => {
                        const updated = [...teamScores]
                        updated[i] = { ...t, points: parseInt(e.target.value, 10) || 0 }
                        setTeamScores(updated)
                      }}
                      className="w-20 rounded border border-skeld-panel bg-skeld-void/50 px-2 py-1 font-mono text-sm text-white text-right focus:border-skeld-amber focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleSaveScores} disabled={quizLoading}>
                  SAVE SCORES
                </Button>
                {!round1Declared && (
                  <Button variant="danger" onClick={handleDeclareResults} disabled={quizLoading}>
                    DECLARE RESULTS & OPEN BETTING
                  </Button>
                )}
                {round1Declared && (
                  <span className="font-rajdhani text-sm text-green-400 self-center">✓ Round 1 Declared</span>
                )}
              </div>
            </Panel>
          </div>
        )}

        {/* === Betting Tab === */}
        {tab === 'betting' && (
          <div className="flex flex-col gap-6">
            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-lg font-bold text-skeld-amber">Betting Status</h2>
              <div className="flex gap-3 items-center">
                <span className="font-rajdhani text-sm text-gray-300">
                  Betting is currently: <span className={bettingOpen ? 'text-green-400' : 'text-skeld-red'}>{bettingOpen ? 'OPEN' : 'CLOSED'}</span>
                </span>
                <Button variant="ghost" onClick={() => handleToggleBetting(!bettingOpen)} disabled={betLoading}>
                  {bettingOpen ? 'CLOSE BETTING' : 'OPEN BETTING'}
                </Button>
              </div>
              {betMsg && (
                <p className={`font-rajdhani text-sm ${betMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                  {betMsg}
                </p>
              )}
            </Panel>

            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-base font-bold text-gray-200">All Bets Placed</h2>
              {betList.length === 0 ? (
                <p className="font-rajdhani text-sm text-gray-500">No bets placed yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {betList.map((b) => (
                    <div key={b.teamId} className="flex justify-between rounded border border-skeld-panel/40 px-3 py-2">
                      <span className="font-orbitron text-xs text-skeld-cyan">{b.teamCode}</span>
                      <span className="font-rajdhani text-sm text-gray-300">{b.teamName}</span>
                      <span className="font-mono text-sm text-skeld-amber">Rank #{b.predictedRank}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* === Task 4 Shuffle Tab === */}
        {tab === 'task4' && (
          <Panel className="flex flex-col gap-4">
            <h2 className="font-orbitron text-lg font-bold text-skeld-red">Task 4: Table Shuffle</h2>
            <p className="font-rajdhani text-sm text-gray-300">
              This will shuffle all registered players into cross-team tables of 6 and assign roles for the Imposter round.
              Only do this once everyone is ready.
            </p>
            <Button variant="danger" onClick={handleStartTask4} disabled={t4Loading}>
              {t4Loading ? 'Shuffling...' : 'START TABLE SHUFFLE (TASK 4)'}
            </Button>
            {t4Msg && (
              <p className={`font-rajdhani text-sm ${t4Msg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                {t4Msg}
              </p>
            )}
          </Panel>
        )}

        {/* === Settle Bets Tab === */}
        {tab === 'settling' && (
          <Panel className="flex flex-col gap-6">
            <h2 className="font-orbitron text-lg font-bold text-skeld-cyan">Finalize Rankings & Settle Bets</h2>
            <p className="font-rajdhani text-sm text-gray-300">
              Once ALL tasks are complete, click this to compare every team's predicted rank vs their actual
              final rank. Exact match = <span className="text-green-400">+10 pts</span>, any other outcome = <span className="text-skeld-red">-10 pts</span>.
            </p>
            <div className="rounded border border-skeld-amber/40 bg-skeld-amber/10 p-3">
              <p className="font-orbitron text-xs uppercase text-skeld-amber">⚠ CAUTION — IRREVERSIBLE</p>
              <p className="font-rajdhani text-sm text-gray-300 mt-1">
                This action settles all bets and cannot be undone. Ensure all tasks are complete before proceeding.
              </p>
            </div>
            {betsSettled ? (
              <p className="font-rajdhani text-green-400">✓ Bets have already been settled.</p>
            ) : (
              <Button variant="danger" onClick={handleSettleBets} disabled={betLoading}>
                {betLoading ? 'Settling...' : 'SETTLE BETS & FINALIZE RANKINGS'}
              </Button>
            )}
            {betMsg && !betMsg.startsWith('Betting') && (
              <p className={`font-rajdhani text-sm ${betMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                {betMsg}
              </p>
            )}
          </Panel>
        )}
      </div>
    </main>
  )
}
