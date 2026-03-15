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
pnpm --filter @workout/api run prisma:seed       # seeds muscle groups, exercises, and test user
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
| `prisma:seed`     | Seed data (see [Seeding](#seeding))  |
| `prisma:studio`   | Open Prisma Studio (DB browser) |


## Seeding

The seed command populates the database with reference data and (optionally) a test user with realistic workout history.

```bash
pnpm --filter @workout/api run prisma:seed
```

This runs three seeders in order:

| Seeder | What it creates |
| --- | --- |
| Muscle Groups | 22 muscle groups (Chest, Quads, Lats, etc.) |
| Global Exercises | 77 exercises with tracking types, equipment, and muscle group associations |
| Test Users | 4 users with workout history, personal records, trainer relationships, and programs (see below) |

### Test users

The seed creates four users you can log in with immediately:

| User | Email | Password | Role |
| --- | --- | --- | --- |
| Athlete One | `athlete1@workout.dev` | `Test1234!` | Athlete |
| Athlete Two | `athlete2@workout.dev` | `Test1234!` | Athlete |
| Trainer One | `trainer1@workout.dev` | `Test1234!` | Trainer |
| Trainer Two | `trainer2@workout.dev` | `Test1234!` | Non-trainer |

**Athlete One** comes with:
- **~94 completed workout sessions** spanning ~6 months (Push/Pull/Legs/Upper split)
- **Progressive overload** — weights increase over time for realistic chart trends
- **~74 personal records** computed from the best sets

**Athlete Two** comes with:
- **~69 completed workout sessions**
- **~56 personal records**

**Trainer One** manages both athletes (ACTIVE relationships) and has 3 programs with assignments.

The data is **deterministic** (same output every run) and **idempotent** (safe to re-run — deletes existing test user data first).

### Production safety

The seed script does **not** check `NODE_ENV`. If you point `DATABASE_URL` at a production database and run the seed, it **will** create the test user there. Only run the seed against development/staging databases.

## Starting with a clean slate

To completely reset your local database and start fresh:

```bash
# 1. Stop dev servers (Ctrl+C)

# 2. Reset the database (drops all tables, re-runs migrations)
pnpm --filter @workout/api exec prisma migrate reset

# 3. Re-seed (migrate reset does NOT auto-seed)
pnpm --filter @workout/api run prisma:seed
```

If you also want to reset Docker volumes (removes all persisted Postgres data):

```bash
pnpm services:reset              # stops containers and deletes volumes
pnpm services:up                 # starts fresh containers
pnpm --filter @workout/api run prisma:migrate   # re-create tables
pnpm --filter @workout/api run prisma:seed      # seed data
```

### Quick reference

| Goal | Command |
| --- | --- |
| Re-seed without resetting | `pnpm --filter @workout/api run prisma:seed` |
| Reset DB + re-seed | `pnpm --filter @workout/api exec prisma migrate reset && pnpm --filter @workout/api run prisma:seed` |
| Nuke everything (Docker volumes too) | `pnpm services:reset && pnpm services:up && pnpm --filter @workout/api run prisma:migrate && pnpm --filter @workout/api run prisma:seed` |
| Open DB browser | `pnpm --filter @workout/api run prisma:studio` |

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