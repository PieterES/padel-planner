# One image for both services (see docker-compose.yml): `web` runs Next.js,
# `worker` runs worker/index.ts. Builds natively on the Raspberry Pi (arm64).
FROM node:22-slim AS build
WORKDIR /app
# Toolchain in case better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
COPY . .
# Pages open the DB at import time; keep the build's DB out of the image.
RUN DATABASE_PATH=/tmp/build.db npx next build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    TZ=Europe/Amsterdam \
    DATABASE_PATH=/app/data/app.db \
    BAILEYS_AUTH_DIR=/app/data/baileys-auth
COPY --from=build /app/package.json /app/next.config.ts /app/tsconfig.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src ./src
COPY --from=build /app/worker ./worker
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
