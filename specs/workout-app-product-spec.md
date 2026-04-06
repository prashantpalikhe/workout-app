# Workout App — Product Description & Feature Set

## Vision

A workout tracking platform for athletes and trainers. Athletes get a complete tool to build programs, log sessions, and track progress over time. Trainers get the ability to manage clients, prescribe programs, and monitor athlete performance — all within the same app.

The app works fully standalone for solo athletes. The trainer layer is additive, not required.

---

## User Roles

### Athlete
An individual who uses the app to plan and track their own training. An athlete can operate completely independently or optionally connect with a trainer.

### Trainer
A coach who manages one or more athletes as clients. A trainer can create and assign programs, view workout history, track athlete progress, and monitor body measurements. A trainer does not log workouts themselves (though a user could hold both roles).

---

## Feature Set

### 1. Authentication & Onboarding

**1.1 Registration**
- Sign up with email and password
- Sign up with Google OAuth
- Sign up with Apple OAuth
- Choose role during onboarding: athlete, trainer, or both

**1.2 Login**
- Email/password login
- Google OAuth login
- Apple OAuth login
- JWT-based session with access token (15 min) and refresh token (7 days)
- Persistent login via refresh token rotation

**1.3 Password Management**
- Forgot password flow with email reset link
- Change password from settings

---

### 2. Athlete Profile

**2.1 Basic Profile**
- First name, last name
- Profile picture (upload/change)
- Bio (free text)
- Personal link / website URL

**2.2 Body Stats**
- Weight
- Height
- Date of birth (age derived)
- Gender

**2.3 Body Measurements**
- Track measurements over time as dated entries
- Supported measurements: body weight, chest, waist, hips, left/right arm, left/right thigh, left/right calf, neck, shoulders, body fat percentage
- Notes per measurement entry
- View measurement history with trends over time

**2.4 Unit Preference**
- Choose between metric (kg, cm) and imperial (lb, in)
- Preference applies globally across all screens
- Data stored in metric internally, converted at display time

---

### 3. User Settings

**3.1 App Preferences**
- Theme: light, dark, or system default
- Rest timer: enable/disable
- Default rest duration (seconds)

**3.2 Account**
- Change email
- Change password
- Delete account

**3.3 Data Export**
- Export all workout history as CSV/JSON (future consideration)

---

### 4. Exercise Library

**4.1 Global Exercise Database**
- Pre-populated library of common exercises
- Each exercise includes: name, equipment type, tracking type, primary muscle group, secondary muscle groups, illustration/image, instructions, optional video URL
- Browse full library with scrollable list

**4.2 Filtering & Search**
- Filter by equipment type: barbell, dumbbell, cable, machine, bodyweight, band, kettlebell, other
- Filter by muscle group: all major muscle groups
- Search by exercise name (text search)
- Filters and search work together

**4.3 Exercise Detail View**
- Exercise name, equipment, primary muscle group
- Exercise illustration
- Three tabs: Statistics, History, How-to
- Statistics: weight over time chart, one rep max, volume trends (filterable by time range: last 12 weeks, 6 months, 1 year, all time)
- History: list of past sessions where this exercise was performed, with sets/reps/weight detail
- How-to: instructions and optional video

**4.4 Custom Exercises**
- Create custom exercises with: name, exercise/tracking type, equipment, primary muscle group, secondary muscles, optional image
- Custom exercises marked with a "Custom" badge in the library
- Custom exercises are private to the user who created them (or shared within a trainer-athlete relationship)

**4.5 Tracking Types**
- Weight & Reps (e.g., bench press — log weight + reps per set)
- Reps Only (e.g., pull-ups — log reps only)
- Duration (e.g., plank — log time in seconds)
- Weight & Duration (e.g., farmer's walk — log weight + time)
- Distance & Duration (e.g., running — log distance + time)
- Tracking type determines which fields appear when logging sets

---

### 5. Programs

**5.1 Program Management**
- Create a program with a name and optional description
- A program contains an ordered list of exercises
- Each exercise in a program has targets: number of sets, rep range (e.g., "8-12"), target RPE, target tempo, rest time between sets, notes
- Reorder exercises within a program via drag-and-drop
- Add or remove exercises from a program
- Edit or delete programs

**5.2 Program Folders**
- Organize programs into named folders (e.g., "Fullbody", "Push/Pull/Legs")
- Programs can exist outside of any folder
- Create, rename, reorder, and delete folders
- Deleting a folder does not delete the programs inside it — they become unfiled

**5.3 Program List View**
- Shows all folders (collapsed/expanded) with program count
- Shows unfiled programs separately
- Each program card shows: name and a preview list of exercise names

---

### 6. Workout Sessions

**6.1 Starting a Session**
- Start from a program: creates a session pre-populated with the program's exercises and targets
- Start freestyle: creates an empty session where the athlete picks exercises on the fly
- Only one active session at a time

**6.2 Session Exercise Tracking**
- For each exercise in the session, log individual sets
- Each set captures (based on exercise tracking type):
  - Weight (nullable)
  - Reps (nullable)
  - Duration in seconds (nullable)
  - Distance (nullable)
  - RPE (rate of perceived exertion, 1-10 scale)
  - Tempo (4-part notation: eccentric-isometric-concentric-pause, e.g., "3-1-2-0")
  - Set type: warm-up, working set, back-off, drop set, to failure, AMRAP
  - Rest time in seconds
  - Completed flag (mark a set as done)
  - Notes per set

**6.3 In-Session Flexibility**
- Add exercises mid-session (even on program-based sessions)
- Reorder exercises within the session
- Remove exercises from the session
- Substitute an exercise: replaces a prescribed exercise, logs the substitution and reason
- Skip an exercise without deleting it

**6.4 Rest Timer**
- Configurable rest timer between sets
- Auto-starts after completing a set (if enabled in settings)
- Uses exercise-level or program-level rest time as default, overridable per set
- Countdown display with audio/vibration alert when done

**6.5 Completing a Session**
- Mark session as completed or abandoned
- Add overall session RPE (1-10)
- Add session-level notes (e.g., "felt heavy today", "shoulder was tight")
- Session name: inherited from program name or custom-named for freestyle
- Timestamps: started_at and completed_at recorded automatically
- On completion, triggers background jobs: PR detection, session stats calculation, trainer notification (if applicable)

**6.6 Session History**
- View all past sessions in reverse chronological order
- Each session shows: name, date, duration, number of exercises, total sets, total volume
- Tap into a session to see full detail: every exercise with every set logged
- Filter history by program, date range, or exercise

---

### 7. Personal Records

**7.1 Automatic PR Detection**
- PRs are calculated asynchronously after a session is completed
- PR types tracked:
  - One Rep Max (estimated from weight × reps using standard formula)
  - Max Weight (heaviest single set)
  - Max Reps (most reps at any weight in a single set)
  - Max Volume (weight × reps for a single set)

**7.2 PR Display**
- PRs shown on the exercise detail page
- PR badges/indicators on sets that achieved a record
- View all PRs across all exercises in a dedicated records page
- Each PR links back to the exact session and set where it was achieved

---

### 8. Trainer–Athlete Relationship

**8.1 Connecting**
- Trainer invites an athlete by email
- Athlete receives invite and accepts or declines
- Relationship status: pending → active → inactive
- Either party can deactivate the relationship
- An athlete can have zero or more trainers
- A trainer can have zero or more athletes

**8.2 Trainer Creates Programs for Athletes**
- Trainer creates a program (same flow as athlete program creation)
- Trainer assigns a program to one or more athletes
- Each assignment is independent — editing the program updates the template, existing assignments keep their snapshot (or optionally propagate, TBD)
- Trainer can set `allow_session_deviations` per assignment: controls whether the athlete can substitute/skip exercises during a session

**8.3 Permission Model**
- Athlete-created programs: athlete has full edit rights
- Trainer-assigned programs: athlete can only execute (start sessions from it), cannot edit the program itself
- During a live session on any program: athlete can make in-session adjustments (substitute, skip, add) if `allow_session_deviations` is enabled — these are logged as deviations, the original program is untouched
- Trainer can edit any program they created, including ones currently assigned to athletes

**8.4 Trainer Dashboard**
- View list of all connected athletes with status
- Per athlete:
  - View workout session history (same detail view as athlete sees)
  - View personal records
  - View body measurements and trends
  - View assigned programs and completion status
  - See session deviations: which exercises were substituted, skipped, or added, with reasons

---

### 9. Navigation & Layout

**9.1 Main Navigation (Athlete)**
- Programs (list + folders)
- Exercises (library + stats)
- Profile (profile info + measurements)
- Settings (preferences + account)
- Active session indicator (when a workout is in progress)

**9.2 Main Navigation (Trainer)**
- Athletes (client list)
- Programs (trainer's program templates)
- Exercises (shared library)
- Settings

**9.3 Responsive Design**
- Web-first (desktop and tablet)
- Mobile-responsive layout
- Native mobile app is a future consideration, not MVP

---

## Out of Scope for MVP

The following features are intentionally excluded from the first version but are acknowledged as future considerations:

- **Social features** — feed, following, sharing workouts, likes, comments
- **Workout templates marketplace** — community-shared programs
- **Superset/circuit grouping** — exercises grouped to be performed back-to-back
- **Periodization engine** — auto-progression, deload weeks, wave loading
- **In-app messaging** — trainer-athlete chat
- **Push notifications** — mobile push for program assignments, reminders
- **Offline mode** — logging workouts without connectivity
- **Native mobile app** — iOS/Android (web-first for MVP)
- **Stripe/payments** — trainer subscription billing
- **AI features** — program generation, form analysis, recommendations
- **Data import** — import from Hevy, Strong, or other apps
- **Data export** — CSV/JSON export of workout history
- **Multi-language support** — English only for MVP
- **Advanced analytics** — muscle heat maps, volume per body part over time, fatigue tracking

---

## Data Model Reference

The complete entity relationship diagram (ERD) is maintained separately in `workout-app-erd-v2.mermaid`. The technical architecture and stack decisions are documented in `workout-app-architecture.md`.
