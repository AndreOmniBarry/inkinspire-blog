# Inkinspire production image: runs anywhere Docker runs (Google Cloud Run, Fly, a VPS), so the owner
# is never locked into one host (ADR-002). Multi-stage, non-root, standalone Next.js output.
# Build:  docker build -t inkinspire .
# Run:    docker run -p 3000:3000 --env-file .env inkinspire
# The build prerenders public pages from the database, so DATABASE_URL must be reachable at build time
# (pass it with --build-arg or use `docker build --secret`); see docs/RUNBOOK.md.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
ARG DATABASE_URL
ARG SITE_URL
ARG BETTER_AUTH_SECRET=build-time-placeholder-secret-not-used-at-runtime
ENV DATABASE_URL=$DATABASE_URL SITE_URL=$SITE_URL BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 ink && useradd --system --uid 1001 --gid ink ink
COPY --from=build --chown=ink:ink /app/.next/standalone ./
COPY --from=build --chown=ink:ink /app/.next/static ./.next/static
COPY --from=build --chown=ink:ink /app/public ./public
COPY --from=build --chown=ink:ink /app/src/assets ./src/assets
COPY --from=build --chown=ink:ink /app/drizzle ./drizzle
USER ink
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
