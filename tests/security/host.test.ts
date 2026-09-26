import { expect, test } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '../../proxy'
import { env } from '../../lib/env'

test('Disallowed Host -> 400', () => {
  const req = new NextRequest('http://evil.com', {
    headers: { 'host': 'evil.com' }
  })
  
  const res = proxy(req)
  expect(res.status).toBe(400)
})

test('Allowed Host -> passes through', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).not.toBe(400)
})

test('/api/leaderboard with no session cookie -> redirected away, never reaches the route (B5 fix)', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/api/leaderboard`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

test('/api/leaderboard?source=projector with no session cookie -> STILL redirected (legacy bypass closed at the proxy layer too)', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/api/leaderboard?source=projector`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

test('/leaderboard page with no session cookie -> redirected to login', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/leaderboard`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

test('/admin with no session cookie -> redirected to login (regression test for the isPublic startsWith(\'/\') bug — this previously let ANY protected page through unauthenticated)', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/admin`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

test('/player with no session cookie -> redirected to login (same regression coverage)', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/player`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toContain('/login')
})

test('root path / with no session cookie -> still public, NOT redirected', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/`, {
    headers: { 'host': allowed }
  })

  const res = proxy(req)
  expect(res.status).not.toBe(307)
})

test('/api/leaderboard WITH a session cookie -> passes through the proxy layer (route itself still re-checks role)', () => {
  const allowed = env.ALLOWED_HOSTS.split(',')[0].trim()
  const req = new NextRequest(`http://${allowed}/api/leaderboard`, {
    headers: { 'host': allowed, cookie: 'session=some-signed-token' }
  })

  const res = proxy(req)
  expect(res.status).not.toBe(307)
  expect(res.status).not.toBe(400)
})
