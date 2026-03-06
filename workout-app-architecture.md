# Workout App — Technical Architecture

## Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Nuxt 3 (SPA mode) | Client application |
| UI Framework | NuxtUI | Component library |
| State Management | Pinia | Client-side state |
| Backend | NestJS | API server |
| ORM | Prisma | Database access + migrations |
| Database | PostgreSQL 16 | Primary data store |
| Cache / Queue Broker | Redis | Caching + BullMQ broker |
| Background Jobs | BullMQ | Async tasks (PR calc, notifications) |
| Auth | Passport + JWT | Email/password + OAuth (Google, Apple) |
| Error Tracking | Sentry | Crash reporting, stack traces, user context |
| Logging | Pino (nestjs-pino) | Structured JSON logs to stdout |
| API Docs | @nestjs/swagger | Auto-generated OpenAPI/Swagger |
| Monorepo | Turborepo | Shared types, unified tooling |
| Dev Environment | Docker Compose | PostgreSQL, Redis, API, Frontend |

---

## Monorepo Structure

```
workout-app/
├── turbo.json
├── package.json
├── docker-compose.yml
├── .env.example
│
├── packages/
│   └── shared/                    # Shared between frontend + backend
│       ├── types/                 # TypeScript interfaces (User, Program, Session, etc.)
│       ├── validation/            # Zod schemas (reused in forms + API validation)
│       ├── constants/             # Enums, config values
│       └── utils/                 # Unit conversions, tempo parsing, RPE calculations
│
├── apps/
│   ├── api/                       # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # Login, register, OAuth, JWT, guards
│   │   │   │   ├── users/         # User CRUD, profile, settings
│   │   │   │   ├── exercises/     # Exercise library, custom exercises, muscle groups
│   │   │   │   ├── programs/      # Programs, folders, program exercises, assignments
│   │   │   │   ├── sessions/      # Workout sessions, session exercises, sets
│   │   │   │   ├── records/       # Personal records, PR detection
│   │   │   │   ├── measurements/  # Body measurements tracking
│   │   │   │   └── trainer/       # Trainer-athlete relationships, athlete history view
│   │   │   ├── common/
│   │   │   │   ├── guards/        # RolesGuard, OwnershipGuard, TrainerAccessGuard
│   │   │   │   ├── decorators/    # @CurrentUser, @Roles
│   │   │   │   ├── filters/       # Exception filters
│   │   │   │   ├── interceptors/  # Logging, transform
│   │   │   │   └── pipes/         # Zod validation pipe
│   │   │   ├── prisma/            # Prisma module + service
│   │   │   ├── queue/             # BullMQ processors (PR calculation, notifications)
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts            # Exercise library seed data
│   │   └── test/
│   │
│   └── web/                       # Nuxt 3 frontend (SPA)
│       ├── app.config.ts
│       ├── nuxt.config.ts
│       ├── pages/
│       │   ├── index.vue
│       │   ├── login.vue
│       │   ├── register.vue
│       │   ├── programs/
│       │   │   ├── index.vue      # Program list with folders
│       │   │   └── [id].vue       # Edit program
│       │   ├── exercises/
│       │   │   └── index.vue      # Exercise library + detail
│       │   ├── session/
│       │   │   ├── [id].vue       # Active workout session
│       │   │   └── history.vue    # Session history
│       │   ├── profile/
│       │   │   └── index.vue      # Profile + measurements
│       │   ├── settings/
│       │   │   └── index.vue      # App settings
│       │   └── trainer/
│       │       ├── athletes.vue   # Trainer's client list
│       │       └── [id].vue       # Athlete detail + history
│       ├── components/
│       ├── composables/
│       │   ├── useAuth.ts
│       │   ├── useApi.ts          # Typed API client (ofetch)
│       │   ├── useSession.ts      # Active workout session state
│       │   └── useRestTimer.ts    # Countdown timer
│       ├── stores/                # Pinia stores
│       │   ├── auth.ts
│       │   ├── programs.ts
│       │   ├── exercises.ts
│       │   └── session.ts
│       └── layouts/
│           ├── default.vue        # Main layout with sidebar nav
│           └── auth.vue           # Login/register layout
│
├── docker/
│   ├── api.Dockerfile
│   └── web.Dockerfile
│
└── scripts/
    └── seed-exercises.ts          # Populate exercise library
```

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: workout_app
      POSTGRES_USER: workout
      POSTGRES_PASSWORD: workout_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    ports: ["3001:3001"]
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://workout:workout_dev@postgres:5432/workout_app
      REDIS_URL: redis://redis:6379
      JWT_SECRET: dev-secret-change-me
    volumes:
      - ./apps/api:/app/apps/api
      - ./packages:/app/packages

  web:
    build:
      context: .
      dockerfile: docker/web.Dockerfile
    ports: ["3000:3000"]
    depends_on: [api]
    environment:
      API_URL: http://api:3001
    volumes:
      - ./apps/web:/app/apps/web
      - ./packages:/app/packages

volumes:
  pgdata:
```

---

## Authentication Flow

### Email/Password
1. Register → POST /auth/register → hash password (bcrypt) → create User → return JWT
2. Login → POST /auth/login → verify password → return JWT access + refresh tokens
3. All API calls → Bearer token in Authorization header
4. Token refresh → POST /auth/refresh → validate refresh token → return new pair

### OAuth (Google / Apple)
1. Frontend redirects to provider
2. Provider callback hits POST /auth/oauth/callback
3. Backend validates token with provider
4. Find or create User by email
5. Return JWT pair (same as email/password from this point)

### Guards (Authorization)
- **JwtAuthGuard** — is the user authenticated?
- **RolesGuard** — is the user an athlete/trainer?
- **OwnershipGuard** — does this resource belong to the user?
- **TrainerAccessGuard** — is this trainer linked to this athlete?

---

## API Module Breakdown

### Auth `/auth`
- POST /register
- POST /login
- POST /refresh
- POST /oauth/google
- POST /oauth/apple
- POST /logout

### Users `/users`
- GET /me
- PATCH /me
- GET /me/profile (athlete profile)
- PATCH /me/profile
- GET /me/settings
- PATCH /me/settings

### Exercises `/exercises`
- GET / (paginated, filterable by equipment, muscle, search)
- GET /:id
- POST / (custom exercise)
- PATCH /:id
- DELETE /:id
- GET /:id/history (session history for this exercise)
- GET /:id/statistics (weight over time, 1RM, volume)

### Programs `/programs`
- GET / (user's programs + folders)
- POST /
- GET /:id
- PATCH /:id
- DELETE /:id
- POST /:id/exercises (add exercise to program)
- PATCH /:id/exercises/reorder
- DELETE /:id/exercises/:exerciseId

### Program Folders `/program-folders`
- GET /
- POST /
- PATCH /:id
- DELETE /:id

### Program Assignments `/assignments` (trainer only)
- POST / (assign program to athlete)
- PATCH /:id
- DELETE /:id
- GET /athlete/:athleteId (list assignments for athlete)

### Sessions `/sessions`
- POST /start (from program or freestyle)
- GET /active (current in-progress session)
- PATCH /:id (update notes, RPE, complete/abandon)
- GET / (session history, paginated)
- GET /:id (full session detail with exercises + sets)

### Session Exercises `/sessions/:sessionId/exercises`
- POST / (add exercise mid-session)
- PATCH /:id (reorder, substitute)
- DELETE /:id

### Session Sets `/sessions/:sessionId/exercises/:exerciseId/sets`
- POST / (log a set)
- PATCH /:id
- DELETE /:id

### Measurements `/measurements`
- GET / (history)
- POST /
- PATCH /:id
- DELETE /:id

### Personal Records `/records`
- GET / (all PRs, filterable by exercise)
- GET /exercise/:exerciseId

### Trainer `/trainer`
- GET /athletes (list clients)
- POST /invite (invite athlete)
- PATCH /athletes/:id (update relationship status)
- GET /athletes/:id/sessions (view athlete's workout history)
- GET /athletes/:id/records (view athlete's PRs)
- GET /athletes/:id/measurements (view athlete's body stats)

---

## Background Jobs (BullMQ)

| Job | Trigger | Purpose |
|-----|---------|---------|
| `calculate-prs` | Session completed | Scan sets → detect new PRs → create PersonalRecord rows |
| `session-stats` | Session completed | Calculate total volume, duration, muscle split |
| `trainer-notify` | Session completed | Notify trainer that athlete completed a workout |
| `assignment-notify` | Program assigned | Notify athlete of new program from trainer |

---

## Logging & Error Tracking

### Sentry (Error Tracking)

Both frontend and backend report to the same Sentry project with environment tags.

**Backend (`@sentry/node`):**
- Global exception filter catches all unhandled errors → sends to Sentry
- Attach user context (userId, role) to every event
- Tag with request metadata (endpoint, method, status code)
- Capture BullMQ job failures as separate transactions

**Frontend (`@sentry/vue`):**
- Auto-captures Vue component errors and unhandled promise rejections
- Attach user context on login (userId, role, unit preference)
- Breadcrumbs track navigation, API calls, and user clicks for debugging
- Source maps uploaded at build time for readable stack traces

### Pino (Structured Logging)

**Backend (`nestjs-pino`):**
- JSON-formatted logs to stdout (Docker captures them)
- Auto-logs every HTTP request with method, path, status, duration
- Correlation IDs on every request for tracing
- Log levels: `error` for failures, `warn` for degraded paths, `info` for key business events
- Key business events to log: user registration, session started/completed, program assigned, PR achieved, OAuth login

**What to log vs. what not to:**
- Log: auth events, session lifecycle, trainer-athlete link changes, failed validations, queue job outcomes
- Don't log: successful GETs on exercise library, set-level CRUD (too noisy), request/response bodies with sensitive data

**MVP log strategy:** stdout only. No log aggregation service. Use `docker compose logs -f api` during development. Add a log drain (Logtail, Papertrail, or similar) when you deploy to production — it's a one-line config change since Pino already outputs structured JSON.

---

## Key Design Decisions

1. **Prisma schema is the source of truth** — the ERD maps directly to schema.prisma, migrations handle all DB changes.

2. **Shared Zod schemas** — validation runs identically on frontend forms and backend API pipes. Define once in `packages/shared/validation/`.

3. **JWT with refresh tokens** — access token (15min) + refresh token (7 days). Refresh tokens stored in DB for revocation.

4. **Unit conversion at the edge** — database stores everything in metric (kg, cm). Conversion to imperial happens in the API response layer based on user's `unit_preference`.

5. **Exercise library seeded** — global exercises are seed data, not user-created. Custom exercises have `is_global: false` and `created_by` set to the user.

6. **PR detection is async** — calculated via BullMQ job after session completion so the user isn't blocked. PRs appear on next page load.

7. **Trainer access is relationship-scoped** — a trainer can only access data for athletes in their `TrainerAthlete` table with `status: active`. The `TrainerAccessGuard` enforces this on every request.
