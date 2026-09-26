import { expect, test, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// This is a REAL trace of app/api/leaderboard/route.ts's actual authorization
// logic (requireSession -> role branch -> response shape). Only the true
// external boundaries are mocked (Next's cookie store, the DB-backed session
// loader, and the DB-backed leaderboard aggregator) so the test never needs a
// live database, matching the convention already used by
// tests/security/host.test.ts (real proxy.ts, direct NextRequest).
//
// Confirms the B5 fix directly: an unauthenticated request is rejected before
// ever reaching getLeaderboard(), a plain player session never receives the
// full leaderboard even when it supplies the old `?source=projector` bypass
// query param, and only a real staff/display session gets the full board.

let currentCookieToken: string | null = null

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name === 'session' && currentCookieToken ? { value: currentCookieToken } : undefined),
  }),
}))

vi.mock('@/lib/auth/session', () => ({
  openSessionId: async (token: string) => (token ? `sid-for-${token}` : null),
  loadSession: async (_db: any, sid: string) => {
    if (sid === 'sid-for-player-token') {
      return { id: sid, role: 'player', teamId: 'team-1', playerId: 'player-1' }
    }
    if (sid === 'sid-for-admin-token') {
      return { id: sid, role: 'admin', staffId: 'staff-1' }
    }
    if (sid === 'sid-for-display-token') {
      return { id: sid, role: 'display', staffId: 'staff-2' }
    }
    return null
  },
}))

vi.mock('@/lib/scoring/ledger', () => ({
  getLeaderboard: async () => [
    { teamId: 'team-1', teamCode: 'T1', teamName: 'Team One', rank: 1, totalPoints: 42, task1Points: 10, task2Points: 10, task3Points: 10, task4Points: 10, betBonus: 2 },
    { teamId: 'team-2', teamCode: 'T2', teamName: 'Team Two', rank: 2, totalPoints: 30, task1Points: 5, task2Points: 5, task3Points: 10, task4Points: 10, betBonus: 0 },
  ],
}))

vi.mock('@/lib/db/client', () => ({ db: {} }))

beforeEach(() => {
  currentCookieToken = null
})

function requestWithQuery(query: string) {
  return new NextRequest(`http://localhost/api/leaderboard${query}`)
}

test('no session cookie at all -> 401, leaderboard never computed/returned', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = null
  const res = await GET(requestWithQuery(''))
  expect(res.status).toBe(401)
  const text = await res.text()
  expect(text).not.toContain('Team One')
})

test('plain player session -> hiddenForPlayers true, no full leaderboard array', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = 'player-token'
  const res = await GET(requestWithQuery(''))
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.hiddenForPlayers).toBe(true)
  expect(data.leaderboard).toBeUndefined()
})

test('player session + legacy ?source=projector bypass -> STILL hidden (bypass is closed)', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = 'player-token'
  const res = await GET(requestWithQuery('?source=projector'))
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.hiddenForPlayers).toBe(true)
  expect(data.leaderboard).toBeUndefined()
})

test('unauthenticated request + ?source=projector -> still 401 (no anonymous bypass)', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = null
  const res = await GET(requestWithQuery('?source=projector'))
  expect(res.status).toBe(401)
})

test('real admin session -> full leaderboard', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = 'admin-token'
  const res = await GET(requestWithQuery(''))
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.hiddenForPlayers).toBe(false)
  expect(data.leaderboard).toHaveLength(2)
})

test('real display (projector) session -> full leaderboard without needing the query param', async () => {
  const { GET } = await import('@/app/api/leaderboard/route')
  currentCookieToken = 'display-token'
  const res = await GET(requestWithQuery(''))
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.hiddenForPlayers).toBe(false)
  expect(data.leaderboard).toHaveLength(2)
})
