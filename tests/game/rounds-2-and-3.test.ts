import { describe, it, expect } from 'vitest'
import {
  CIPHER_FRAGMENTS,
  MASTER_SENTENCE,
  normalizeSentence,
  validateFragment,
  validateMasterSentence,
} from '../../lib/game/cipher-data'

describe('Cipher Data', () => {
  it('has exactly 6 fragments', () => {
    expect(CIPHER_FRAGMENTS).toHaveLength(6)
  })

  it('fragment plaintexts reconstruct the master sentence', () => {
    const assembled = CIPHER_FRAGMENTS.map((f) => f.plaintext).join(' ')
    expect(normalizeSentence(assembled)).toBe(normalizeSentence(MASTER_SENTENCE))
  })

  it('validateFragment accepts correct plaintext (case-insensitive)', () => {
    for (const frag of CIPHER_FRAGMENTS) {
      expect(validateFragment(frag.fragmentIndex, frag.plaintext.toLowerCase())).toBe(true)
    }
  })

  it('validateFragment rejects wrong text', () => {
    expect(validateFragment(0, 'WRONG ANSWER')).toBe(false)
  })

  it('validateMasterSentence accepts the exact master sentence', () => {
    expect(validateMasterSentence(MASTER_SENTENCE)).toBe(true)
  })

  it('validateMasterSentence accepts case-insensitive and extra whitespace', () => {
    expect(validateMasterSentence(MASTER_SENTENCE.toLowerCase())).toBe(true)
    expect(validateMasterSentence('  ' + MASTER_SENTENCE + '  ')).toBe(true)
  })

  it('validateMasterSentence rejects wrong sentence', () => {
    expect(validateMasterSentence('THE WRONG SENTENCE')).toBe(false)
  })
})

// Task 3 (Bomb Defusal) no longer has an in-repo logic-gate implementation —
// it was replaced with an external-link + admin-manual-entry flow (mirrors
// Task 1's quiz), so lib/game/logic-gates-data.ts and its tests were removed.
// See app/api/tasks/3/state and app/api/admin/bomb-defusal for the current
// Task 3 implementation.
