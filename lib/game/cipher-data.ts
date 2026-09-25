// lib/game/cipher-data.ts
// Round 2 Multi-Crew Cipher Mission Data

export interface CipherFragment {
  playerIndex: number // 1 to 6 (corresponding to P001..P006)
  cipherType: 'Caesar (+3)' | 'Atbash' | 'Reverse' | 'Hex' | 'Binary' | 'Caesar (+5)'
  clue: string
  encryptedText: string
  decryptedText: string
}

export interface CipherMission {
  id: string
  name: string
  masterSentence: string
  fragments: CipherFragment[]
}

export const DEFAULT_CIPHER_MISSION: CipherMission = {
  id: 'mission-alpha',
  name: 'Skeld Communications Array Restoration',
  masterSentence: 'THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB',
  fragments: [
    {
      playerIndex: 1,
      cipherType: 'Caesar (+3)',
      clue: 'Shift each letter 3 positions backward in the alphabet (A -> X, D -> A).',
      encryptedText: 'WKH URERWLFV',
      decryptedText: 'THE ROBOTICS',
    },
    {
      playerIndex: 2,
      cipherType: 'Reverse',
      clue: 'Reversed transmission order. Read the letters in reverse sequence.',
      encryptedText: 'BULC',
      decryptedText: 'CLUB',
    },
    {
      playerIndex: 3,
      cipherType: 'Caesar (+5)',
      clue: 'Shift each letter 5 positions backward in the alphabet (F -> A).',
      encryptedText: 'JCUJINYNTX YT',
      decryptedText: 'EXPEDITION TO',
    },
    {
      playerIndex: 4,
      cipherType: 'Atbash',
      clue: 'Atbash cipher: mirror each letter (A <-> Z, B <-> Y, C <-> X, G <-> T).',
      encryptedText: 'GSV HGZIH',
      decryptedText: 'THE STARS',
    },
    {
      playerIndex: 5,
      cipherType: 'Caesar (+3)',
      clue: 'Shift each letter 3 positions backward in the alphabet (E -> B).',
      encryptedText: 'EHJLQV WRQLJKW',
      decryptedText: 'BEGINS TONIGHT',
    },
    {
      playerIndex: 6,
      cipherType: 'Atbash',
      clue: 'Atbash cipher: mirror each letter (R <-> I, M <-> N).',
      encryptedText: 'RM MZY',
      decryptedText: 'IN NAB',
    },
  ],
}

/**
 * Normalizes a sentence for lenient comparison (trims extra spaces, ignores punctuation & case).
 */
export function normalizeSentence(str: string): string {
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Validates whether the submitted assembled sentence matches the master sentence.
 */
export function validateMasterSentence(submitted: string, mission: CipherMission = DEFAULT_CIPHER_MISSION): boolean {
  return normalizeSentence(submitted) === normalizeSentence(mission.masterSentence)
}
