import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { theoSchema } from '@r8y/theo-data/schema'
import { env } from '$env/dynamic/private'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

export const db = drizzle(pool, {
  schema: theoSchema,
})
