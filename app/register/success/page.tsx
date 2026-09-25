'use client'

import { useEffect, useState } from 'react'

export default function RegisterSuccess() {
  const [playerCode, setPlayerCode] = useState('')

  useEffect(() => {
    setPlayerCode(sessionStorage.getItem('playerCode') || '')
  }, [])

  return (
    <div>
      <h1>Registration Successful!</h1>
      <p>Save this code! You will need: <strong>Player Code: {playerCode}</strong> + your roll number to log in on event day</p>
      <a href="/login">Login</a>
    </div>
  )
}
