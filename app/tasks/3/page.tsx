'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { LOGIC_GATE_STAGES } from '@/lib/game/logic-gates-data'
import Link from 'next/link'

export default function Task3BombDefusalPage() {
  const [activeStage, setActiveStage] = useState(1)
  const [inputs, setInputs] = useState<Record<string, Record<string, 0 | 1>>>(() => {
    const initial: Record<string, Record<string, 0 | 1>> = {}
    for (const s of LOGIC_GATE_STAGES) {
      initial[s.stageNumber.toString()] = {}
      for (const inp of s.inputs) {
        initial[s.stageNumber.toString()][inp.id] = inp.defaultVal
      }
    }
    return initial
  })

  const [solvedStages, setSolvedStages] = useState<Record<number, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  // Timer effect
  useEffect(() => {
    if (result) return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [result])

  // Check current stage solution on input change
  const currentStageData = LOGIC_GATE_STAGES.find((s) => s.stageNumber === activeStage)

  const toggleInput = (stageNum: number, inputId: string) => {
    if (result) return
    setInputs((prev) => {
      const stageInputs = { ...prev[stageNum.toString()] }
      stageInputs[inputId] = stageInputs[inputId] === 1 ? 0 : 1
      return {
        ...prev,
        [stageNum.toString()]: stageInputs,
      }
    })
  }

  const handleVerifyCurrentStage = () => {
    if (!currentStageData) return
    const stageInputs = inputs[activeStage.toString()] || {}
    const isCorrect = currentStageData.verify(stageInputs)
    if (isCorrect) {
      setSolvedStages((prev) => ({ ...prev, [activeStage]: true }))
      if (activeStage < LOGIC_GATE_STAGES.length) {
        setActiveStage((prev) => prev + 1)
      }
      setError(null)
    } else {
      setError(`Logic circuit feedback negative. Check the gate conditions and hint for Stage ${activeStage}!`)
    }
  }

  const handleDefuseBomb = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/3/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageInputs: inputs }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Defusal failed')
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const allStagesSolved = LOGIC_GATE_STAGES.every((s) => solvedStages[s.stageNumber])

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 3: REACTOR BOMB DEFUSAL" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        {/* DEFUSAL HUD HEADER */}
        <div className="flex items-center justify-between rounded border border-skeld-red bg-skeld-red/10 p-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce">💣</span>
            <div>
              <div className="font-orbitron text-xs text-skeld-glow-red uppercase tracking-wider">
                CORE MELTDOWN STATUS
              </div>
              <div className="font-orbitron text-xl font-bold text-white">
                ARMED & TICKING
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-orbitron text-xs text-gray-400">DEFUSAL CLOCK</div>
            <div className="font-mono text-3xl font-black text-skeld-glow-red animate-pulse">
              {formatTimer(timerSeconds)}
            </div>
          </div>
        </div>

        {/* STAGE PROGRESS TABS */}
        <div className="grid grid-cols-5 gap-2">
          {LOGIC_GATE_STAGES.map((s) => {
            const isSolved = solvedStages[s.stageNumber]
            const isCurrent = s.stageNumber === activeStage
            return (
              <button
                key={s.stageNumber}
                type="button"
                onClick={() => setActiveStage(s.stageNumber)}
                className={`rounded border p-2 text-center font-orbitron text-xs transition-all ${
                  isSolved
                    ? 'border-skeld-green bg-skeld-green/20 text-skeld-green font-bold'
                    : isCurrent
                    ? 'border-skeld-amber bg-skeld-amber/20 text-skeld-amber font-bold ring-2 ring-skeld-amber'
                    : 'border-white/10 bg-black/40 text-gray-500 hover:text-white'
                }`}
              >
                {isSolved ? '✓ STAGE ' : 'STAGE '} {s.stageNumber}
              </button>
            )
          })}
        </div>

        {/* ACTIVE STAGE PANEL */}
        {currentStageData && !result && (
          <Panel variant="red" className="flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-skeld-red/30 pb-3">
              <div>
                <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-glow-red">
                  Logic Gate Module #{currentStageData.stageNumber} of {LOGIC_GATE_STAGES.length}
                </span>
                <h2 className="font-orbitron text-xl font-bold text-white">
                  {currentStageData.title}
                </h2>
              </div>
              <span className={`rounded px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                solvedStages[currentStageData.stageNumber]
                  ? 'bg-skeld-green/20 text-skeld-green border border-skeld-green'
                  : 'bg-skeld-red/20 text-skeld-glow-red border border-skeld-red'
              }`}>
                {solvedStages[currentStageData.stageNumber] ? 'DISARMED' : 'ACTIVE THREAT'}
              </span>
            </div>

            <p className="font-rajdhani text-gray-300">
              {currentStageData.description}
            </p>

            {/* CIRCUIT DIAGRAM */}
            <div className="rounded border border-white/10 bg-black/80 p-4 font-mono text-sm text-skeld-cyan whitespace-pre leading-relaxed">
              {currentStageData.diagram}
            </div>

            {/* INTERACTIVE TOGGLE SWITCHES */}
            <div className="flex flex-col gap-3">
              <span className="font-orbitron text-xs uppercase tracking-wider text-gray-300">
                Configure Logic Terminals (Click to toggle 0 / 1):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentStageData.inputs.map((inp) => {
                  const currentVal = inputs[currentStageData.stageNumber.toString()]?.[inp.id] ?? inp.defaultVal
                  return (
                    <button
                      key={inp.id}
                      type="button"
                      onClick={() => toggleInput(currentStageData.stageNumber, inp.id)}
                      className={`flex flex-col items-center justify-center rounded border p-4 transition-all ${
                        currentVal === 1
                          ? 'border-skeld-cyan bg-skeld-cyan/20 text-skeld-cyan shadow-lg shadow-skeld-cyan/20'
                          : 'border-white/20 bg-black/60 text-gray-400'
                      }`}
                    >
                      <span className="font-orbitron text-xs font-bold">{inp.label}</span>
                      <span className="mt-2 font-mono text-3xl font-black">{currentVal}</span>
                      <span className="mt-1 font-mono text-[10px] text-gray-400">
                        {currentVal === 1 ? 'HIGH (1)' : 'LOW (0)'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="font-rajdhani text-xs text-skeld-amber">
              💡 <strong>Engineering Clue:</strong> {currentStageData.hint}
            </p>

            {error && (
              <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-glow-red">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleVerifyCurrentStage}
                className="flex-1 font-orbitron"
              >
                {solvedStages[currentStageData.stageNumber] ? 'RE-VERIFY STAGE' : 'DISARM THIS GATE'}
              </Button>

              {currentStageData.stageNumber < LOGIC_GATE_STAGES.length && (
                <Button
                  variant="ghost"
                  onClick={() => setActiveStage((p) => p + 1)}
                  className="font-orbitron text-xs"
                >
                  NEXT GATE →
                </Button>
              )}
            </div>
          </Panel>
        )}

        {/* MASTER DEFUSAL ACTION */}
        {allStagesSolved && !result && (
          <Panel variant="amber" className="flex flex-col items-center gap-4 text-center py-6">
            <span className="text-4xl">⚡</span>
            <h3 className="font-orbitron text-xl font-bold text-skeld-amber">
              ALL 5 LOGIC GATES BYPASSED
            </h3>
            <p className="max-w-md font-rajdhani text-sm text-gray-300">
              The detonator is primed for total disarm. Transmit the master disarm signal to freeze the reactor clock!
            </p>
            <Button
              variant="primary"
              onClick={handleDefuseBomb}
              disabled={submitting}
              className="w-full max-w-sm font-orbitron py-4 text-base"
            >
              {submitting ? 'TRANSMITTING DISARM...' : 'TRANSMIT FINAL BOMB DEFUSAL'}
            </Button>
          </Panel>
        )}

        {/* DEFUSAL SUCCESS BANNER */}
        {result && (
          <Panel variant="default" className="flex flex-col items-center gap-4 text-center py-8">
            <span className="text-6xl">🛡️</span>
            <h2 className="font-orbitron text-3xl font-black text-skeld-green">
              BOMB DEFUSED!
            </h2>
            <p className="font-rajdhani text-lg text-white">
              Reactor core stabilized successfully in <strong>{formatTimer(timerSeconds)}</strong>!
            </p>
            {result.rank && (
              <div className="rounded border border-skeld-green/40 bg-skeld-green/20 px-6 py-3 font-orbitron text-xl font-bold text-white">
                Rank #{result.rank} — Earned {result.points} Points!
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <Link
                href="/tasks/4"
                className="inline-flex items-center justify-center gap-2 rounded bg-skeld-green px-8 py-4 font-orbitron text-base font-bold text-black transition-all hover:bg-white hover:scale-105"
              >
                PROCEED TO TASK 4: SHUFFLING PROTOCOL →
              </Link>
            </div>
          </Panel>
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
