'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const [formData, setFormData] = useState({ firstName: '', rollNumber: '', teamCode: '', email: '' })
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (res.ok) {
      const data = await res.json()
      sessionStorage.setItem('playerCode', data.playerCode)
      router.push('/register/success')
    } else {
      setError(await res.text())
    }
  }

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="First Name" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
        <input placeholder="Roll Number (e.g. 22BCE1234)" value={formData.rollNumber} onChange={e => setFormData({ ...formData, rollNumber: e.target.value })} required />
        <input placeholder="Team Code" value={formData.teamCode} onChange={e => setFormData({ ...formData, teamCode: e.target.value })} required />
        <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
        <button type="submit">Register</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  )
}
