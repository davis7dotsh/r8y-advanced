import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { theoSchema } from 'theo-data/schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for web')
}

const pool = new Pool({
  connectionString: databaseUrl,
})

export const db = drizzle(pool, {
  schema: theoSchema,
})
