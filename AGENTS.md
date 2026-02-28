## Cursor Cloud specific instructions

### Overview

r8y is a Bun + Turborepo monorepo (YouTube channel analytics dashboard). See `CLAUDE.md` for coding conventions and `README.md` for deployment details.

### Secrets

The following secrets are injected as environment variables: `DATABASE_URL`, `APP_SECRET_PASSCODE`, `YT_API_KEY`, `X_API_KEY`, `OPENCODE_API_KEY`. Do **not** override `DATABASE_URL` — the injected value points to a remote PostgreSQL instance with production data. The remote DB requires SSL (`sslmode=verify-full`); use `PGSSLROOTCERT=system` if connecting with `psql` locally.

### Services

| Service | How to run | Notes |
|---|---|---|
| **Web dashboard** (`apps/web`) | `bun run dev:web` | SvelteKit on port 5173. Uses injected `DATABASE_URL` and `APP_SECRET_PASSCODE`. |
| **Live crawler** (`apps/live-crawler`) | `bun run dev:crawler` | Optional. Uses injected `YT_API_KEY` + `DATABASE_URL`. |

### Database

The injected `DATABASE_URL` already points to a provisioned remote PostgreSQL database with data (403 Theo videos, 16 Davis videos). No local Postgres setup is needed for normal development.

### Running checks, tests, and format

- **Type check:** `bun run check`
- **Tests:** `DATABASE_URL=... bunx turbo run test --env-mode=loose` (turbo's default strict env mode strips `DATABASE_URL`; use `--env-mode=loose` or run per-package with `bun test`)
- **Format:** `bun run format` (requires `prettier` installed globally or per-package; `bun add --global prettier` avoids `bunx` race conditions in parallel turbo runs)

### Gotchas

- Turbo strips environment variables by default. Use `--env-mode=loose` when running tasks that need `DATABASE_URL` (notably `test`). The `check` and `format` tasks don't need it.
- `bunx prettier` can fail with "FileNotFound" when multiple turbo tasks resolve it in parallel. Install prettier globally (`bun add --global prettier`) to avoid this.
- The web app redirects to `/unlock` when `APP_SECRET_PASSCODE` is set. If unset/empty, all non-public routes still redirect to `/unlock` since `Boolean('')` is `false`.
