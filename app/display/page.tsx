import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function DisplayPage() {
  await requireSessionAndRole(undefined, db, ['display'])
  
  return (
    <div>
      <h1>DISPLAY STUB</h1>
      <form action="/api/auth/logout" method="POST"><button type="submit">Logout</button></form>
    </div>
  )
}
