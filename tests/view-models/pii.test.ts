import { expect, test } from 'vitest'
import { toPublicPlayer, toAdminPlayer } from '../../lib/view-models/player-public'

test('toPublicPlayer does NOT include email/rollNumber', () => {
  const player = {
    id: 'uuid',
    firstName: 'John',
    teamId: 'team',
    playerCode: 'P001',
    isLeader: false,
    email: 'test@test.com',
    rollNumber: '22BCE1234'
  }
  
  const pub = toPublicPlayer(player)
  expect((pub as any).email).toBeUndefined()
  expect((pub as any).rollNumber).toBeUndefined()
  expect(pub.firstName).toBe('John')
})

test('toAdminPlayer DOES include email/rollNumber', () => {
  const player = {
    id: 'uuid',
    firstName: 'John',
    teamId: 'team',
    playerCode: 'P001',
    isLeader: false,
    email: 'test@test.com',
    rollNumber: '22BCE1234'
  }
  
  const admin = toAdminPlayer(player)
  expect(admin.email).toBeDefined()
  expect(admin.rollNumber).toBeDefined()
})
