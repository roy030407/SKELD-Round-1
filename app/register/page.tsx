'use client'

import { useState } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const inputClass =
  'w-full rounded border border-skeld-amber/60 bg-skeld-void/50 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-skeld-cyan'

export default function Register() {
  const [formData, setFormData] = useState({ firstName: '', rollNumber: '', teamCode: '', email: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' },
    })

    if (res.ok) {
      const data = await res.json()
      // Registration now logs the player straight into their own session and
      // checks them in (arriving in person at the venue IS check-in) - no
      // separate "here's your code, now go log in, now confirm check-in"
      // maze. Stash the code so the player hub can show a one-time "save
      // this" banner, then take them straight there.
      sessionStorage.setItem('justRegisteredCode', data.playerCode)
      window.location.href = '/player'
    } else {
      // The API returns raw zod issue arrays on validation failure; showing
      // that JSON to a fresher is useless, so surface just the messages.
      const raw = (await res.text()).trim()
      let friendly = raw
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          friendly = parsed.map((i: any) => i.message).filter(Boolean).join(' ')
        } else if (parsed?.error) {
          friendly = parsed.error
        }
      } catch {
        // not JSON - the API also returns plain-text errors like "Team is full"
      }
      setError(friendly || 'Registration failed. Please check your details.')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void px-4 text-white">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="font-orbitron text-xs tracking-widest text-gray-400">
            ROBOTICS CLUB NIT WARANGAL
          </span>
          <h1 className="font-bangers text-4xl text-skeld-glow-red">CREW REGISTRATION</h1>
        </div>

        <Panel variant="amber" className="flex flex-col gap-4">
          <span className="font-orbitron text-xs font-bold text-skeld-amber">JOIN YOUR CREW</span>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              className={inputClass}
            />
            <input
              placeholder="Roll Number (e.g. 22BCE1234)"
              value={formData.rollNumber}
              onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              required
              className={inputClass}
            />
            <input
              placeholder="Team Code"
              value={formData.teamCode}
              onChange={(e) => setFormData({ ...formData, teamCode: e.target.value })}
              required
              className={inputClass}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className={inputClass}
            />
            <Button type="submit" variant="primary" disabled={submitting} className="w-full">
              {submitting ? 'Registering...' : 'Register'}
            </Button>
          </form>

          {error && <p className="font-rajdhani text-sm text-skeld-red">{error}</p>}
        </Panel>

        <div className="mt-4 text-center">
          <Link href="/login" className="font-rajdhani text-sm text-skeld-cyan hover:underline">
            Already registered? Login here
          </Link>
        </div>
      </div>
    </main>
  )
}
