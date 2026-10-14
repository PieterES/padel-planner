# 🎾 Padel Planner

Finds Peakz Padel courts at times when at least 4 of us are free, and posts them to our WhatsApp group.

- Every friend sets a weekly availability pattern plus exceptions on their personal link.
- Every night at 00:30 (or when you press **Scrape & match now**) it checks Peakz court availability 4 weeks ahead for our clubs.
- New matches go to the WhatsApp group with a booking link. Someone books by hand.

## Run on the Raspberry Pi

```bash
cp .env.example .env        # set ADMIN_TOKEN and PUBLIC_URL
docker compose up -d --build
```

1. Point your Cloudflare Tunnel at `http://localhost:3000`, or run it in compose with `TUNNEL_TOKEN` and `docker compose --profile tunnel up -d`, pointing the hostname at `http://web:3000`.
2. Open `https://<your-host>/admin/login?token=<ADMIN_TOKEN>`.
3. **WhatsApp**: scan the QR code under *Linked devices* on your phone, then pick the group and send a test message.
4. **Friends**: click *Create invite link* and post it in the group chat. Everyone opens it, types their name, and is in, with no email or password. Close sign-ups when everyone has joined. You can still add someone by hand and send them their personal link.
5. **Group settings**: choose clubs, indoor/outdoor, duration and playing hours.

Data (database and WhatsApp login) lives in `./data`. Back up that folder.

## Develop

```bash
npm install
npm run dev          # web on :3000
npm run worker:dev   # worker on :4000
npm test
npm run scrape:once  # dry run against live Peakz data
```

WhatsApp uses [Baileys](https://github.com/WhiskeySockets/Baileys), an unofficial client. WhatsApp could ban the linked number; volume is kept to at most one message per day.
