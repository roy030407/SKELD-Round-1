import { db } from '../db/client'
import { rateLimitCounters } from '../db/schema'
import { sql } from 'drizzle-orm'

export async function rateLimit(tx: any, key: string, limit: number, windowSecs: number = 60) {
  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / (windowSecs * 1000)) * (windowSecs * 1000))
  
  const [record] = await tx.insert(rateLimitCounters).values({
    key,
    windowStart,
    count: 1
  }).onConflictDoUpdate({
    target: [rateLimitCounters.key, rateLimitCounters.windowStart],
    set: { count: sql`${rateLimitCounters.count} + 1` }
  }).returning()

  if (record.count > limit) {
    throw new Error('Rate limit exceeded')
  }
}
