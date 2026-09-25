import { describe, it, expect, vi } from 'vitest'
import { canEnterTask } from '@/lib/gating'
import { db } from '@/lib/db/client'

describe('Check-In & Task Gating (lib/gating.ts) — TEST-03', () => {
  it('rejects invalid task numbers', async () => {
    const res = await canEnterTask('mock-team-id', 0)
    expect(res.allowed).toBe(false)
    expect(res.reason).toContain('Invalid task number')
  })

  it('rejects entry to Task 1 if team check-in is not full', async () => {
    let callCount = 0
    vi.spyOn(db, 'select').mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Return 2 players
        return {
          from: () => ({
            where: () => Promise.resolve([
              { id: '1', firstName: 'P1', playerCode: 'P001', teamId: 't1' },
              { id: '2', firstName: 'P2', playerCode: 'P002', teamId: 't1' },
            ]),
          }),
        } as any
      } else {
        // Return 0 check-ins
        return {
          from: () => Promise.resolve([]),
        } as any
      }
    })

    const res = await canEnterTask('t1', 1)
    expect(res.allowed).toBe(false)
    expect(res.reason).toContain('All 6 must be checked in')
  })
})
