import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function MonitorPage() {
  await requireSessionAndRole(undefined, db, ['monitor'])
  
  return (
    <div>
      <h1>MONITOR STUB</h1>
      <form action="/api/auth/logout" method="POST"><button type="submit">Logout</button></form>
    </div>
  )
}
