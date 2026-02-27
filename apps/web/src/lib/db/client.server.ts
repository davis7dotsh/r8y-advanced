import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { theoSchema } from '@r8y/theo-data/schema'
import { env } from '$env/dynamic/private'

// Shared pool — reused by both theo and davis Drizzle instances to avoid
// doubling idle connections. Sized conservatively for a small dashboard app.
export const sharedPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export const db = drizzle(sharedPool, {
  schema: theoSchema,
})
