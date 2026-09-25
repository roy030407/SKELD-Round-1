import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function PlayerPage() {
  await requireSessionAndRole(undefined, db, ['player', 'leader'])
  
  return (
    <div>
      <h1>PLAYER STUB</h1>
      <form action="/api/auth/logout" method="POST"><button type="submit">Logout</button></form>
    </div>
  )
}
