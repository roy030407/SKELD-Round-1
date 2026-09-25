import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function AdminPage() {
  await requireSessionAndRole(undefined, db, ['admin'])
  
  return (
    <div>
      <h1>ADMIN STUB</h1>
      <form action="/api/auth/logout" method="POST"><button type="submit">Logout</button></form>
    </div>
  )
}
