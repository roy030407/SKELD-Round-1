import fs from 'fs'
import path from 'path'
import { db } from '../lib/db/client'
import { words } from '../lib/db/schema'

export async function seedWords() {
  const content = fs.readFileSync(path.join(process.cwd(), 'seed/words.csv'), 'utf8')
  const lines = content.split('\n').filter(Boolean)
  const header = lines.shift()
  
  for (const line of lines) {
    const [category, crewWord, imposterWord] = line.split(',')
    if (crewWord && imposterWord) {
      await db.insert(words).values({ category: category?.trim() || 'General', crewWord: crewWord.trim(), imposterWord: imposterWord.trim() }).onConflictDoNothing()
    }
  }
}

if (require.main === module) {
  seedWords().then(() => {
    console.log('Words seeded')
    process.exit(0)
  }).catch((err) => {
    console.error('Failed to seed words', err)
    process.exit(1)
  })
}
