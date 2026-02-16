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

## Drizzle

```bash
bun run check         # TypeScript typecheck
bun run db:generate   # generate SQL migrations
bun run db:migrate    # apply migrations
bun run db:push       # push schema directly (dev fast-path)
bun run db:ensure-schema # create the theo schema if missing
bun run db:push:reset # drop theo schema (cascade) and push cleanly
bun run drizzle:studio
```

## AI Smoke Test

```bash
bun run ai:test:zen-gemini-object
bun run ai:test:zen-claude-haiku-object
```

## Environment

Set `DATABASE_URL` before running migrations/checks.
