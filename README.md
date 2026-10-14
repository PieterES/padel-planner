# 🎾 Padel Planner

Finds Peakz Padel courts at times when at least 4 of us are free.

- Every friend sets a default week (which days, from–until) and can change specific weeks, e.g. holidays or a busy week.
- Every night at 00:30 (or when you press **Scrape & match now**) it checks Peakz court availability 4 weeks ahead for our clubs.
- Everyone sees the matches on `/matches`, each with a booking link. Someone books by hand.

## Run on the Raspberry Pi

```bash
cp .env.example .env        # set ADMIN_TOKEN and PUBLIC_URL
docker compose up -d --build
```

1. Point your Cloudflare Tunnel at `http://localhost:3000`, or run it in compose with `TUNNEL_TOKEN` and `docker compose --profile tunnel up -d`, pointing the hostname at `http://web:3000`.
2. Open `https://<your-host>/admin/login?token=<ADMIN_TOKEN>`.
3. **Friends**: click *Create invite link* and post it in the group chat. Everyone opens it, types their name, and is in, with no email or password. Close sign-ups when everyone has joined. You can still add someone by hand and send them their personal link.
4. **Group settings**: choose clubs, indoor/outdoor, duration and playing hours.

The database lives in `./data`. Back up that folder.

## Develop

```bash
npm install
npm run dev          # web on :3000
npm run worker:dev   # worker on :4000
npm test
npm run scrape:once  # dry run against live Peakz data
```
