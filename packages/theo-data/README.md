# theo-data

Drizzle + Bun + PostgreSQL starter setup for the Theo Data package.

## Install

```bash
bun install
```

## Run

```bash
# Start the package entrypoint
bun run start
```

## Crawl

```bash
# Crawl one video (idempotent)
bun run crawl:video -- --video-id=dQw4w9WgXcQ --send-notifications=false

# Poll Theo RSS feed (live mode, notifications enabled)
bun run crawl:rss

# Backfill newest videos first
bun run crawl:backfill -- --limit=50 --concurrency=3
bun run crawl:backfill -- --limit=all --concurrency=3
```

## Visualizer

```bash
# Start internal web visualizer (default http://localhost:3032)
bun run visualizer
```

## Drizzle

```bash
bun run check         # TypeScript typecheck
bun run db:push       # push schema directly (dev fast-path)
bun run db:ensure-schema # create the theo schema if missing
bun run db:push:reset # drop theo schema (cascade) and push cleanly
bun run drizzle:studio
```

## AI Smoke Test

```bash
bun run baml:gen
bun run ai:test:zen-claude-haiku-object
```

## Environment

Set `DATABASE_URL` before running migrations/checks.
