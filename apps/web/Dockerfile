# syntax=docker/dockerfile:1

# ───────── Base: pnpm on Node 22 Alpine ─────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ───────── Deps: install monorepo dependencies ─────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ───────── Build: compile shared + nuxt ─────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @workout/shared build \
 && pnpm --filter @workout/web exec nuxt prepare \
 && pnpm --filter @workout/web build

# ───────── Runtime: just Node + Nitro output ─────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
# Nitro reads runtime public config from NUXT_PUBLIC_* env vars at startup
ENV HOST=0.0.0.0

COPY --from=build /app/apps/web/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
