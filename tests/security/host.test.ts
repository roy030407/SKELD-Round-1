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
