// lib/game/logic-gates-data.ts
// 5 sequential logic gate puzzles for Round 3 Bomb Defusal.
// Each stage: players toggle binary inputs → must produce the correct output.

export type InputDef = {
  label: string // e.g. "A", "B", "C"
  description?: string
}

export interface LogicGateStage {
  stageIndex: number // 0-4
  title: string
  description: string
  gateType: string
  inputs: InputDef[]
  /** Expected binary output (0 or 1) */
  expectedOutput: 0 | 1
  /** Given the player's inputs (keyed by label), return true if correct */
  verify: (inputs: Record<string, 0 | 1>) => boolean
}

export const LOGIC_GATE_STAGES: LogicGateStage[] = [
  {
    stageIndex: 0,
    title: 'Stage 1 — AND Gate',
    description: 'Both switches must be ON to disarm this circuit. Set A=1 and B=1.',
    gateType: 'AND',
    inputs: [
      { label: 'A', description: 'Primary relay switch' },
      { label: 'B', description: 'Secondary relay switch' },
    ],
    expectedOutput: 1,
    verify: (inputs) => inputs['A'] === 1 && inputs['B'] === 1,
  },
  {
    stageIndex: 1,
    title: 'Stage 2 — NOR Gate',
    description: 'Neither input must be active. Set A=0 and B=0 to get output 1.',
    gateType: 'NOR',
    inputs: [
      { label: 'A', description: 'Coolant valve A' },
      { label: 'B', description: 'Coolant valve B' },
    ],
    expectedOutput: 1,
    verify: (inputs) => inputs['A'] === 0 && inputs['B'] === 0,
  },
  {
    stageIndex: 2,
    title: 'Stage 3 — XOR Gate',
    description: 'Exactly one input must be active. Set A=1 B=0 (or A=0 B=1).',
    gateType: 'XOR',
    inputs: [
      { label: 'A', description: 'Wiring channel alpha' },
      { label: 'B', description: 'Wiring channel beta' },
    ],
    expectedOutput: 1,
    verify: (inputs) => (inputs['A'] ^ inputs['B']) === 1,
  },
  {
    stageIndex: 3,
    title: 'Stage 4 — Compound NAND-AND',
    description:
      'Two sub-circuits: NAND(A,B) feeds into AND with C. Find A, B, C so final output = 1.',
    gateType: 'NAND-AND',
    inputs: [
      { label: 'A', description: 'Sector A breaker' },
      { label: 'B', description: 'Sector B breaker' },
      { label: 'C', description: 'Master override' },
    ],
    // NAND(A,B)=1 when NOT(A AND B). AND(NAND(A,B), C)=1 when NAND=1 AND C=1.
    // Solution: A=0, B=1, C=1 → NAND(0,1)=1, AND(1,1)=1 ✓
    expectedOutput: 1,
    verify: (inputs) => {
      const nandAB = (inputs['A'] === 1 && inputs['B'] === 1) ? 0 : 1
      return nandAB === 1 && inputs['C'] === 1
    },
  },
  {
    stageIndex: 4,
    title: 'Stage 5 — 4-Channel Bus Override',
    description:
      'Four channels A, B, C, D. Output = (A OR B) AND (C XOR D). Target output = 1.',
    gateType: 'COMPLEX',
    inputs: [
      { label: 'A', description: 'Bus channel alpha' },
      { label: 'B', description: 'Bus channel beta' },
      { label: 'C', description: 'Bus channel gamma' },
      { label: 'D', description: 'Bus channel delta' },
    ],
    // Many solutions. One: A=1, B=0, C=1, D=0 → (1 OR 0)=1, (1 XOR 0)=1, AND=1 ✓
    expectedOutput: 1,
    verify: (inputs) => {
      const orAB = (inputs['A'] === 1 || inputs['B'] === 1) ? 1 : 0
      const xorCD = (inputs['C'] ^ inputs['D']) as 0 | 1
      return orAB === 1 && xorCD === 1
    },
  },
]
