# Meridian — deployment notes

## Where to host

**Do not deploy on Vercel.** transformers.js downloads model files (~110 MB total)
on first use and caches them to a disk path that must persist across requests.
Vercel's serverless functions don't satisfy that — every cold start would
re-download, blow the 50 MB function size limit, and time out.

**Use a long-running Node host with persistent disk.** Confirmed options:

| Host | Tier | Monthly | Persistent disk | Notes |
|---|---|---|---|---|
| **Railway** | Hobby | $5 starting | Yes — included volume | One-click Node deploy, env vars panel. Recommended. |
| **Fly.io** | Hobby | ~$3 base + ~$0.15/GB | Yes — `fly volumes` | More config; more powerful. |
| **Render** | Starter | $7 | Yes — disks add-on | Slightly slower cold starts. |

Pick Railway unless you have a reason not to. 1 GB RAM is enough; 2 GB if you
plan to run abstractive summaries under heavy concurrency.

## Required environment variables

- `DATABASE_URL` — Postgres connection string in production. Example:
  `postgresql://user:pass@host:5432/meridian?schema=public&connection_limit=5`.
- `NODE_ENV=production` (set by the host).

That's it. No LLM API keys are required and none should be configured.

## Switching SQLite → Postgres

1. Provision a Postgres instance (Railway, Supabase, Neon — anywhere).
2. Edit `prisma/schema.prisma`: change `provider = "sqlite"` to `provider = "postgresql"`.
3. Set `DATABASE_URL` to the Postgres URL.
4. Run `npx prisma migrate deploy` against the new database.
5. Run `npm run db:seed` once to populate `Source` + `Topic` rows with embeddings.

The `Bytes` column ports across providers without conversion.

## Build & run

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed         # only the first time; idempotent thereafter
npm run build
npm start
```

Then call `GET /api/meridian-ai/warmup` once after the server is up. It pre-loads
both models (~30 seconds on first run, <1 second on restart with a persisted
disk) and reports the load time.

## Disk layout

```
.cache/transformers/     # model files — ~110 MB, must be persistent
prisma/dev.db            # SQLite only; gitignored
```

In production, mount the host's volume at `/app/.cache/transformers` (Railway)
or whatever your platform's convention is. Without persistence the models
re-download on every cold start.
