import { drizzle } from 'drizzle-orm/node-postgres'
import { davisSchema } from '@r8y/davis-sync/schema'
import { sharedPool } from './client.server'

// Reuse the shared pool — same DATABASE_URL, just a different Drizzle schema overlay.
export const davisDb = drizzle(sharedPool, {
  schema: davisSchema,
})
