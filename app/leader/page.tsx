import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function LeaderPage() {
  await requireSessionAndRole(undefined, db, ['leader'])
  
  return (
    <div>
      <h1>LEADER STUB</h1>
      <form action="/api/auth/logout" method="POST"><button type="submit">Logout</button></form>
    </div>
  )
}
