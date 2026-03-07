# Workout App

A workout tracking platform for athletes and trainers. Athletes build programs, log sessions, and track progress. Trainers manage clients, prescribe programs, and monitor performance. The app works standalone for solo athletes — the trainer layer is additive, not required.

## Tech Stack


| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Monorepo | Turborepo + pnpm workspaces                            |
| Frontend | Nuxt 4 (SPA mode) + NuxtUI v4 + Pinia + Tailwind CSS 4 |
| Backend  | NestJS 11 + Prisma 7 + PostgreSQL 17                   |
| Queue    | Redis 8 + BullMQ                                       |
| Auth     | Passport + JWT (email/password + Google/Apple OAuth)   |
| Language | TypeScript 5.9, Node.js 22 LTS                         |


## Project Structure

```
workout-app/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Nuxt frontend (port 3000)
├── packages/
│   └── shared/       # Shared types (Zod schemas), constants, utils
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Prerequisites

- **Node.js 22 LTS** — install via [nvm](https://github.com/nvm-sh/nvm), then `nvm use` (reads `.nvmrc`)
- **pnpm** — enabled automatically via Corepack (`corepack enable`)
- **Docker** — for PostgreSQL and Redis

## Development Setup

### 1. Clone and install

```bash
git clone <repo-url> workout-app
cd workout-app
nvm use               # switches to Node 22
corepack enable       # enables pnpm via Corepack
pnpm install          # installs all dependencies + generates Prisma client
```

### 2. Set up environment variables

```bash
cp .env.example apps/api/.env
```

The defaults work for local development with the Docker services below.

### 3. Start infrastructure services

```bash
pnpm services:up      # starts PostgreSQL 17 + Redis 8 via Docker Compose
```

### 4. Create database tables and seed data

```bash
pnpm --filter @workout/api run prisma:migrate   # runs all migrations
pnpm --filter @workout/api run prisma:seed       # seeds muscle groups + starter exercises
```

### 5. Start development servers

```bash
pnpm dev              # starts both API (3001) and Web (3000) via Turborepo
```

- **API**: [http://localhost:3001](http://localhost:3001)
- **Web**: [http://localhost:3000](http://localhost:3000)
- **Health check**: [http://localhost:3001/health](http://localhost:3001/health)

## Available Scripts

### Root (monorepo)


| Script                | Description                        |
| --------------------- | ---------------------------------- |
| `pnpm dev`            | Start all dev servers              |
| `pnpm build`          | Build all packages                 |
| `pnpm lint`           | Lint all packages                  |
| `pnpm services:up`    | Start Postgres + Redis containers  |
| `pnpm services:down`  | Stop containers (preserves data)   |
| `pnpm services:reset` | Stop containers and delete volumes |


### API (`pnpm --filter @workout/api run <script>`)


| Script            | Description                     |
| ----------------- | ------------------------------- |
| `dev`             | Start with hot reload           |
| `build`           | Compile TypeScript              |
| `prisma:generate` | Regenerate Prisma client        |
| `prisma:migrate`  | Run pending migrations          |
| `prisma:seed`     | Seed muscle groups + exercises  |
| `prisma:studio`   | Open Prisma Studio (DB browser) |


## Database

The database schema has **16 models** and **14 enums** covering:

- **Users & Profiles** — User, AthleteProfile, UserSettings, Measurement
- **Trainer-Athlete** — TrainerAthlete relationship with status tracking
- **Exercise Library** — Exercise, MuscleGroup, ExerciseMuscleGroup
- **Programs** — ProgramFolder, Program, ProgramExercise, ProgramAssignment
- **Workout Sessions** — WorkoutSession, SessionExercise, SessionSet
- **Personal Records** — PersonalRecord with type-based tracking

All data is stored in **metric units** internally and converted at display time based on user preference.

### Migrations

```bash
# Create a new migration after schema changes
pnpm --filter @workout/api run prisma:migrate

# Check migration status
pnpm --filter @workout/api exec prisma migrate status
```

## Deployment

### Build for production

```bash
pnpm build
```

This runs `prisma generate` first (via Turborepo task dependency), then builds all packages.

### API production start

```bash
cd apps/api
node dist/src/main.js
```

Requires the following environment variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — for authentication
- `PORT` — server port (defaults to 3001)

### Web production start

```bash
cd apps/web
node .output/server/index.mjs
```

### Docker (production)

Production Docker setup is planned for Phase 9. The current `docker-compose.yml` is for **local development infrastructure only** (Postgres + Redis).