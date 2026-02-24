import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { davisSchema } from '@r8y/davis-sync/schema'
import { env } from '$env/dynamic/private'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

export const davisDb = drizzle(pool, {
  schema: davisSchema,
})
