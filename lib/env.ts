import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),         // port 6543 Supavisor transaction pooler
  DIRECT_URL: z.string().url(),           // port 5432 for drizzle-kit migrations
  SESSION_SECRET: z.string().min(32),
  ALLOWED_HOSTS: z.string(),              // comma-separated list
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Staff credentials
  STAFF_ADMIN_USERNAME: z.string(),
  STAFF_ADMIN_PASSWORD: z.string().min(12),
  STAFF_MONITOR_USERNAME: z.string(),
  STAFF_MONITOR_PASSWORD: z.string().min(12),
  STAFF_DISPLAY_USERNAME: z.string(),
  STAFF_DISPLAY_PASSWORD: z.string().min(12),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>
