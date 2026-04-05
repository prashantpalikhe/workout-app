# syntax=docker/dockerfile:1

# ───────── Base: pnpm on Node 22 Alpine ─────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ───────── Deps: install monorepo dependencies ─────────
FROM base AS deps
# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
# Copy prisma schema + config so postinstall (prisma generate) can run
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/
RUN pnpm install --frozen-lockfile --ignore-scripts

# ───────── Build: compile shared + api ─────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# DATABASE_URL is required by prisma.config.ts at parse time; a placeholder
# is fine for `prisma generate` — the real URL is injected at runtime.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN pnpm --filter @workout/shared build \
 && pnpm --filter @workout/api exec prisma generate \
 && pnpm --filter @workout/api build

# ───────── Runtime: minimal prod image ─────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
ENV NODE_ENV=production

# Workspace manifests (needed for pnpm --filter commands at runtime)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# node_modules from build (already includes generated prisma client)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules

# Compiled code
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Prisma schema + migrations + config (needed for `prisma migrate deploy`)
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/

EXPOSE 3001

# Run migrations, then start the server
CMD ["sh", "-c", "pnpm --filter @workout/api exec prisma migrate deploy && node apps/api/dist/src/main"]
