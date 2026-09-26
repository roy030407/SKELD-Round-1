// lib/game/cipher-data.ts
// Cipher mission: 6 players each decode one encrypted fragment; leader assembles master sentence.
// Master sentence: "THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB"
// Each fragment is one word or phrase encrypted with a different cipher.

export interface CipherFragment {
  fragmentIndex: number // 0–5, matches player slot (playerCode suffix P001=0 … P006=5)
  encrypted: string
  cipherName: string
  clue: string
  plaintext: string // used server-side only for verification
}

// Master sentence the team must reconstruct
export const MASTER_SENTENCE =
  'THE ROBOTICS CLUB EXPEDITION TO THE STARS BEGINS TONIGHT IN NAB'

// Caesar shift helper
function caesarShift(text: string, shift: number): string {
  return text
    .split('')
    .map((c) => {
      if (c >= 'A' && c <= 'Z') {
        return String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65)
      }
      return c
    })
    .join('')
}

// Atbash: A↔Z, B↔Y, …
function atbash(text: string): string {
  return text
    .split('')
    .map((c) => {
      if (c >= 'A' && c <= 'Z') {
        return String.fromCharCode(90 - (c.charCodeAt(0) - 65))
      }
      return c
    })
    .join('')
}

// Reverse string
function reverse(text: string): string {
  return text.split('').reverse().join('')
}

// The 6 fragments — split the sentence into 6 meaningful chunks
// Plaintexts (combined exactly = MASTER_SENTENCE):
// P001: "THE ROBOTICS"   → Caesar +3
// P002: "CLUB"           → Reverse
// P003: "EXPEDITION"     → Caesar +5
// P004: "TO THE STARS"   → Atbash
// P005: "BEGINS TONIGHT" → Caesar +7
// P006: "IN NAB"         → Atbash

export const CIPHER_FRAGMENTS: CipherFragment[] = [
  {
    fragmentIndex: 0,
    plaintext: 'THE ROBOTICS',
    encrypted: caesarShift('THE ROBOTICS', 3),
    cipherName: 'Caesar Cipher (Shift +3)',
    clue: 'Each letter is shifted forward by 3 positions in the alphabet. Z wraps to C.',
  },
  {
    fragmentIndex: 1,
    plaintext: 'CLUB',
    encrypted: reverse('CLUB'),
    cipherName: 'Reverse Cipher',
    clue: 'The word is written backwards. Read it in reverse.',
  },
  {
    fragmentIndex: 2,
    plaintext: 'EXPEDITION',
    encrypted: caesarShift('EXPEDITION', 5),
    cipherName: 'Caesar Cipher (Shift +5)',
    clue: 'Each letter is shifted forward by 5 positions. Y→D, Z→E.',
  },
  {
    fragmentIndex: 3,
    plaintext: 'TO THE STARS',
    encrypted: atbash('TO THE STARS'),
    cipherName: 'Atbash Cipher',
    clue: 'A↔Z, B↔Y, C↔X … Mirror the alphabet.',
  },
  {
    fragmentIndex: 4,
    plaintext: 'BEGINS TONIGHT',
    encrypted: caesarShift('BEGINS TONIGHT', 7),
    cipherName: 'Caesar Cipher (Shift +7)',
    clue: 'Each letter is shifted forward by 7 positions.',
  },
  {
    fragmentIndex: 5,
    plaintext: 'IN NAB',
    encrypted: atbash('IN NAB'),
    cipherName: 'Atbash Cipher',
    clue: 'Mirror the alphabet: A↔Z, B↔Y …',
  },
]

/** Normalize a submitted sentence for comparison: uppercase + collapse whitespace */
export function normalizeSentence(s: string): string {
  return s.toUpperCase().replace(/\s+/g, ' ').trim()
}

/** Validate a player's decrypted fragment against the expected plaintext */
export function validateFragment(fragmentIndex: number, attempt: string): boolean {
  const frag = CIPHER_FRAGMENTS[fragmentIndex]
  if (!frag) return false
  return normalizeSentence(attempt) === normalizeSentence(frag.plaintext)
}

/** Validate the assembled master sentence */
export function validateMasterSentence(assembled: string): boolean {
  return normalizeSentence(assembled) === normalizeSentence(MASTER_SENTENCE)
}
