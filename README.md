# r8y

Channel management system for Theo (t3) and Ben Davis.

## CHANNEL IDS

- Theo: UCbRP3c757lWg9M-U7TyEkXA
- Ben Davis: UCFvPgPdb_emE_bpMZq6hmJQ

## Deploy

### Web (`apps/web`) on Vercel

1. Create a Vercel project with root directory set to `apps/web`.
2. Confirm install/build commands are `bun install` and `bun run build` (configured in `apps/web/vercel.json`).
3. The web app uses Nitro (`apps/web/vite.config.ts`) so Vercel can run SSR/server routes.
4. Set required environment variables:
   - `DATABASE_URL`
   - `X_API_KEY` (optional, required for X metrics features)

### Live crawler (`apps/live-crawler`) on Railway

1. This is a shared Bun workspace monorepo, so set Railway root directory to repository root (`/`), not `apps/live-crawler`.
2. Use the root `railway.json`, which runs the service with `bun run start:live-crawler`.
3. Set environment variables:
   - `DATABASE_URL`
   - `YT_API_KEY`
   - `OPENCODE_API_KEY` (recommended)
   - `X_API_KEY` (recommended)
   - `CRAWLER_CHANNEL_IDS` (optional, comma-separated)
   - `CRAWLER_INTERVAL_MS` (optional, defaults to `300000`)
