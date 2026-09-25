import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CIPHER_MISSION,
  normalizeSentence,
  validateMasterSentence,
} from '@/lib/game/cipher-data'
import { LOGIC_GATE_STAGES } from '@/lib/game/logic-gates-data'

describe('Round 2: Cipher Task Verification', () => {
  it('has 6 distinct fragments for all 6 crewmates', () => {
    expect(DEFAULT_CIPHER_MISSION.fragments).toHaveLength(6)
    const indices = DEFAULT_CIPHER_MISSION.fragments.map((f) => f.playerIndex)
    expect(indices).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('normalizes sentences correctly by ignoring case and non-alphanumeric characters', () => {
    const raw = 'The   Robotics Club!  '
    expect(normalizeSentence(raw)).toBe('THE ROBOTICS CLUB')
  })

  it('validates the master sentence assembled from crew fragments', () => {
    const valid = 'THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB'
    expect(validateMasterSentence(valid)).toBe(true)

    // With extra spacing and lower case
    const loose = '  the robotics  club expedition to the stars begins tonight in nab. '
    expect(validateMasterSentence(loose)).toBe(true)

    // Invalid sentence
    expect(validateMasterSentence('RANDOM WRONG SENTENCE')).toBe(false)
  })
})

describe('Round 3: Logic Gate Bomb Defusal Verification', () => {
  it('has 5 sequential logic gate stages', () => {
    expect(LOGIC_GATE_STAGES).toHaveLength(5)
  })

  it('verifies Stage 1 AND gate (A=1, B=1)', () => {
    const stage1 = LOGIC_GATE_STAGES[0]!
    expect(stage1.verify({ A: 1, B: 1 })).toBe(true)
    expect(stage1.verify({ A: 1, B: 0 })).toBe(false)
    expect(stage1.verify({ A: 0, B: 1 })).toBe(false)
    expect(stage1.verify({ A: 0, B: 0 })).toBe(false)
  })

  it('verifies Stage 2 NOR gate (C=0, D=0)', () => {
    const stage2 = LOGIC_GATE_STAGES[1]!
    expect(stage2.verify({ C: 0, D: 0 })).toBe(true)
    expect(stage2.verify({ C: 1, D: 0 })).toBe(false)
    expect(stage2.verify({ C: 0, D: 1 })).toBe(false)
    expect(stage2.verify({ C: 1, D: 1 })).toBe(false)
  })

  it('verifies Stage 3 XOR gate (inputs differ)', () => {
    const stage3 = LOGIC_GATE_STAGES[2]!
    expect(stage3.verify({ E: 1, F: 0 })).toBe(true)
    expect(stage3.verify({ E: 0, F: 1 })).toBe(true)
    expect(stage3.verify({ E: 1, F: 1 })).toBe(false)
    expect(stage3.verify({ E: 0, F: 0 })).toBe(false)
  })

  it('verifies Stage 4 compound NAND-OR gate ((G NAND H) AND J = 1)', () => {
    const stage4 = LOGIC_GATE_STAGES[3]!
    expect(stage4.verify({ G: 0, H: 1, J: 1 })).toBe(true)
    expect(stage4.verify({ G: 1, H: 0, J: 1 })).toBe(true)
    expect(stage4.verify({ G: 1, H: 1, J: 1 })).toBe(false) // NAND fails
    expect(stage4.verify({ G: 0, H: 0, J: 0 })).toBe(false) // J is 0
  })

  it('verifies Stage 5 Master Detonator override ((K XOR L) AND (M OR NOT N) = 1)', () => {
    const stage5 = LOGIC_GATE_STAGES[4]!
    // K=1, L=0 (XOR true), M=1, N=1 (OR true)
    expect(stage5.verify({ K: 1, L: 0, M: 1, N: 1 })).toBe(true)
    // K=0, L=1 (XOR true), M=0, N=0 (NOT N true -> OR true)
    expect(stage5.verify({ K: 0, L: 1, M: 0, N: 0 })).toBe(true)
    // K=1, L=1 (XOR false)
    expect(stage5.verify({ K: 1, L: 1, M: 1, N: 0 })).toBe(false)
  })
})
