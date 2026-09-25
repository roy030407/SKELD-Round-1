'use client'

import { useState } from 'react'

export default function PlayerLogin() {
  const [playerCode, setPlayerCode] = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/login/player', {
      method: 'POST',
      body: JSON.stringify({ playerCode, rollNumber }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) setError('Login failed')
    else window.location.href = '/'
  }

  return (
    <div>
      <h1>Player Login</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="Player Code" value={playerCode} onChange={e => setPlayerCode(e.target.value)} required />
        <input placeholder="Roll Number" value={rollNumber} onChange={e => setRollNumber(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      {error && <p>{error}</p>}
      <a href="/register">Register</a>
    </div>
  )
}
