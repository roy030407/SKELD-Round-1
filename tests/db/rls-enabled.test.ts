import { expect, test } from 'vitest'
import { db } from '../../lib/db/client'
import { sql } from 'drizzle-orm'

test.skipIf(!process.env.DIRECT_URL || process.env.DIRECT_URL.includes('dummy') || process.env.DIRECT_URL.includes('xxxx'))('all tables have RLS', async () => {
  const result = await db.execute(sql`
    SELECT relname 
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relrowsecurity = false;
  `)
  expect(result).toHaveLength(0)
})
