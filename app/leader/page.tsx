import { redirect } from 'next/navigation'
import { requireSessionAndRole } from '../../lib/auth/guard'
import { db } from '../../lib/db/client'

export default async function LeaderPage() {
  await requireSessionAndRole(undefined, db, ['leader'])
  redirect('/player')
}
