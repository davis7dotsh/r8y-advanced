import { SQL } from "bun";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = new SQL(databaseUrl);

await sql`DROP SCHEMA IF EXISTS "theo" CASCADE`;
await sql`CREATE SCHEMA "theo"`;
