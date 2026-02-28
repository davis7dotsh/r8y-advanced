# live-crawler

Long-running RSS crawler service for YouTube channels.

## Run

```bash
bun run start
```

## Environment

- `DATABASE_URL` (required)
- `YT_API_KEY` (required)
- `OPENCODE_API_KEY` (recommended for sponsor/comment enrichment)
- `X_API_KEY` (recommended for X metrics refresh)
- `CRAWLER_CHANNEL_IDS` (optional, comma-separated list of YouTube channel ids)
- `CRAWLER_INTERVAL_MS` (optional, default `300000`)
- `CRAWLER_RUN_ONCE` (optional, set `true` for one-off execution)
- `CRAWLER_LOG_LEVEL` (optional, one of `info`, `warn`, `error`, `silent`; default `warn`)

Default channels are Theo (`UCbRP3c757lWg9M-U7TyEkXA`), Ben (`UCFvPgPdb_emE_bpMZq6hmJQ`), and Micky (`UCBX__dPYqDFqAN4QcWbnUbw`).
