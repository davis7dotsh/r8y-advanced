import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { davisSchema } from 'davis-sync/schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for web')
}

const pool = new Pool({
  connectionString: databaseUrl,
})

export const davisDb = drizzle(pool, {
  schema: davisSchema,
})
