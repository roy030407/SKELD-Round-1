import { env } from '../env'

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const expectedOrigin = new URL(env.APP_URL).origin
  
  if (origin && origin !== expectedOrigin) {
    throw new Error('Invalid origin')
  }
  
  if (!origin && referer && new URL(referer).origin !== expectedOrigin) {
    throw new Error('Invalid referer')
  }
}
