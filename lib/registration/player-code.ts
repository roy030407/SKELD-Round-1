import { players } from '../db/schema'
import { eq, count } from 'drizzle-orm'

export async function generatePlayerCode(tx: any, teamId: string): Promise<string> {
  const [result] = await tx.select({ count: count() }).from(players).where(eq(players.teamId, teamId))
  const nextNum = (result.count + 1).toString().padStart(3, '0')
  return `P${nextNum}`
}
