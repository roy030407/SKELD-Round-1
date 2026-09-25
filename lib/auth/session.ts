import { SignJWT, jwtVerify } from 'jose'
import { db } from '../db/client'
import { sessions } from '../db/schema'
import { eq } from 'drizzle-orm'
import { env } from '../env'

const secret = () => new TextEncoder().encode(env.SESSION_SECRET)

export async function sealSessionId(sid: string): Promise<string> {
  return new SignJWT({ sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret())
}

export async function openSessionId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return typeof payload.sid === 'string' ? payload.sid : null
  } catch {
    return null
  }
}

export async function createSession(tx: any, opts: { playerId?: string, staffId?: string, role: string, teamId?: string }) {
  const [session] = await tx.insert(sessions).values({
    playerId: opts.playerId || null,
    staffId: opts.staffId || null,
    role: opts.role,
    teamId: opts.teamId || null,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
  }).returning()
  return session
}

export async function loadSession(tx: any, sid: string) {
  const [session] = await tx.select().from(sessions).where(eq(sessions.id, sid))
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null
  }
  return session
}

export async function revokeSession(tx: any, sessionId: string) {
  await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId))
}

export async function revokeAllForPlayer(tx: any, playerId: string) {
  await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.playerId, playerId))
}

export async function revokeAllForStaff(tx: any, staffId: string) {
  await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.staffId, staffId))
}
