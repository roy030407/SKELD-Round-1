'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type FragmentState = {
  fragmentIndex: number
  encrypted: string
  cipherName: string
  clue: string
  playerCode: string
}

export default function Task2CipherPage() {
  const [loading, setLoading] = useState(true)
  const [fragment, setFragment] = useState<FragmentState | null>(null)
  const [attempt, setAttempt] = useState('')
  const [verifyMsg, setVerifyMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [fragmentSolved, setFragmentSolved] = useState(false)

  const [assembled, setAssembled] = useState('')
  const [submitMsg, setSubmitMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ rank: number; points: number } | null>(null)

  useEffect(() => {
    fetch('/api/tasks/2/state')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setFragment(data)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleVerify() {
    if (!fragment || !attempt.trim()) return
    setVerifying(true)
    setVerifyMsg(null)
    const res = await fetch('/api/tasks/2/verify-fragment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragmentIndex: fragment.fragmentIndex, attempt }),
    })
    const data = await res.json()
    if (data.correct) {
      setFragmentSolved(true)
      setVerifyMsg({ text: '✓ Correct! Share your decrypted fragment with the team leader.', ok: true })
    } else {
      setVerifyMsg({ text: '✗ Incorrect. Check your cipher key and try again.', ok: false })
    }
    setVerifying(false)
  }

  async function handleSubmitSentence() {
    if (!assembled.trim()) return
    setSubmitting(true)
    setSubmitMsg(null)
    const res = await fetch('/api/tasks/2/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assembledSentence: assembled }),
    })
    const data = await res.json()
    if (data.correct) {
      setDone({ rank: data.rank, points: data.points })
      setSubmitMsg({ text: `✓ CIPHER SOLVED! Rank #${data.rank} — +${data.points} points!`, ok: true })
    } else {
      setSubmitMsg({ text: data.error ?? 'Incorrect sentence. Try again.', ok: false })
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-skeld-void text-white">
        <p className="font-orbitron animate-pulse text-skeld-cyan">Loading cipher fragment...</p>
      </main>
    )
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void text-white">
        <Panel className="max-w-md text-center">
          <h1 className="font-bangers text-4xl text-green-400">CIPHER SOLVED!</h1>
          <p className="font-orbitron text-lg mt-4">Rank #{done.rank} — +{done.points} pts</p>
          <div className="mt-6">
            <Link href="/tasks/3"><Button variant="primary">PROCEED TO TASK 3 →</Button></Link>
          </div>
        </Panel>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 2: MULTI-CREW CIPHER MISSION" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-8 px-4">
        {/* Individual Cipher Fragment */}
        {fragment && (
          <Panel variant="amber" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-orbitron text-lg font-bold text-skeld-amber">
                Your Encrypted Fragment
              </h2>
              <span className="font-mono text-xs text-gray-400">{fragment.playerCode}</span>
            </div>

            <div className="rounded border border-skeld-amber/40 bg-skeld-void/50 p-4 text-center">
              <p className="font-orbitron text-xs uppercase tracking-widest text-gray-400 mb-2">Encrypted Text</p>
              <p className="font-pixel text-2xl text-white tracking-wider">{fragment.encrypted}</p>
            </div>

            <div className="rounded border border-skeld-cyan/30 bg-skeld-cyan/5 p-3">
              <p className="font-orbitron text-xs uppercase text-skeld-cyan">Cipher: {fragment.cipherName}</p>
              <p className="font-rajdhani text-sm text-gray-300 mt-1">{fragment.clue}</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-rajdhani text-sm text-gray-300">Your Decrypted Answer:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={attempt}
                  onChange={(e) => setAttempt(e.target.value.toUpperCase())}
                  disabled={fragmentSolved}
                  placeholder="Type your decrypted text..."
                  className="flex-1 rounded border border-skeld-panel bg-skeld-void/50 px-3 py-2 font-mono text-sm text-white uppercase placeholder-gray-500 focus:border-skeld-amber focus:outline-none disabled:opacity-50"
                />
                <Button variant="ghost" onClick={handleVerify} disabled={verifying || fragmentSolved}>
                  CHECK
                </Button>
              </div>
              {verifyMsg && (
                <p className={`font-rajdhani text-sm ${verifyMsg.ok ? 'text-green-400' : 'text-skeld-red'}`}>
                  {verifyMsg.text}
                </p>
              )}
            </div>
          </Panel>
        )}

        {/* Leader Assembly Console */}
        <Panel className="flex flex-col gap-4">
          <h2 className="font-orbitron text-lg font-bold text-gray-200">
            Leader Assembly Console
          </h2>
          <p className="font-rajdhani text-sm text-gray-400">
            Team Leader: once ALL 6 members have decoded their fragment, assemble the full sentence and submit.
          </p>

          <textarea
            rows={3}
            value={assembled}
            onChange={(e) => setAssembled(e.target.value.toUpperCase())}
            placeholder="ASSEMBLE THE FULL SENTENCE FROM ALL 6 FRAGMENTS..."
            className="w-full rounded border border-skeld-panel bg-skeld-void/50 px-3 py-2 font-mono text-sm text-white uppercase placeholder-gray-500 focus:border-skeld-cyan focus:outline-none resize-none"
          />

          {submitMsg && (
            <p className={`font-rajdhani text-sm ${submitMsg.ok ? 'text-green-400' : 'text-skeld-red'}`}>
              {submitMsg.text}
            </p>
          )}

          <Button variant="primary" onClick={handleSubmitSentence} disabled={submitting || !assembled.trim()}>
            {submitting ? 'Verifying...' : 'SUBMIT ASSEMBLED SENTENCE'}
          </Button>
          <p className="font-rajdhani text-xs text-gray-500">
            ⚠ Only one submission per team. Submit only when the entire team agrees on the sentence.
          </p>
        </Panel>

        <div className="text-center">
          <Link href="/player" className="font-rajdhani text-sm text-skeld-cyan hover:underline">← Return to Player Hub</Link>
        </div>
      </div>
    </main>
  )
}
