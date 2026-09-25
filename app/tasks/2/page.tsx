'use client'

import { useState, useEffect } from 'react'
import { EmergencyBanner } from '@/components/ui/emergency-banner'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Task2CipherPage() {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<any>(null)
  const [fragmentInput, setFragmentInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [fragmentVerified, setFragmentVerified] = useState<string | null>(null)
  const [fragmentError, setFragmentError] = useState<string | null>(null)

  // Leader assembly state
  const [assembledSentence, setAssembledSentence] = useState('')
  const [submittingMaster, setSubmittingMaster] = useState(false)
  const [masterResult, setMasterResult] = useState<any>(null)
  const [masterError, setMasterError] = useState<string | null>(null)

  const fetchState = async () => {
    try {
      const res = await fetch('/api/tasks/2/state')
      if (res.ok) {
        const data = await res.json()
        setState(data)
        if (data.isCompleted) {
          setMasterResult({ alreadyCompleted: true })
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
  }, [])

  const handleVerifyFragment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fragmentInput.trim() || !state) return
    setVerifying(true)
    setFragmentError(null)
    try {
      const res = await fetch('/api/tasks/2/verify-fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerIndex: state.playerIndex,
          answer: fragmentInput.trim(),
        }),
      })
      const data = await res.json()
      if (data.correct) {
        setFragmentVerified(data.decryptedText)
      } else {
        setFragmentError(data.message || 'Incorrect decryption.')
      }
    } catch (err: any) {
      setFragmentError(err.message || 'Verification error')
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmitMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assembledSentence.trim()) return
    setSubmittingMaster(true)
    setMasterError(null)
    try {
      const res = await fetch('/api/tasks/2/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: assembledSentence.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setMasterResult(data)
      } else {
        setMasterError(data.error || 'Submission failed')
      }
    } catch (err: any) {
      setMasterError(err.message || 'Network error')
    } finally {
      setSubmittingMaster(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void text-white">
        <div className="font-orbitron animate-pulse text-skeld-cyan">
          Connecting to Decryption Terminal...
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-skeld-void pb-20 text-white">
      <EmergencyBanner text="TASK 2: MULTI-CREW CIPHER MISSION" />

      <div className="mt-8 flex w-full max-w-2xl flex-col gap-6 px-4">
        {/* PERSONAL STATION PANEL */}
        <Panel variant="default" className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-skeld-cyan/30 pb-3">
            <div>
              <span className="font-orbitron text-xs uppercase tracking-wider text-skeld-cyan">
                Individual Crew Assignment
              </span>
              <h2 className="font-orbitron text-xl font-bold text-white">
                Station #{state?.playerIndex || 1} of 6
              </h2>
            </div>
            <span className="rounded bg-skeld-cyan/20 border border-skeld-cyan/40 px-2.5 py-1 font-mono text-xs text-skeld-cyan">
              {state?.fragment?.cipherType || 'Cipher'}
            </span>
          </div>

          <p className="font-rajdhani text-gray-300">
            Each of your 6 teammates holds a unique piece of the encrypted emergency transmission.
            Decipher your fragment below, then communicate it to your team leader to assemble the master sentence!
          </p>

          <div className="rounded border border-white/10 bg-black/60 p-4">
            <span className="font-orbitron text-xs text-gray-400 uppercase tracking-wider">
              Encrypted Fragment:
            </span>
            <div className="mt-2 font-mono text-2xl font-black tracking-widest text-skeld-cyan">
              {state?.fragment?.encryptedText}
            </div>
            <p className="mt-2 font-rajdhani text-sm text-skeld-amber">
              💡 <strong>Cipher Clue:</strong> {state?.fragment?.clue}
            </p>
          </div>

          {/* INDIVIDUAL VERIFIER */}
          {fragmentVerified ? (
            <div className="rounded border border-skeld-green bg-skeld-green/20 p-4 text-center">
              <span className="font-orbitron text-xs text-skeld-green uppercase tracking-wider font-bold">
                ✓ FRAGMENT #{state?.playerIndex} DECRYPTED
              </span>
              <div className="mt-1 font-mono text-2xl font-black text-white">
                "{fragmentVerified}"
              </div>
              <p className="mt-2 font-rajdhani text-sm text-gray-300">
                Share this word/phrase with your team leader to place into Slot #{state?.playerIndex}!
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerifyFragment} className="flex flex-col gap-3">
              <label className="font-orbitron text-xs text-gray-300 uppercase">
                Test Your Decrypted Fragment:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={fragmentInput}
                  onChange={(e) => setFragmentInput(e.target.value)}
                  placeholder="e.g. THE ROBOTICS"
                  className="flex-1 rounded border border-skeld-cyan/40 bg-black/70 px-4 py-2 font-mono text-base uppercase text-white focus:outline-none focus:border-skeld-cyan"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={verifying || !fragmentInput.trim()}
                  className="font-orbitron text-xs"
                >
                  {verifying ? 'CHECKING...' : 'VERIFY'}
                </Button>
              </div>

              {fragmentError && (
                <div className="rounded border border-skeld-red bg-skeld-red/20 p-2 font-rajdhani text-xs text-skeld-glow-red">
                  {fragmentError}
                </div>
              )}
            </form>
          )}
        </Panel>

        {/* TEAM LEADER ASSEMBLY PANEL */}
        {state?.isLeader ? (
          <Panel variant="amber" className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-skeld-amber/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📡</span>
                <h3 className="font-orbitron text-lg font-bold text-skeld-amber">
                  TEAM LEADER ASSEMBLY TERMINAL
                </h3>
              </div>
              <span className="font-mono text-xs text-skeld-amber">ALL 6 FRAGMENTS REQUIRED</span>
            </div>

            <p className="font-rajdhani text-sm text-gray-300">
              Collect all 6 decrypted fragments from your teammates in order (Fragment 1 to Fragment 6), 
              combine them into the complete sentence, and submit!
            </p>

            {/* FRAGMENT CHECKLIST GUIDE */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div
                  key={num}
                  className={`rounded border p-2 ${
                    state?.playerIndex === num && fragmentVerified
                      ? 'border-skeld-green bg-skeld-green/20 text-skeld-green'
                      : 'border-white/10 bg-black/40 text-gray-400'
                  }`}
                >
                  Slot #{num}
                  <div className="text-[10px] mt-0.5">
                    {state?.playerIndex === num && fragmentVerified ? 'READY' : `P00${num}`}
                  </div>
                </div>
              ))}
            </div>

            {masterResult ? (
              <div className="rounded border border-skeld-green bg-skeld-green/20 p-5 text-center">
                <span className="font-orbitron text-sm text-skeld-green font-bold uppercase tracking-wider">
                  ✓ TRANSMISSION DECRYPTED & ACCEPTED!
                </span>
                {masterResult.rank && (
                  <div className="mt-2 font-orbitron text-xl font-bold text-white">
                    Rank #{masterResult.rank} — Earned {masterResult.points} Points!
                  </div>
                )}
                <div className="mt-4 flex justify-center">
                  <Link
                    href="/tasks/3"
                    className="inline-flex items-center justify-center gap-2 rounded bg-skeld-green px-6 py-3 font-orbitron text-sm font-bold text-black transition-all hover:bg-white"
                  >
                    PROCEED TO TASK 3: BOMB DEFUSAL →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitMaster} className="flex flex-col gap-3">
                <label className="font-orbitron text-xs text-gray-300 uppercase">
                  Full Assembled Sentence:
                </label>
                <textarea
                  rows={3}
                  value={assembledSentence}
                  onChange={(e) => setAssembledSentence(e.target.value)}
                  placeholder="e.g. THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB"
                  className="w-full rounded border border-skeld-amber/40 bg-black/70 p-3 font-mono text-base uppercase text-white focus:outline-none focus:border-skeld-amber"
                />

                {masterError && (
                  <div className="rounded border border-skeld-red bg-skeld-red/20 p-3 font-rajdhani text-sm text-skeld-glow-red">
                    {masterError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submittingMaster || !assembledSentence.trim()}
                  className="w-full font-orbitron"
                >
                  {submittingMaster ? 'VERIFYING TRANSMISSION...' : 'TRANSMIT FINAL SENTENCE'}
                </Button>
              </form>
            )}
          </Panel>
        ) : (
          <Panel variant="default" className="text-center py-6">
            <span className="font-orbitron text-xs text-gray-400 uppercase tracking-wider">
              Team Member Station
            </span>
            <p className="mt-1 font-rajdhani text-gray-300">
              Only your designated Team Leader can transmit the final assembled sentence.
              Ensure you have verbally communicated your decrypted fragment to them!
            </p>
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
