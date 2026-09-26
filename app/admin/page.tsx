'use client'

import { useState, useEffect } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import Link from 'next/link'

type Tab = 'quiz' | 'bombdefusal' | 'betting' | 'task4' | 'settling' | 'gates' | 'leaderboard'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('quiz')

  // --- Round 1 Quiz State ---
  const [quizLink, setQuizLink] = useState('https://wayground.com/join?gc=940315&source=liveDashboard')
  const [round1Declared, setRound1Declared] = useState(false)
  const [bettingOpen, setBettingOpen] = useState(false)
  const [teamScores, setTeamScores] = useState<{ id: string; code: string; name: string; points: number }[]>([])
  const [quizLoading, setQuizLoading] = useState(false)
  const [quizMsg, setQuizMsg] = useState('')

  // --- Bomb Defusal (Task 3) State ---
  const [bombDefusalLink, setBombDefusalLink] = useState('https://vedant-jadhav-23.github.io/BombDefusalTask/')
  const [bombDefusalTeams, setBombDefusalTeams] = useState<{ id: string; code: string; name: string; points: number; completed: boolean }[]>([])
  const [bombDefusalLoading, setBombDefusalLoading] = useState(false)
  const [bombDefusalMsg, setBombDefusalMsg] = useState('')

  // --- Betting State ---
  const [betList, setBetList] = useState<any[]>([])
  const [betsSettled, setBetsSettled] = useState(false)
  const [betLoading, setBetLoading] = useState(false)
  const [betMsg, setBetMsg] = useState('')

  // --- Task 4 State ---
  const [t4Msg, setT4Msg] = useState('')
  const [t4Loading, setT4Loading] = useState(false)

  // --- Task Gates State ---
  const [taskStates, setTaskStates] = useState<{ taskNumber: number; closed: boolean }[]>([
    { taskNumber: 1, closed: false },
    { taskNumber: 2, closed: false },
    { taskNumber: 3, closed: false },
    { taskNumber: 4, closed: false },
  ])
  const [gateLoading, setGateLoading] = useState(false)
  const [gateMsg, setGateMsg] = useState('')

  // --- Leaderboard reveal + manual score adjustment State ---
  const [leaderboardVisible, setLeaderboardVisible] = useState(false)
  const [lbLoading, setLbLoading] = useState(false)
  const [lbMsg, setLbMsg] = useState('')
  const [adjTeams, setAdjTeams] = useState<{ id: string; code: string; name: string; totalPoints: number }[]>([])
  const [adjHistory, setAdjHistory] = useState<{ id: string; teamCode: string; points: number; reason: string | null; createdAt: string }[]>([])
  const [adjTeamId, setAdjTeamId] = useState('')
  const [adjPoints, setAdjPoints] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjLoading, setAdjLoading] = useState(false)
  const [adjMsg, setAdjMsg] = useState('')

  useEffect(() => {
    loadQuizState()
    loadBombDefusalState()
    loadBettingState()
    loadGateState()
    loadLeaderboardVisibility()
    loadAdjustmentState()
  }, [])

  async function loadQuizState() {
    const res = await fetch('/api/admin/quiz')
    if (res.ok) {
      const data = await res.json()
      setQuizLink(data.quizLink ?? 'https://wayground.com/join?gc=940315&source=liveDashboard')
      setRound1Declared(data.round1Declared ?? false)
      setBettingOpen(data.bettingOpen ?? false)
      setTeamScores(data.teams ?? [])
    }
  }

  async function loadBombDefusalState() {
    const res = await fetch('/api/admin/bomb-defusal')
    if (res.ok) {
      const data = await res.json()
      setBombDefusalLink(data.bombDefusalLink ?? 'https://vedant-jadhav-23.github.io/BombDefusalTask/')
      setBombDefusalTeams(data.teams ?? [])
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

  async function loadLeaderboardVisibility() {
    const res = await fetch('/api/admin/leaderboard-visibility')
    if (res.ok) setLeaderboardVisible((await res.json()).visible ?? false)
  }

  async function handleToggleLeaderboard(visible: boolean) {
    setLbLoading(true)
    setLbMsg('')
    const res = await fetch('/api/admin/leaderboard-visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    })
    if (res.ok) {
      setLeaderboardVisible(visible)
      setLbMsg(visible ? '✓ Standings are now LIVE on the projector.' : '✓ Projector is back to the holding screen.')
    } else {
      setLbMsg('Failed to update - try again.')
    }
    setLbLoading(false)
  }

  async function loadAdjustmentState() {
    const res = await fetch('/api/admin/score-adjustment')
    if (res.ok) {
      const data = await res.json()
      setAdjTeams(data.teams ?? [])
      setAdjHistory(data.history ?? [])
      if (!adjTeamId && data.teams?.length) setAdjTeamId(data.teams[0].id)
    }
  }

  async function handleSubmitAdjustment() {
    const points = parseInt(adjPoints, 10)
    if (!adjTeamId || Number.isNaN(points) || points === 0 || !adjReason.trim()) {
      setAdjMsg('Pick a team, a non-zero point delta, and a reason.')
      return
    }
    setAdjLoading(true)
    setAdjMsg('')
    const res = await fetch('/api/admin/score-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId: adjTeamId, points, reason: adjReason.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setAdjMsg('✓ Adjustment recorded.')
      setAdjPoints('')
      setAdjReason('')
      await loadAdjustmentState()
    } else {
      setAdjMsg(data.error || 'Failed to record adjustment.')
    }
    setAdjLoading(false)
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

  async function handleSaveBombDefusalLink() {
    setBombDefusalLoading(true)
    setBombDefusalMsg('')
    const res = await fetch('/api/admin/bomb-defusal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bombDefusalLink }),
    })
    const data = await res.json()
    setBombDefusalMsg(res.ok ? '✓ Bomb Defusal link saved.' : data.error)
    setBombDefusalLoading(false)
  }

  async function handleSaveBombDefusalScores() {
    setBombDefusalLoading(true)
    setBombDefusalMsg('')
    const res = await fetch('/api/admin/bomb-defusal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores: bombDefusalTeams.map((t) => ({ teamId: t.id, points: t.points })) }),
    })
    const data = await res.json()
    if (res.ok) {
      setBombDefusalMsg('✓ Scores saved.')
      await loadBombDefusalState()
    } else {
      setBombDefusalMsg(data.error)
    }
    setBombDefusalLoading(false)
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

  async function loadGateState() {
    const res = await fetch('/api/admin/task-gate')
    if (res.ok) {
      const data = await res.json()
      setTaskStates(data.taskStates ?? [])
    }
  }

  async function handleToggleGate(taskNumber: number, action: 'open' | 'close') {
    setGateLoading(true)
    setGateMsg('')
    const res = await fetch('/api/admin/task-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskNumber, action }),
    })
    const data = await res.json()
    if (res.ok) {
      setGateMsg(`✓ Task ${taskNumber} ${action === 'open' ? 'opened' : 'closed'} for ${data.teamsAffected} team(s).`)
      await loadGateState()
    } else {
      setGateMsg(data.error ?? 'Error toggling gate.')
    }
    setGateLoading(false)
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
          <button className={tabClass('bombdefusal')} onClick={() => setTab('bombdefusal')}>Bomb Defusal</button>
          <button className={tabClass('betting')} onClick={() => setTab('betting')}>Betting</button>
          <button className={tabClass('task4')} onClick={() => setTab('task4')}>Task 4 Shuffle</button>
          <button className={tabClass('settling')} onClick={() => setTab('settling')}>Settle Bets</button>
          <button className={tabClass('gates')} onClick={() => setTab('gates')}>Task Gates</button>
          <button className={tabClass('leaderboard')} onClick={() => setTab('leaderboard')}>Leaderboard</button>
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
                  placeholder="https://wayground.com/join?gc=..."
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

        {/* === Bomb Defusal (Task 3) Tab === */}
        {tab === 'bombdefusal' && (
          <div className="flex flex-col gap-6">
            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-lg font-bold text-skeld-cyan">Bomb Defusal Link</h2>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={bombDefusalLink}
                  onChange={(e) => setBombDefusalLink(e.target.value)}
                  className="flex-1 rounded border border-skeld-panel bg-skeld-void/50 px-3 py-2 font-rajdhani text-sm text-white placeholder-gray-500 focus:border-skeld-cyan focus:outline-none"
                  placeholder="https://vedant-jadhav-23.github.io/BombDefusalTask/"
                />
                <Button variant="primary" onClick={handleSaveBombDefusalLink} disabled={bombDefusalLoading}>
                  SAVE
                </Button>
              </div>
              {bombDefusalMsg && (
                <p className={`font-rajdhani text-sm ${bombDefusalMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                  {bombDefusalMsg}
                </p>
              )}
            </Panel>

            <Panel className="flex flex-col gap-4">
              <h2 className="font-orbitron text-lg font-bold text-skeld-amber">Manual Team Scores</h2>
              <p className="font-rajdhani text-sm text-gray-400">
                As each team notifies you they finished the bomb defusal site, enter their score and
                click SAVE SCORES. This immediately unlocks Task 4 for that team.
              </p>
              <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
                {bombDefusalTeams.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 rounded border border-skeld-panel/40 px-3 py-2">
                    <span className="font-orbitron text-xs text-skeld-cyan w-16">{t.code}</span>
                    <span className="font-rajdhani text-sm text-gray-300 flex-1">{t.name}</span>
                    {t.completed && <span className="font-rajdhani text-xs text-green-400">✓</span>}
                    <input
                      type="number"
                      min={0}
                      value={t.points}
                      onChange={(e) => {
                        const updated = [...bombDefusalTeams]
                        updated[i] = { ...t, points: parseInt(e.target.value, 10) || 0 }
                        setBombDefusalTeams(updated)
                      }}
                      className="w-20 rounded border border-skeld-panel bg-skeld-void/50 px-2 py-1 font-mono text-sm text-white text-right focus:border-skeld-amber focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={handleSaveBombDefusalScores} disabled={bombDefusalLoading}>
                  SAVE SCORES
                </Button>
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
        {/* === Task Gates Tab === */}
        {tab === 'gates' && (
          <Panel className="flex flex-col gap-4">
            <h2 className="font-orbitron text-lg font-bold text-skeld-red">Task Gates (Operational Override)</h2>
            <p className="font-rajdhani text-sm text-gray-300">
              Open/close applies to ALL teams at once. Gates default to OPEN (no admin action needed) —
              use CLOSE only to pause a task mid-event (e.g. a bug, a briefing, an incident); use OPEN to
              resume it. This does not bypass check-in or the prior-task-complete requirement.
            </p>
            <div className="flex flex-col gap-2">
              {taskStates.map((t) => (
                <div key={t.taskNumber} className="flex items-center gap-3 rounded border border-skeld-panel/40 px-3 py-2">
                  <span className="font-orbitron text-xs text-skeld-cyan w-20">TASK {t.taskNumber}</span>
                  <span className={`font-rajdhani text-sm flex-1 ${t.closed ? 'text-skeld-red' : 'text-green-400'}`}>
                    {t.closed ? 'CLOSED' : 'OPEN'}
                  </span>
                  <Button
                    variant={t.closed ? 'primary' : 'ghost'}
                    onClick={() => handleToggleGate(t.taskNumber, t.closed ? 'open' : 'close')}
                    disabled={gateLoading}
                  >
                    {t.closed ? 'OPEN FOR ALL TEAMS' : 'CLOSE FOR ALL TEAMS'}
                  </Button>
                </div>
              ))}
            </div>
            {gateMsg && (
              <p className={`font-rajdhani text-sm ${gateMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                {gateMsg}
              </p>
            )}
          </Panel>
        )}
        {/* === Leaderboard Reveal + Manual Adjustment Tab === */}
        {tab === 'leaderboard' && (
          <Panel className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 className="font-orbitron text-lg font-bold text-skeld-amber">Projector Reveal</h2>
              <p className="font-rajdhani text-sm text-gray-300">
                The projector (/display) holds a waiting screen until you flip this on. Admin/monitor always
                see live standings regardless of this toggle.
              </p>
              <div className="flex items-center gap-3">
                <span className={`font-orbitron text-xs uppercase ${leaderboardVisible ? 'text-green-400' : 'text-gray-400'}`}>
                  Projector is currently {leaderboardVisible ? 'SHOWING STANDINGS' : 'ON HOLDING SCREEN'}
                </span>
                <Button
                  variant={leaderboardVisible ? 'ghost' : 'primary'}
                  onClick={() => handleToggleLeaderboard(!leaderboardVisible)}
                  disabled={lbLoading}
                >
                  {leaderboardVisible ? 'HIDE STANDINGS' : 'REVEAL STANDINGS ON PROJECTOR'}
                </Button>
              </div>
              {lbMsg && (
                <p className={`font-rajdhani text-sm ${lbMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                  {lbMsg}
                </p>
              )}
            </div>

            <div className="border-t border-skeld-panel/40 pt-6 flex flex-col gap-3">
              <h2 className="font-orbitron text-lg font-bold text-skeld-cyan">Manual Score Adjustment</h2>
              <p className="font-rajdhani text-sm text-gray-300">
                Appends a correction to the score ledger - it never overwrites anything (totals are always
                summed live from every recorded event). Use this to fix a mis-entered task score after the fact.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={adjTeamId}
                  onChange={(e) => setAdjTeamId(e.target.value)}
                  className="rounded border border-skeld-panel bg-skeld-void px-3 py-2 font-rajdhani text-sm text-white flex-1"
                >
                  {adjTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.code} — {t.name} (total: {t.totalPoints})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="± points"
                  value={adjPoints}
                  onChange={(e) => setAdjPoints(e.target.value)}
                  className="w-28 rounded border border-skeld-panel bg-skeld-void px-3 py-2 font-mono text-sm text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Reason (required, e.g. Corrected Task 3 score - admin mistyped 20 instead of 25)"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                className="rounded border border-skeld-panel bg-skeld-void px-3 py-2 font-rajdhani text-sm text-white"
              />
              <Button variant="primary" onClick={handleSubmitAdjustment} disabled={adjLoading} className="self-start">
                {adjLoading ? 'Recording...' : 'RECORD ADJUSTMENT'}
              </Button>
              {adjMsg && (
                <p className={`font-rajdhani text-sm ${adjMsg.startsWith('✓') ? 'text-green-400' : 'text-skeld-red'}`}>
                  {adjMsg}
                </p>
              )}

              {adjHistory.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="font-orbitron text-xs text-gray-400 uppercase">Recent adjustments</span>
                  {adjHistory.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 rounded border border-skeld-panel/30 px-3 py-2 text-sm font-rajdhani">
                      <span className="font-mono text-skeld-cyan">{h.teamCode}</span>
                      <span className={h.points > 0 ? 'text-green-400' : 'text-skeld-red'}>
                        {h.points > 0 ? `+${h.points}` : h.points}
                      </span>
                      <span className="flex-1 text-gray-400">{h.reason}</span>
                      <span className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </main>
  )
}
