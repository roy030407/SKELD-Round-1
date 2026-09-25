import { db } from '../lib/db/client'
import { teams } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

export async function seedTeams(count = 25) {
  console.log(`Checking and seeding ${count} teams (SKELD-01 to SKELD-${count.toString().padStart(2, '0')})...`)

  for (let i = 1; i <= count; i++) {
    const code = `SKELD-${i.toString().padStart(2, '0')}`
    const name = `Team ${i}`

    const existing = await db.select().from(teams).where(eq(teams.code, code))
    if (existing.length === 0) {
      await db.insert(teams).values({
        code,
        name,
      })
      console.log(`Seeded team: ${code} (${name})`)
    } else {
      console.log(`Team already exists: ${code}`)
    }
  }
}

if (require.main === module) {
  seedTeams().then(() => {
    console.log('All teams ready!')
    process.exit(0)
  }).catch((err) => {
    console.error('Failed to seed teams', err)
    process.exit(1)
  })
}
