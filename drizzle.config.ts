import { defineConfig } from 'drizzle-kit'
import { env } from './lib/env'

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: env.DIRECT_URL },
  entities: { roles: { provider: 'supabase' } },
})
