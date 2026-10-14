# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A padel planner for a group of 7 friends. It scrapes court availability at Peakz Padel, matches free courts against everyone's availability (≥ `minPlayers` free for the whole slot), and lists them on `/matches`. It never books; matches link to the Peakz booking page. WhatsApp posting (Baileys) was tried and removed because linking failed; don't reintroduce it without asking. It's self-hosted on a Raspberry Pi (arm64) behind a Cloudflare Tunnel.

## Commands

```bash
npm run dev            # Next.js web app (http://localhost:3000)
npm run worker:dev     # worker with reload (cron + HTTP API on :4000)
npm test               # vitest (all)
npx vitest run src/lib/matching.test.ts      # single file
npx vitest run -t "DST"                      # tests matching a name
npm run lint && npx tsc --noEmit             # `npx next typegen` first if PageProps/LayoutProps are missing
npm run scrape:once    # live scrape + match, prints the top matches
npm run db:generate    # after editing src/lib/db/schema.ts → new SQL in drizzle/
npm run spike          # Playwright recorder for reverse-engineering peakzpadel.nl (dev only)
docker compose up -d --build   # production (web + worker), data in ./data
```

Admin access: open `/admin/login?token=$ADMIN_TOKEN` once. Friends sign themselves up through the group invite link `/join/<settings.inviteToken>` (name only, no email; the admin can rotate or close it). Each friend then has a personal `/u/<magic token>` link that sets the login cookie, shown on `/me` and `/admin`.

## Architecture

There are two processes sharing one SQLite file (`DATABASE_PATH`, default `data/app.db`, WAL mode):

- **web**: Next.js 16 App Router in `src/app`. Reads the DB directly in server components and writes through server actions (`*/actions.ts`). It never scrapes; to start a run it calls the worker over HTTP (`src/lib/worker-client.ts` → `WORKER_URL`).
- **worker**: `worker/index.ts`, plain Node run with tsx. It runs node-cron daily at 00:30 Europe/Amsterdam and exposes an internal API (`/run`, `/status`), so only one scrape runs at a time. The worker port must never be published.

The scrape → match flow lives in `worker/pipeline.ts`: fetch Peakz → replace the `slots` table → record counts in `scrape_runs`. Matches aren't stored; `/matches` computes them on each request with `currentMatches()` (`src/lib/data.ts`), so availability edits show up immediately.

The core logic is pure and unit-tested in `src/lib`:
- `availability.ts`: weekly rules + dated exceptions → free intervals ("unavailable" exceptions win; slots crossing midnight check the next day).
- `matching.ts`: constraints, grouping by (location, start, duration), and ranking.
- `grid.ts`: converts the `/me` 30-minute grid cells to and from availability rules.
- `time.ts`: all wall-clock logic is **Europe/Amsterdam**. Instants are stored as UTC `Date`s; convert with `toLocal`/`fromLocal`, never with the server's local time.

## Peakz / Foys API

Peakz runs on Foys. Court availability is a **public, unauthenticated JSON API** (`src/lib/peakz/client.ts`):
`GET https://api.foys.io/court-booking/public/api/v1/locations/search?reservationTypeId=6&locationId=<uuid>&playingTimes[]=60&playingTimes[]=90&playingTimes[]=120&date=<YYYY-MM-DD>T00:00:00.000Z`

- `timeSlots[].startTime` is **Amsterdam local time with no offset**. Parse it with `parseLocalTimestamp`.
- The court `type` string ("Double court indoor", "Single court outdoor", "Beach volleybal …") gives indoor/single. Non-padel courts are dropped in `parse.ts`.
- Booking is a rolling 28-day window. A run makes (enabled clubs × 29 days) requests, throttled to about 1 per second; keep it polite.
- The full club list with uuids is at `/court-booking/public/api/v1/locations`. Clubs are seeded in `src/lib/db/index.ts`; to add one, insert a `locations` row (uuid + deep-link slug).
- Parser tests run against a captured response in `src/lib/peakz/__fixtures__/`. If Peakz changes the API, re-capture with `SPIKE_URLS=<court-booking url> HEADLESS=1 npm run spike` (output goes to `scratch/`).

## Gotchas

- `db` (`src/lib/db/index.ts`) is a lazy proxy, so `next build` never opens the DB. Migrations and seeding run on first use in each process, with one retry for the web/worker startup race.
- `cacheComponents` is intentionally off. Pages are dynamic because they read the auth cookie, and synchronous better-sqlite3 reads would otherwise be prerendered.
- The package is ESM (`"type": "module"`); run scripts as files with tsx, not `tsx -e` (that loads them as CJS).
