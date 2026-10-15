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

Admin access: log in on the home page as name `admin` (a special account, not a `users` row, so it never shows up as a friend; the name is reserved) with the password set under /admin → Admin account (hash in `settings.admin_password_hash`; before that `ADMIN_PASSWORD` from env, else "admin"). The admin session is the `pp_admin` cookie holding `ADMIN_TOKEN`; `/admin/login?token=$ADMIN_TOKEN` still works too.

Permissions: every logged-in friend (and the admin) can use `/settings` (group settings + "Scrape & match now", actions in `src/app/settings/actions.ts` guarded by `requireViewer`). Only the admin gets `/admin`: invite link, add/remove friends, login links, other people's availability/passwords (`/admin/friends/[id]`), and the admin password (`requireAdmin`). Friends edit only their own availability (`requireCanEdit`). Friends join through the group invite link `/join/<settings.inviteToken>` with a name + password, and log in on any device with name (case-insensitive, unique) + password on the home page (`src/app/login`). Passwords are scrypt hashes (`src/lib/password.ts`, with an in-memory 5-failure lockout). The login cookie's value is the user's `magicToken`, which also still works as a `/u/<token>` recovery link from `/admin`. Friends without a password are nagged on `/me`; the admin can set anyone's password on `/admin/friends/[id]`.

## Architecture

There are two processes sharing one SQLite file (`DATABASE_PATH`, default `data/app.db`, WAL mode):

- **web**: Next.js 16 App Router in `src/app`. Reads the DB directly in server components and writes through server actions (`*/actions.ts`). It never scrapes; to start a run it calls the worker over HTTP (`src/lib/worker-client.ts` → `WORKER_URL`).
- **worker**: `worker/index.ts`, plain Node run with tsx. It runs node-cron daily at 00:30 Europe/Amsterdam and exposes an internal API (`/run`, `/status`), so only one scrape runs at a time. The worker port must never be published.

The scrape → match flow lives in `worker/pipeline.ts`: fetch Peakz → replace the `slots` table → snapshot the ranked matches into `run_matches` (last 30 runs kept). There are two views: `/runs` shows a run's snapshot (top 5 + show more), and `/matches` recomputes live with `currentMatches()` (`src/lib/data.ts`), so availability edits show up there immediately. Both render `src/app/match-card.tsx`.

Coordination: on `/matches` friends tap "I'm in" (`commitments`, keyed by `matchKey(location, start, duration)`); at `minPlayers` the match is "ready", and someone who's in taps "I booked it" → a `bookings` row (match details copied, since the slot vanishes from the next scrape) shown under Upcoming games, with an `.ics` at `/bookings/[id]/ics`. Actions in `src/app/matches/actions.ts`; reads in `src/lib/coordination.ts`.

Push notifications (`src/lib/push.ts`, `web-push`): VAPID keys are generated into the settings row on first use; devices opt in on `/me` (service worker `public/sw.js`, `push_subscriptions` table, dead endpoints are pruned on 404/410). Sent: new matches per friend after each run (diff against the previous run's `run_matches`, skipped on the very first run; see `newMatchMessages` in `src/lib/notify.ts`), "ready" when a match reaches `minPlayers`, and "booked". Playwright's Chromium can't create real push subscriptions (no Google push keys), so test sending with the mocked `push.test.ts`.

The app is an installable PWA (`src/app/manifest.ts`); icons come from `npm run icons` (`scripts/make-icons.ts`).

The core logic is pure and unit-tested in `src/lib`:
- `availability.ts`: a friend's default week (`availability_rules`) or, for a specific week, its `week_overrides` row (7 ranges, which replace the whole default week) → free intervals. Slots crossing midnight check the next day.
- `matching.ts`: constraints, grouping by (location, start, duration), and ranking.
- `week-ranges.ts`: one from–until range per weekday, used for both a friend's weekly availability (`/me`, form prefix `av`) and the group's playing hours (`/admin`, prefix `win`). The form fields come from `src/app/week-ranges-fields.tsx`.
- `time.ts`: all wall-clock logic is **Europe/Amsterdam**. Instants are stored as UTC `Date`s; convert with `toLocal`/`fromLocal`, never with the server's local time.

## Peakz / Foys API

Peakz runs on Foys. Court availability is a **public, unauthenticated JSON API** (`src/lib/peakz/client.ts`):
`GET https://api.foys.io/court-booking/public/api/v1/locations/search?reservationTypeId=6&locationId=<uuid>&playingTimes[]=60&playingTimes[]=90&playingTimes[]=120&date=<YYYY-MM-DD>T00:00:00.000Z`

- `timeSlots[].startTime` is **Amsterdam local time with no offset**. Parse it with `parseLocalTimestamp`.
- The court `type` string ("Double court indoor", "Single court outdoor", "Beach volleybal …") gives indoor/single. Non-padel courts are dropped in `parse.ts`.
- Booking is a rolling 28-day window. A run makes (enabled clubs × 29 days) requests, throttled to about 1 per second; keep it polite.
- The full club list with uuids is at `/court-booking/public/api/v1/locations`. Clubs are seeded in `src/lib/db/index.ts`; to add one, insert a `locations` row (uuid + deep-link slug).
- When drizzle-kit wants to ask interactively (e.g. "is this table a rename?"), split the change into two `db:generate` runs: drop first, then add.
- Parser tests run against a captured response in `src/lib/peakz/__fixtures__/`. If Peakz changes the API, re-capture with `SPIKE_URLS=<court-booking url> HEADLESS=1 npm run spike` (output goes to `scratch/`).

## Gotchas

- `db` (`src/lib/db/index.ts`) is a lazy proxy, so `next build` never opens the DB. Migrations and seeding run on first use after each module load (so `next dev` applies new migrations on hot reload), with one retry for the web/worker startup race.
- `cacheComponents` is intentionally off. Pages are dynamic because they read the auth cookie, and synchronous better-sqlite3 reads would otherwise be prerendered.
- The package is ESM (`"type": "module"`); run scripts as files with tsx, not `tsx -e` (that loads them as CJS).
