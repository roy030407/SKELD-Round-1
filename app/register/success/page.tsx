'use client'

import { useEffect, useState } from 'react'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function RegisterSuccess() {
  const [playerCode, setPlayerCode] = useState('')

  useEffect(() => {
    setPlayerCode(sessionStorage.getItem('playerCode') || '')
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <Panel variant="amber" className="flex flex-col items-center gap-4">
          <h1 className="font-bangers text-3xl text-green-400">Registration Successful!</h1>
          <p className="font-rajdhani text-sm text-gray-300">
            Save this code — you will need it plus your roll number to log in on event day.
          </p>
          <div className="w-full rounded border border-skeld-cyan bg-skeld-cyan/10 px-4 py-4">
            <span className="font-orbitron text-xs text-gray-400 uppercase">Player Code</span>
            <p className="font-mono text-2xl font-bold text-skeld-cyan">{playerCode}</p>
          </div>
          <Link href="/login" className="w-full">
            <Button variant="primary" className="w-full">Go to Login</Button>
          </Link>
        </Panel>
      </div>
    </main>
  )
}
