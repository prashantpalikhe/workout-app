# Personal Records — Feature Specification

## Overview

The app automatically tracks personal records (PRs) for every exercise a user performs. A PR represents a genuine improvement — beating a previous best. The first time a user performs an exercise, the results are saved as a **baseline** for future comparison but are not celebrated as records.

---

## What Is a Personal Record?

A personal record is created when a user completes a set that **exceeds their previous best** for a specific exercise and record type. The key distinction:

- **Baseline**: Your first-ever result for an exercise. Saved internally as a reference point but not displayed as an achievement.
- **Personal Record**: Any result that beats a previously established baseline or record. Displayed with badges, shown on the records page, and counted in stats.

---

## Record Types

Each exercise has a **tracking type** that determines which record types apply:

| Exercise Tracking Type | Applicable Record Types |
|----------------------|------------------------|
| Weight & Reps | Est. 1RM, Max Weight, Max Reps, Max Volume |
| Reps Only | Max Reps |
| Weight & Duration | Max Weight |
| Duration | *(none)* |
| Distance & Duration | *(none)* |

### Record Type Definitions

**Est. 1RM (Estimated One-Rep Max)**
- Formula: Epley — `weight x (1 + reps / 30)`, rounded to 2 decimal places
- When reps = 1, the 1RM equals the weight itself
- Requires both weight > 0 and reps > 0 from a single completed set
- Most accurate for 1-10 rep ranges

**Max Weight**
- The heaviest weight lifted in a single completed set
- Requires weight > 0

**Max Reps**
- The most reps performed in a single completed set
- Requires reps > 0

**Max Volume**
- The highest single-set volume, calculated as `weight x reps`
- Requires both weight > 0 and reps > 0

---

## When Records Are Detected

### After Session Completion

When a user completes a workout session, the system immediately evaluates all completed sets:

1. Groups completed sets by exercise
2. For each exercise, determines applicable record types based on tracking type
3. Computes the best candidate value for each record type from the session's sets
4. Compares against the user's existing best for that exercise + record type
5. **If no prior record exists** → saves a baseline (not displayed as a PR)
6. **If the candidate beats the existing best** → saves a new personal record

Records are only created when the new value is **strictly greater than** the existing best. Ties do not create new records.

### Live PR Check (During Workout)

The app can check in real-time whether a set being logged would be a new PR:

- Compares the draft set against both saved records AND already-completed sets in the current session
- **If no saved record exists for this exercise + record type** → returns "not a PR" (even if the set improves on an earlier set in the same session)
- **If the set beats both the saved record and any in-session bests** → returns "is a PR"

This means during a user's first-ever session with an exercise, no sets will show PR indicators, regardless of the values entered.

---

## Record Storage

Records are stored as an append-only history. Each row captures:

| Field | Description |
|-------|-------------|
| `athlete_id` | The user who achieved it |
| `exercise_id` | Which exercise |
| `pr_type` | ONE_REP_MAX, MAX_WEIGHT, MAX_REPS, or MAX_VOLUME |
| `value` | The record value (kg, reps, or kg*reps for volume) |
| `achieved_on` | Date the record was set (from session start date) |
| `session_set_id` | Link to the specific set (nullable, unique) |
| `is_baseline` | Whether this was the first-ever result (no prior record to beat) |

### Session Set ID Assignment

When a single set achieves multiple record types simultaneously, only one record can claim the `session_set_id` link (due to uniqueness constraint). Records are assigned by priority:

1. Est. 1RM (highest priority)
2. Max Weight
3. Max Volume
4. Max Reps (lowest priority)

Lower-priority records from the same set are still saved but with `session_set_id = null`.

---

## Where Records Are Displayed

### Records Page (`/records`)

Lists all personal records grouped by exercise. Each record shows:
- Record type label (Est. 1RM, Max Weight, Max Reps, Max Volume)
- Value with unit (e.g., "120 kg", "15 reps")
- Date achieved
- Icon per record type

**Baseline records are excluded.** Only genuine improvements appear here.

### Exercise Detail Page (`/exercises/:id`)

Shows 4 PR cards at the top of the page — one per applicable record type — displaying the current best value.

**Baseline records are excluded.** If the user has only done the exercise once, no PR cards appear.

### Exercise History

When viewing past sessions for an exercise, individual sets can display a PR badge (trophy icon + record type label) indicating that the set achieved a personal record.

**Baseline records do not show badges.** Sets from the user's first-ever session with an exercise appear without PR indicators.

### User Profile Stats

The profile page shows `totalPersonalRecords` as part of the user's stats overview.

**Baseline records are excluded from this count.** The number reflects genuine improvements only.

### Session Completion Response

When a session is completed, the API returns a `newPersonalRecords` array alongside the session data. This includes both baselines and genuine PRs (with `isBaseline` flag) so the frontend can decide how to present them.

---

## Data Stored Internally (Metric)

All record values are stored in metric units:
- Weight in kilograms (kg)
- Distance in kilometers (km)
- Duration in seconds

Conversion to imperial (lb, in) happens at display time based on the user's unit preference.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| First-ever session with an exercise | Baselines saved, no PR badges or markers shown |
| Second session beating first | Genuine PRs created, badges and cards appear |
| Second session not beating first | No new records created |
| Set with weight = 0 | No weight-based PRs (1RM, Max Weight, Max Volume); Max Reps still possible |
| Set with reps = 0 | No reps-based PRs; Max Weight still possible |
| Exercise with DURATION tracking | No PRs tracked at all |
| Tied value (equal to existing best) | No new record created |
| Multiple improving sets in first session | All baselines, no PR markers on any set |
| Session abandoned (not completed) | No PR detection runs |
| Set marked as not completed | Excluded from PR calculations |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/records` | List all personal records (paginated, filterable by exercise/type). Excludes baselines. |
| GET | `/records/exercise/:exerciseId` | Get current best PR per type for an exercise. Excludes baselines. |
| POST | `/records/check-pr` | Check if a set would be a new PR (read-only). Returns false for first-time exercises. |

PR detection is not a standalone endpoint — it runs automatically inside session completion (`POST /sessions/:id/complete`).
