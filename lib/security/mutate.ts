import { z } from 'zod'
import { assertSameOrigin } from './csrf'
import { rateLimit } from './rate-limit'
import { requireSessionAndRole } from '../auth/guard'
import { db } from '../db/client'

export async function mutate<T>(
  req: Request,
  opts: {
    schema: z.Schema<T>,
    roles?: string[],
    rateLimitKey: string,
    rateLimitCount: number,
    action: (parsed: T, session: any, tx: any) => Promise<any>
  }
) {
  try {
    assertSameOrigin(req)
    const ip = req.headers.get('x-forwarded-for') || 'ip'
    await rateLimit(db, `${opts.rateLimitKey}:${ip}`, opts.rateLimitCount)
    
    let session = null
    if (opts.roles) {
      session = await requireSessionAndRole(req, db, opts.roles)
    }
    
    const body = opts.schema.parse(await req.json())
    const result = await db.transaction(async (tx) => {
      return await opts.action(body, session, tx)
    })
    
    return Response.json(result)
  } catch (err: any) {
    const status = err.status || (err.message === 'Rate limit exceeded' ? 429 : 400)
    return new Response(err.message, { status })
  }
}
