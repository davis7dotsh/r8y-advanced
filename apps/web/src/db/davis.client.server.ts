import { drizzle } from 'drizzle-orm/bun-sql'
import { davisSchema } from 'davis-sync/schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for web')
}

export const davisDb = drizzle(databaseUrl, {
  schema: davisSchema,
})
