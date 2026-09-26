import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'
import { Panel } from '@/components/ui/panel'
import { Button } from '@/components/ui/button'

export default async function MonitorPage() {
  await requireSessionAndRole(undefined, db, ['monitor'])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-skeld-void px-4 text-white">
      <div className="w-full max-w-sm text-center">
        <Panel variant="amber" className="flex flex-col items-center gap-4">
          <span className="font-orbitron text-xs font-bold text-skeld-amber">MONITOR CONSOLE</span>
          <h1 className="font-bangers text-3xl text-white">Roaming Monitor</h1>
          <p className="font-rajdhani text-sm text-gray-300">
            You're logged in as a floor monitor. Check with the admin desk for live team status during the event.
          </p>
          <form action="/api/auth/logout" method="POST" className="w-full">
            <Button type="submit" variant="ghost" className="w-full">Logout</Button>
          </form>
        </Panel>
      </div>
    </main>
  )
}
