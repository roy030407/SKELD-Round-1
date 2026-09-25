import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'
import { env } from '../env'

const client = postgres(env.DATABASE_URL, {
  prepare: false,   // REQUIRED: Supavisor transaction mode doesn't support prepared statements
  max: 1,
  ssl: 'require',
})
export const db = drizzle(client, { schema })
