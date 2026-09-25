// lib/game/logic-gates-data.ts
// Round 3 Reactor Bomb Defusal Logic Gate Puzzles

export interface LogicGateStage {
  stageNumber: number
  title: string
  description: string
  diagram: string // ASCII / visual representation
  inputs: Array<{ id: string; label: string; defaultVal: 0 | 1 }>
  targetOutput: 0 | 1
  verify: (inputs: Record<string, 0 | 1>) => boolean
  hint: string
}

export const LOGIC_GATE_STAGES: LogicGateStage[] = [
  {
    stageNumber: 1,
    title: 'Primary Capacitor: AND Gate',
    description: 'Stabilize the main power rail by configuring inputs A and B to yield Output 1.',
    diagram: 'A [__] ───\\ \n          )── AND ── Output: 1\nB [__] ───/ ',
    inputs: [
      { id: 'A', label: 'Terminal A', defaultVal: 0 },
      { id: 'B', label: 'Terminal B', defaultVal: 0 },
    ],
    targetOutput: 1,
    verify: (inputs) => inputs.A === 1 && inputs.B === 1,
    hint: 'Both inputs into an AND gate must be active (1) to produce an output of 1.',
  },
  {
    stageNumber: 2,
    title: 'Coolant Flow Circuit: NOR Gate',
    description: 'The coolant loop is overheating! Cut the alarm signal by configuring inputs C and D so Output is 1.',
    diagram: 'C [__] ───\\ \n          )── OR ──(O)── Output: 1\nD [__] ───/ ',
    inputs: [
      { id: 'C', label: 'Valve C', defaultVal: 1 },
      { id: 'D', label: 'Valve D', defaultVal: 0 },
    ],
    targetOutput: 1,
    verify: (inputs) => inputs.C === 0 && inputs.D === 0,
    hint: 'NOR gate produces 1 ONLY when both inputs are 0 (NOT(C OR D)).',
  },
  {
    stageNumber: 3,
    title: 'Magnetic Containment: XOR Disarm',
    description: 'Eliminate resonance feedback in the containment ring. Output must be 1, but matching inputs will trigger explosion!',
    diagram: 'E [__] ───\\ \n          ))── XOR ── Output: 1\nF [__] ───/ ',
    inputs: [
      { id: 'E', label: 'Flux E', defaultVal: 0 },
      { id: 'F', label: 'Flux F', defaultVal: 0 },
    ],
    targetOutput: 1,
    verify: (inputs) => inputs.E !== inputs.F,
    hint: 'XOR produces 1 only when inputs differ (one is 1, the other is 0).',
  },
  {
    stageNumber: 4,
    title: 'Plasma Injector: Compound NAND-OR Mesh',
    description: 'Balance the multi-stage injector. Output must equal 1. Formula: (G NAND H) AND J = 1.',
    diagram: 'G [__] ──\\ \n         )── NAND ──\\ \nH [__] ──/           )── AND ── Output: 1\nJ [__] ─────────────/ ',
    inputs: [
      { id: 'G', label: 'Coil G', defaultVal: 1 },
      { id: 'H', label: 'Coil H', defaultVal: 1 },
      { id: 'J', label: 'Igniter J', defaultVal: 0 },
    ],
    targetOutput: 1,
    verify: (inputs) => !(inputs.G === 1 && inputs.H === 1) && inputs.J === 1,
    hint: 'J must be 1. For NAND, G and H cannot both be 1.',
  },
  {
    stageNumber: 5,
    title: 'Master Detonator Override: 4-Channel Bus',
    description: 'Final defusal bypass! Disarm the detonation timer. Formula: (K XOR L) AND (M OR NOT N) = 1.',
    diagram: 'K [__] ──\\ \n         ))── XOR ──\\ \nL [__] ──/           \\\nM [__] ──\\            )── AND ── Output: 1\n          )── OR ────/ \nN [__] ──[NOT]──/ ',
    inputs: [
      { id: 'K', label: 'Switch K', defaultVal: 0 },
      { id: 'L', label: 'Switch L', defaultVal: 0 },
      { id: 'M', label: 'Switch M', defaultVal: 0 },
      { id: 'N', label: 'Switch N', defaultVal: 1 },
    ],
    targetOutput: 1,
    verify: (inputs) => {
      const xorPart = inputs.K !== inputs.L
      const notN = inputs.N === 0 ? 1 : 0
      const orPart = inputs.M === 1 || notN === 1
      return xorPart && orPart
    },
    hint: 'K and L must differ. Either M must be 1 OR N must be 0.',
  },
]
