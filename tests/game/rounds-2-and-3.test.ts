import { describe, it, expect } from 'vitest'
import {
  CIPHER_FRAGMENTS,
  MASTER_SENTENCE,
  normalizeSentence,
  validateFragment,
  validateMasterSentence,
} from '../../lib/game/cipher-data'
import { LOGIC_GATE_STAGES } from '../../lib/game/logic-gates-data'

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

describe('Logic Gate Stages', () => {
  it('has exactly 5 stages', () => {
    expect(LOGIC_GATE_STAGES).toHaveLength(5)
  })

  it('Stage 0 AND: verify(A=1, B=1) = true', () => {
    expect(LOGIC_GATE_STAGES[0].verify({ A: 1, B: 1 })).toBe(true)
  })

  it('Stage 0 AND: verify(A=1, B=0) = false', () => {
    expect(LOGIC_GATE_STAGES[0].verify({ A: 1, B: 0 })).toBe(false)
  })

  it('Stage 1 NOR: verify(A=0, B=0) = true', () => {
    expect(LOGIC_GATE_STAGES[1].verify({ A: 0, B: 0 })).toBe(true)
  })

  it('Stage 1 NOR: verify(A=1, B=0) = false', () => {
    expect(LOGIC_GATE_STAGES[1].verify({ A: 1, B: 0 })).toBe(false)
  })

  it('Stage 2 XOR: verify(A=1, B=0) = true', () => {
    expect(LOGIC_GATE_STAGES[2].verify({ A: 1, B: 0 })).toBe(true)
  })

  it('Stage 2 XOR: verify(A=1, B=1) = false', () => {
    expect(LOGIC_GATE_STAGES[2].verify({ A: 1, B: 1 })).toBe(false)
  })

  it('Stage 3 NAND-AND: verify(A=0, B=1, C=1) = true', () => {
    expect(LOGIC_GATE_STAGES[3].verify({ A: 0, B: 1, C: 1 })).toBe(true)
  })

  it('Stage 3 NAND-AND: verify(A=1, B=1, C=1) = false', () => {
    expect(LOGIC_GATE_STAGES[3].verify({ A: 1, B: 1, C: 1 })).toBe(false)
  })

  it('Stage 4 Complex: verify(A=1, B=0, C=1, D=0) = true', () => {
    expect(LOGIC_GATE_STAGES[4].verify({ A: 1, B: 0, C: 1, D: 0 })).toBe(true)
  })

  it('Stage 4 Complex: verify(A=0, B=0, C=1, D=0) = false (OR fails)', () => {
    expect(LOGIC_GATE_STAGES[4].verify({ A: 0, B: 0, C: 1, D: 0 })).toBe(false)
  })
})
