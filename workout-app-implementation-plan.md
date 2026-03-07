# Workout App — Implementation Plan

## Phase 1: Foundation

Everything you need before writing any feature code.

### Step 1: Monorepo Setup

- Initialize Turborepo project
- Create `apps/api`, `apps/web`, `packages/shared` workspaces
- Configure TypeScript paths so imports between packages work
- Verify `turbo dev` runs both apps simultaneously
- **Done when:** `turbo dev` starts both an empty NestJS server and empty Nuxt app

### Step 2: Docker Compose

- Create `docker-compose.yml` with PostgreSQL and Redis containers
- Create Dockerfiles for API and Web (dev mode with hot reload + volume mounts)
- Configure environment variables (.env.example)
- **Done when:** `docker compose up` starts all 4 services and API can connect to Postgres + Redis

### Step 3: Prisma Schema & Database

- Translate the ERD into `schema.prisma`
- Define all models, relations, enums
- Run first migration
- Create seed script with a few test exercises and muscle groups
- **Done when:** `prisma migrate dev` succeeds and `prisma studio` shows seeded data

### Step 4: Shared Package

- Set up `packages/shared` with TypeScript
- Create Zod schemas for core entities (User, Exercise, Program, Session, Set)
- Export TypeScript types derived from Zod schemas
- Create shared constants (enums for equipment, muscle groups, set types, tracking types)
- Create utility functions (unit conversion kg↔lb, cm↔in, tempo string parsing)
- **Done when:** Both `apps/api` and `apps/web` can import from `@workout/shared`

### Step 5: NestJS Base Configuration

- Set up NestJS with Prisma module (global database service)
- Configure nestjs-pino for structured logging
- Configure @nestjs/swagger (Swagger UI at /api/docs)
- Set up global exception filter
- Set up Zod validation pipe (uses shared schemas)
- Configure CORS for the Nuxt frontend
- **Done when:** API serves Swagger UI at localhost:3001/api/docs with no endpoints yet

### Step 6: Sentry Integration

- Create Sentry project (single project, two DSNs for api + web)
- Install `@sentry/node` in API, configure global error capture
- Install `@sentry/vue` in Web, configure with source maps
- **Done when:** Throwing a test error in both API and Web shows up in Sentry dashboard

---

## Phase 2: Auth & Users

The app needs to know who you are before anything else.

### Step 7: Email/Password Auth

- Create auth module with register and login endpoints
- Password hashing with bcrypt
- JWT access token (15 min) + refresh token (7 days)
- Refresh token stored in DB for revocation
- POST /auth/register, /auth/login, /auth/refresh, /auth/logout
- JwtAuthGuard protecting all routes by default
- @Public() decorator for open routes
- **Done when:** Can register, login, receive tokens, and access a protected test endpoint

### Step 8: OAuth (Google + Apple)

- Configure Google OAuth strategy (Passport)
- Configure Apple OAuth strategy
- POST /auth/oauth/google, /auth/oauth/apple
- Find-or-create user by email, issue same JWT pair
- **Done when:** Can sign in with Google, get tokens, and hit the same protected endpoint

### Step 9: User Profile & Settings

- Users module: GET/PATCH /users/me
- AthleteProfile: GET/PATCH /users/me/profile
- UserSettings: GET/PATCH /users/me/settings
- **Done when:** Can update profile (name, bio, weight, height, unit preference) and settings (theme) via API

### Step 10: Nuxt Auth Frontend

- Set up Pinia auth store (tokens, current user)
- Login page, register page (email/password)
- Google/Apple OAuth buttons + redirect flow
- Auth middleware (redirect to login if not authenticated)
- Persistent session via refresh token in httpOnly cookie or localStorage
- **Done when:** Can register, login, see a "Welcome [name]" dashboard, and stay logged in on refresh

---

## Phase 3: Exercise Library

The building block everything else depends on.

### Step 11: Exercise API

- Exercises module: full CRUD
- GET /exercises (paginated, filterable by equipment, muscle group, search text)
- GET /exercises/:id
- POST /exercises (custom exercise, set created_by + is_global: false)
- PATCH/DELETE /exercises/:id (only own custom exercises)
- MuscleGroup seeded via Prisma seed
- **Done when:** API returns paginated exercises with filters working

### Step 12: Exercise Seed Data

- Create comprehensive seed script with 100+ common exercises
- Include all equipment types, muscle groups, tracking types
- Map primary and secondary muscle groups per exercise
- **Done when:** Exercise library is populated and browsable via Swagger

### Step 13: Exercise Library Frontend

- Exercise list page with sidebar library (like Hevy)
- Equipment filter dropdown
- Muscle group filter dropdown
- Search bar
- Exercise detail view with info + illustration placeholder
- Create Custom Exercise modal
- "Custom" badge on user-created exercises
- **Done when:** Can browse, search, filter exercises and create custom ones — matches Hevy screenshots

---

## Phase 4: Programs

Where athletes and trainers define what to do.

### Step 14: Program API

- Programs module: CRUD for programs and program exercises
- POST/GET/PATCH/DELETE /programs
- POST/PATCH/DELETE /programs/:id/exercises
- PATCH /programs/:id/exercises/reorder
- ProgramFolders: CRUD for folders
- OwnershipGuard: can only edit own programs
- **Done when:** Can create a program, add exercises with targets, reorder, organize in folders

### Step 15: Programs Frontend

- Programs list page with folders (collapsible, like Hevy)
- Create/edit program page
- Exercise picker from library (add to program)
- Set targets per exercise: sets, reps, RPE, tempo, rest, notes
- Drag-and-drop reorder
- Folder management (create, rename, delete)
- **Done when:** Full program CRUD matches Hevy routines experience

---

## Phase 5: Workout Sessions

The core of the app — actually logging workouts.

### Step 16: Session API

- Sessions module: start, update, complete/abandon
- POST /sessions/start (with program_id or freestyle)
- GET /sessions/active
- PATCH /sessions/:id
- Session exercises: add, reorder, substitute, remove
- Session sets: CRUD per exercise
- **Done when:** Can start a session, log sets with all fields (weight, reps, RPE, tempo, set type, rest), and complete it

### Step 17: Session Frontend — Active Workout

- Start workout screen (pick a program or go freestyle)
- Active session view: list of exercises, expandable set rows
- Log sets: input fields based on tracking type (weight+reps, duration, etc.)
- Set type selector (warm-up, working, drop, etc.)
- Add exercise mid-session
- Substitute exercise (with reason prompt)
- Complete / abandon session with overall RPE + notes
- **Done when:** Can run through a full workout session end-to-end in the UI

### Step 18: Rest Timer

- Countdown timer component
- Auto-start after completing a set (if enabled)
- **Default from exercise/program rest time, overridable**
- **Visual countdown + audio/vibration alert on completion**
- **Done when: Timer runs between sets, resets, and alerts correctly**

### **Step 19: Session History**

- **GET /sessions (paginated, filterable)**
- **GET /sessions/:id (full detail)**
- **Session history page: list of past sessions with summary stats**
- **Session detail page: every exercise and set**
- **Exercise history tab: past sessions filtered by exercise**
- **Done when: Can browse all past workouts and drill into detail**

---

## Phase 6: Records & Stats

### Step 20: BullMQ Setup

- Configure BullMQ with Redis connection
- Create queue module with processor registration
- **Done when:** Can enqueue and process a test job

### Step 21: Personal Records

- PR calculation job: runs after session completion
- Detects new PRs: 1RM (estimated), max weight, max reps, max volume
- Stores in PersonalRecord table with link to exact set
- GET /records, GET /records/exercise/:id
- PR badges on sets in session detail view
- Exercise detail page: PR display
- **Done when:** Completing a session with a new best automatically creates a PR record

### Step 22: Exercise Statistics

- GET /exercises/:id/statistics (weight over time, 1RM trend, volume trend)
- GET /exercises/:id/history (past sessions with this exercise)
- Statistics tab on exercise detail page: charts (weight over time, 1RM)
- Time range filter (12 weeks, 6 months, 1 year, all time)
- **Done when:** Exercise detail page shows charts and stats like Hevy

---

## Phase 7: Trainer Features

### Step 23: Trainer-Athlete Relationship

- Trainer module: invite athlete by email
- Accept/decline invite flow
- GET /trainer/athletes (list clients with status)
- PATCH /trainer/athletes/:id (activate/deactivate)
- TrainerAccessGuard: trainer can only access linked athletes' data
- **Done when:** Trainer can invite an athlete, athlete accepts, relationship is active

### Step 24: Program Assignment

- POST /assignments (trainer assigns program to athlete)
- Assignment includes: start date, allow_session_deviations flag
- Athlete sees assigned programs in their programs list (read-only)
- Athlete can start sessions from assigned programs
- **Done when:** Trainer assigns program, athlete sees it and can start a workout from it

### Step 25: Trainer Dashboard

- Athletes list page (trainer view)
- Per-athlete detail page:
  - Session history (read-only view of athlete's workouts)
  - Personal records
  - Body measurements and trends
  - Assigned programs and status
  - Session deviations log (substitutions, skips)
- **Done when:** Trainer can view all relevant data for each athlete

---

## Phase 8: Measurements & Profile Polish

### Step 26: Body Measurements

- Measurements API: CRUD
- Measurements page in profile
- Add new measurement entry (all body part fields + date + notes)
- Measurement history with trends over time
- **Done when:** Athlete can log and view body measurements over time

### Step 27: Profile Frontend Polish

- Profile page: edit name, bio, link, avatar upload
- Body stats display (weight, height, age)
- Settings page: theme toggle, rest timer config, account management
- **Done when:** Profile and settings match Hevy's settings pages

---

## Phase 9: Polish & Launch Prep

### Step 28: Data Validation & Error Handling

- Ensure all API endpoints validate with shared Zod schemas
- Friendly error messages on the frontend for all failure cases
- Loading states, empty states, error states on every page
- **Done when:** No unhandled errors, every edge case shows appropriate UI

### Step 29: Testing

- API: integration tests for auth, programs, sessions, trainer flows
- Frontend: component tests for critical flows (session logging, program creation)
- E2E: Playwright tests for the main happy paths
- **Done when:** Core flows have test coverage, CI runs green

### Step 30: Production Deployment Setup

- Production Docker Compose or cloud deployment config
- Environment variable management for production secrets
- Database migration strategy for production
- Sentry environment tags (dev vs production)
- Log drain configuration (Pino → log service)
- **Done when:** App is deployed and accessible on a real URL

---

## Summary


| Phase               | Steps | What you get                                                   |
| ------------------- | ----- | -------------------------------------------------------------- |
| 1. Foundation       | 1–6   | Monorepo, Docker, DB, shared types, logging, Sentry            |
| 2. Auth & Users     | 7–10  | Registration, login, OAuth, profile, frontend auth             |
| 3. Exercise Library | 11–13 | Browsable exercise database with filters and custom exercises  |
| 4. Programs         | 14–15 | Create and organize workout programs                           |
| 5. Workout Sessions | 16–19 | Log workouts, track sets, rest timer, session history          |
| 6. Records & Stats  | 20–22 | Personal records, exercise charts, background jobs             |
| 7. Trainer Features | 23–25 | Trainer-athlete linking, program assignment, trainer dashboard |
| 8. Measurements     | 26–27 | Body tracking, profile polish                                  |
| 9. Polish & Launch  | 28–30 | Validation, testing, deployment                                |


