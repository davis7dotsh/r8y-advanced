import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { theoSchema } from '@r8y/theo-data/schema'
import { env } from '$env/dynamic/private'

const toPositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const isLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'

const shouldUseSsl = (databaseUrl: string) => {
  try {
    const parsed = new URL(databaseUrl)
    const sslMode = parsed.searchParams.get('sslmode')?.toLowerCase()

    if (sslMode === 'disable') {
      return false
    }

    if (
      sslMode === 'require' ||
      sslMode === 'verify-ca' ||
      sslMode === 'verify-full'
    ) {
      return true
    }

    return !isLocalHostname(parsed.hostname.toLowerCase())
  } catch {
    return true
  }
}

const databaseUrl = env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const sharedPool = new Pool({
  connectionString: databaseUrl,
  max: toPositiveInteger(
    env.PG_POOL_MAX,
    env.NODE_ENV === 'production' ? 3 : 10,
  ),
  idleTimeoutMillis: toPositiveInteger(env.PG_IDLE_TIMEOUT_MS, 10_000),
  connectionTimeoutMillis: toPositiveInteger(env.PG_CONNECT_TIMEOUT_MS, 3_000),
  allowExitOnIdle: true,
  keepAlive: true,
  ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: true } : undefined,
})

export const db = drizzle(sharedPool, {
  schema: theoSchema,
})
