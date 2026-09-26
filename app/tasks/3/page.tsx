'use client'

import { useState } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import { LOGIC_GATE_STAGES } from '@/lib/game/logic-gates-data'
import Link from 'next/link'

type StageInputs = Record<string, 0 | 1>

export default function Task3BombDefusalPage() {
  const [stageIndex, setStageIndex] = useState(0)
  const [stagesInputs, setStagesInputs] = useState<StageInputs[]>(
    LOGIC_GATE_STAGES.map((s) => Object.fromEntries(s.inputs.map((inp) => [inp.label, 0 as 0 | 1])))
  )
  const [solvedStages, setSolvedStages] = useState<boolean[]>(new Array(5).fill(false))
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ rank: number; points: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stageErrors, setStageErrors] = useState<(string | null)[]>(new Array(5).fill(null))

  const currentStage = LOGIC_GATE_STAGES[stageIndex]

  function toggleInput(label: string) {
    const updated = [...stagesInputs]
    const current = updated[stageIndex][label]
    updated[stageIndex] = { ...updated[stageIndex], [label]: current === 1 ? 0 : 1 }
    setStagesInputs(updated)
  }

  function verifyCurrentStage() {
    const correct = currentStage.verify(stagesInputs[stageIndex])
    const newSolved = [...solvedStages]
    const newErrors = [...stageErrors]
    if (correct) {
      newSolved[stageIndex] = true
      newErrors[stageIndex] = null
      setSolvedStages(newSolved)
      setStageErrors(newErrors)
      // Auto-advance to next unsolved stage
      const nextUnsolved = newSolved.findIndex((s, i) => !s && i > stageIndex)
      if (nextUnsolved !== -1) setStageIndex(nextUnsolved)
    } else {
      newErrors[stageIndex] = '✗ Incorrect output. Adjust your inputs and try again.'
      setStageErrors(newErrors)
    }
  }

  async function handleFinalSubmit() {
    const allSolved = solvedStages.every(Boolean)
    if (!allSolved) {
      setError('Complete all 5 stages first.')
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/tasks/3/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stages: LOGIC_GATE_STAGES.map((s, i) => ({
          stageIndex: i,
          inputs: stagesInputs[i],
        })),
      }),
    })
    const data = await res.json()
    if (data.correct) {
      setResult({ rank: data.rank, points: data.points })
    } else {
      setError(data.error ?? 'Submission rejected. Recheck your gate solutions.')
    }
    setSubmitting(false)
  }

  if (result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void text-white">
        <Panel className="max-w-md text-center">
          <h1 className="font-bangers text-4xl text-green-400 animate-pulse">BOMB DEFUSED!</h1>
          <p className="font-orbitron text-lg mt-4">Rank #{result.rank} — +{result.points} pts</p>
          <div className="mt-6">
            <Link href="/tasks/4"><Button variant="primary">PROCEED TO TASK 4 (FINALS) →</Button></Link>
          </div>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 3: REACTOR BOMB DEFUSAL — ALL HANDS" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        {/* Stage Tabs */}
        <div className="flex gap-1">
          {LOGIC_GATE_STAGES.map((s, i) => (
            <button
              key={i}
              onClick={() => setStageIndex(i)}
              className={`flex-1 rounded py-2 font-orbitron text-xs uppercase transition-colors ${
                stageIndex === i
                  ? 'bg-skeld-cyan/20 border border-skeld-cyan text-skeld-cyan'
                  : solvedStages[i]
                  ? 'bg-green-900/30 border border-green-500/50 text-green-400'
                  : 'bg-skeld-void border border-skeld-panel/40 text-gray-400 hover:border-skeld-amber/40'
              }`}
            >
              {solvedStages[i] ? '✓' : `S${i + 1}`}
            </button>
          ))}
        </div>

        {/* Current Stage Panel */}
        <Panel variant="red" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-orbitron text-base font-bold text-skeld-glow-red">
              {currentStage.title}
            </h2>
            <span className="font-orbitron text-xs text-gray-400">{currentStage.gateType}</span>
          </div>
          <p className="font-rajdhani text-sm text-gray-300">{currentStage.description}</p>

          {/* Input Toggles */}
          <div className="flex flex-wrap gap-3">
            {currentStage.inputs.map((inp) => {
              const val = stagesInputs[stageIndex][inp.label]
              return (
                <button
                  key={inp.label}
                  onClick={() => toggleInput(inp.label)}
                  className={`flex flex-col items-center gap-1 rounded border px-4 py-3 font-mono text-lg font-bold transition-all ${
                    val === 1
                      ? 'border-green-400 bg-green-900/40 text-green-300'
                      : 'border-skeld-red/50 bg-skeld-red/10 text-gray-400 hover:border-skeld-red/80'
                  }`}
                >
                  <span className="font-orbitron text-xs text-gray-400">{inp.label}</span>
                  <span>{val}</span>
                </button>
              )
            })}
          </div>

          <div className="rounded border border-gray-600/40 bg-skeld-void/50 px-4 py-3 text-center">
            <span className="font-orbitron text-xs text-gray-400 uppercase">Target Output: </span>
            <span className="font-mono text-2xl font-bold text-green-400">{currentStage.expectedOutput}</span>
          </div>

          {stageErrors[stageIndex] && (
            <p className="font-rajdhani text-sm text-skeld-red">{stageErrors[stageIndex]}</p>
          )}
          {solvedStages[stageIndex] && (
            <p className="font-rajdhani text-sm text-green-400">✓ Stage {stageIndex + 1} solved!</p>
          )}

          {!solvedStages[stageIndex] && (
            <Button variant="danger" onClick={verifyCurrentStage}>
              VERIFY STAGE {stageIndex + 1}
            </Button>
          )}
        </Panel>

        {/* Final Submit */}
        <Panel className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-orbitron text-gray-400 uppercase">
            <span>Stages Complete: {solvedStages.filter(Boolean).length}/5</span>
          </div>
          {error && <p className="font-rajdhani text-sm text-skeld-red">{error}</p>}
          <Button
            variant="primary"
            onClick={handleFinalSubmit}
            disabled={submitting || !solvedStages.every(Boolean)}
          >
            {submitting ? 'Defusing...' : 'SUBMIT ALL STAGES — DEFUSE BOMB'}
          </Button>
        </Panel>

        <div className="text-center">
          <Link href="/player" className="font-rajdhani text-sm text-skeld-cyan hover:underline">← Return to Player Hub</Link>
        </div>
      </div>
    </main>
  )
}
