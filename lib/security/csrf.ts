import { env } from '../env'

/**
 * Same-origin (CSRF) check.
 *
 * Accepts any host in ALLOWED_HOSTS, not just APP_URL's host: a Vercel
 * deployment answers on several aliases (the project domain, the git-branch
 * alias, and a per-deployment URL). Pinning this to APP_URL alone meant that
 * anyone who opened the app on any other legitimate alias got a bare 401
 * "Invalid origin" on login, registration and check-in, which is impossible
 * to diagnose from the UI.
 */
function allowedOrigins(): Set<string> {
  const hosts = env.ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
  const origins = new Set<string>()

  try {
    origins.add(new URL(env.APP_URL).origin)
  } catch {
    // APP_URL is validated as a URL at boot, so this is unreachable in
    // practice; ignore rather than block every mutating request.
  }

  for (const host of hosts) {
    origins.add(`https://${host}`)
    origins.add(`http://${host}`)
  }

  return origins
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const allowed = allowedOrigins()

  if (origin && !allowed.has(origin)) {
    throw new Error('Invalid origin')
  }

  if (!origin && referer) {
    let refererOrigin: string
    try {
      refererOrigin = new URL(referer).origin
    } catch {
      throw new Error('Invalid referer')
    }
    if (!allowed.has(refererOrigin)) {
      throw new Error('Invalid referer')
    }
  }
}
