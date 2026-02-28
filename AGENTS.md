## Cursor Cloud specific instructions

### Overview

r8y is a Bun + Turborepo monorepo (YouTube channel analytics dashboard). See `CLAUDE.md` for coding conventions and `README.md` for deployment details.

### Services

| Service | How to run | Notes |
|---|---|---|
| **Web dashboard** (`apps/web`) | `DATABASE_URL=... APP_SECRET_PASSCODE=... bun run dev:web` | SvelteKit on port 5173. Requires `DATABASE_URL`. Set `APP_SECRET_PASSCODE` for auth (any string). |
| **Live crawler** (`apps/live-crawler`) | `DATABASE_URL=... bun run dev:crawler` | Optional. Needs `YT_API_KEY` + `DATABASE_URL`. |

### Database

PostgreSQL is required. After starting Postgres, create a database and push both schemas:

```
bun run --cwd packages/theo-data db:push
bun run --cwd packages/davis-sync db:push
```

The `pg_trgm` extension must be enabled on the database (`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).

### Running checks, tests, and format

- **Type check:** `bun run check`
- **Tests:** `DATABASE_URL=... bunx turbo run test --env-mode=loose` (turbo's default strict env mode strips `DATABASE_URL`; use `--env-mode=loose` or run per-package with `bun test`)
- **Format:** `bun run format` (requires `prettier` installed globally or per-package; `bun add --global prettier` avoids `bunx` race conditions in parallel turbo runs)

### Gotchas

- Turbo strips environment variables by default. Use `--env-mode=loose` when running tasks that need `DATABASE_URL` (notably `test`). The `check` and `format` tasks don't need it.
- `bunx prettier` can fail with "FileNotFound" when multiple turbo tasks resolve it in parallel. Install prettier globally (`bun add --global prettier`) to avoid this.
- The web app redirects to `/unlock` when `APP_SECRET_PASSCODE` is set. If unset/empty, all non-public routes still redirect to `/unlock` since `Boolean('')` is `false`.
