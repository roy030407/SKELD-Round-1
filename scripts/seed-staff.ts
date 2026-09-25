import { db } from '../lib/db/client'
import { staffAccounts } from '../lib/db/schema'
import { hashPassword } from '../lib/auth/password'
import { env } from '../lib/env'
import { eq } from 'drizzle-orm'

export async function seedStaff() {
  const staff = [
    { username: env.STAFF_ADMIN_USERNAME, password: env.STAFF_ADMIN_PASSWORD, role: 'admin' },
    { username: env.STAFF_MONITOR_USERNAME, password: env.STAFF_MONITOR_PASSWORD, role: 'monitor' },
    { username: env.STAFF_DISPLAY_USERNAME, password: env.STAFF_DISPLAY_PASSWORD, role: 'display' },
  ]
  
  for (const s of staff) {
    const passwordHash = await hashPassword(s.password)
    
    const existing = await db.select().from(staffAccounts).where(eq(staffAccounts.username, s.username))
    if (existing.length === 0) {
      await db.insert(staffAccounts).values({
        username: s.username,
        passwordHash,
        role: s.role
      })
      console.log(`Seeded staff: ${s.username}`)
    } else {
      console.log(`Staff already exists: ${s.username}`)
    }
  }
}

if (require.main === module) {
  seedStaff().then(() => {
    console.log('Staff seeded')
    process.exit(0)
  }).catch((err) => {
    console.error('Failed to seed staff', err)
    process.exit(1)
  })
}
