import { cookies } from 'next/headers'
import { db } from '../db/client'
import { openSessionId, loadSession } from './session'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function requireSession(request?: Request, _db?: any) {
  const c = await cookies()
  const token = c.get('session')?.value
  if (!token) throw new HttpError(401, 'Unauthorized')
  
  const sid = await openSessionId(token)
  if (!sid) throw new HttpError(401, 'Unauthorized')
  
  const session = await loadSession(db, sid)
  if (!session) throw new HttpError(401, 'Unauthorized')
  
  return session
}

export function requireRole(session: any, allowed: string[]) {
  if (!allowed.includes(session.role)) {
    throw new HttpError(403, 'Forbidden')
  }
}

export async function requireSessionAndRole(request: Request | undefined, _db: any, allowed: string[]) {
  const session = await requireSession(request, _db)
  requireRole(session, allowed)
  return session
}
