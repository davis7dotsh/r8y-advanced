/**
 * Creates pg_trgm GIN indexes on text search columns so that ilike '%...%'
 * queries are served from an index instead of doing a full table scan.
 *
 * Requires the pg_trgm extension (available by default on most hosted Postgres
 * providers). Run once per database, or include in your deploy pipeline.
 *
 * Usage: bun run scripts/ensure-trgm-indexes.ts
 */
import { SQL } from "bun";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = new SQL(databaseUrl);

await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

await sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS davis_videos_title_trgm
    ON davis.videos
    USING gin (title gin_trgm_ops)
`;

await sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS davis_sponsors_name_trgm
    ON davis.sponsors
    USING gin (name gin_trgm_ops)
`;

console.log("davis: pg_trgm GIN indexes ensured");

await sql.end();
