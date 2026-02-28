import { drizzle } from 'drizzle-orm/node-postgres'
import { mickySchema } from '@r8y/micky-data/schema'
import { sharedPool } from './client.server'

export const mickyDb = drizzle(sharedPool, {
  schema: mickySchema,
})
