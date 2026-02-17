import { drizzle } from 'drizzle-orm/bun-sql'
import { theoSchema } from 'theo-data/schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for web')
}

export const db = drizzle(databaseUrl, {
  schema: theoSchema,
})
