import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { davisSchema } from 'davis-sync/schema'
import { DATABASE_URL } from '$env/static/private'

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for web')
}

const pool = new Pool({
  connectionString: DATABASE_URL,
})

export const davisDb = drizzle(pool, {
  schema: davisSchema,
})
