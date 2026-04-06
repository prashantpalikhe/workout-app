# Stale Session Recovery — Feature Specification

## Problem

Users sometimes forget to complete or abandon a workout session. They close the app mid-workout, get distracted, or fall asleep. When they return hours or days later, they have an "active" session showing an absurd duration (e.g., 24 hours) that doesn't reflect their actual workout.

This creates bad data (inflated duration in session history, stats, and streaks) and a confusing UX (the app opens to a stale workout instead of letting them start fresh).

---

## Solution

When the user returns to the app with a stale active session, show a recovery prompt that lets them decide what to do. Use smart defaults so the session data stays accurate regardless of their choice.

---

## Stale Detection

A session is considered **stale** when:

- Status is `IN_PROGRESS`
- AND the most recent activity is older than **3 hours**

"Most recent activity" is determined by (in priority order):
1. The latest `updated_at` timestamp of any set in the session (most accurate — reflects the last time the user actually touched a set)
2. If no sets exist, fall back to `startedAt`

**Why 3 hours?** Most workouts are 30min–2hrs. A 3-hour threshold accommodates long sessions (powerlifting, marathon gym visits) while still catching genuinely forgotten sessions. This is not configurable for MVP.

---

## Recovery Prompt

When the app detects a stale session, show a modal **before** the user can interact with the session. The modal appears on:

- The active session page (`/sessions/active`)
- The dashboard (if it shows the active session bar)
- The sessions list page (if it shows the "resume" banner)

### Modal Content

**Title:** "You have an unfinished workout"

**Subtitle:** "[Session Name] — started [relative time, e.g., 'yesterday at 6:14 PM']"

**Summary:** "[X] exercises, [Y] completed sets"

**Three actions:**

| Action | Label | Behavior |
|--------|-------|----------|
| Resume | "Resume Workout" | Dismiss the modal, continue the session as-is. The duration will keep growing from the original `startedAt`. For users who intentionally take long breaks. |
| Complete | "Complete Workout" | Complete the session with a corrected `completedAt` (see Smart Completion Time below). Opens the standard completion modal (RPE + notes) after. |
| Abandon | "Discard Workout" | Abandon the session. Requires a confirmation tap ("Are you sure? This can't be undone."). |

**Default/primary action:** "Complete Workout" (most common intent — the user did work out, they just forgot to finish).

---

## Smart Completion Time

When completing a stale session, the `completedAt` should reflect when the user **actually stopped working out**, not when they tapped "Complete."

**Algorithm:**

1. Find the latest `updated_at` timestamp across all sets in the session
2. If sets exist: `completedAt` = that timestamp
3. If no completed sets exist: `completedAt` = `startedAt` (zero-duration session)

This keeps session duration accurate in history, stats, weekly charts, and calendar heatmaps.

### Backend Change

The `completeSessionInputSchema` needs a new optional field:

```
completedAt: z.string().datetime().optional()
```

When provided, `SessionsService.complete()` uses it instead of `new Date()`. The field is only accepted when the session is stale (server-side validation: `startedAt` is more than 3 hours ago). For non-stale sessions, the field is ignored and `new Date()` is used as before.

---

## Frontend Implementation

### Stale Check Logic

Add a computed/utility to the session store:

```ts
const STALE_THRESHOLD_MS = 3 * 60 * 60 * 1000 // 3 hours

function isSessionStale(session: WorkoutSession): boolean {
  const lastActivity = getLastActivityTime(session)
  return Date.now() - new Date(lastActivity).getTime() > STALE_THRESHOLD_MS
}

function getLastActivityTime(session: WorkoutSession): string {
  // Find the latest set updated_at across all exercises
  let latest = session.startedAt
  for (const exercise of session.sessionExercises) {
    for (const set of exercise.sets) {
      if (set.updatedAt && set.updatedAt > latest) {
        latest = set.updatedAt
      }
    }
  }
  return latest
}
```

### New Component: `StaleSessionModal.vue`

- Receives the stale `WorkoutSession` as a prop
- Shows session name, start time, exercise/set summary
- Three buttons: Resume, Complete, Discard
- "Complete" opens the existing `SessionCompleteModal` after passing the smart `completedAt`
- "Discard" shows inline confirmation before calling abandon

### Integration Points

- `pages/sessions/active.vue` — After `fetchActive()`, check `isSessionStale()`. If true, show the modal.
- `layouts/default.vue` — The active session bar in the nav already calls `fetchActive()`. If stale, the bar could show a warning indicator (orange instead of green), but the modal only appears on the active session page.

### SessionSet Type Change

The `SessionSet` interface needs `updatedAt` added:

```ts
export interface SessionSet {
  // ... existing fields
  updatedAt: string  // needed for stale detection
}
```

The backend already has `updated_at` on `session_sets` — it just needs to be included in the API response (add to the `sessionInclude` select).

---

## What This Does NOT Do

- **No auto-abandon.** Sessions are never automatically closed. The user always decides.
- **No background timer.** Detection happens on app load, not via polling or push.
- **No notification.** No "you forgot your workout" email/push. In-app only.
- **No configurable threshold.** 3 hours is fixed for MVP. Could be a user setting later.
- **No partial completion.** The user can't say "complete up to set 5 and discard the rest." It's all or nothing.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User resumes, works out more, then completes normally | Session completes with `new Date()` as usual (no longer stale once resumed) |
| User resumes, then closes app again (still stale later) | Prompt reappears on next visit |
| Session has no sets at all | Smart completion uses `startedAt`, resulting in 0-duration session |
| Session started 5 minutes ago (not stale) | No prompt, normal active session behavior |
| User has slow internet and the page takes time to load | Stale check runs after `fetchActive()` resolves, so data is always fresh |
| Multiple browser tabs open | Each tab independently checks on load. No conflict since actions are idempotent (complete/abandon on an already-completed session returns an error the UI handles). |

---

## Files to Modify

### Backend
- `packages/shared/src/schemas/session.ts` — Add optional `completedAt` to `completeSessionInputSchema`
- `apps/api/src/sessions/sessions.service.ts` — Use provided `completedAt` for stale sessions

### Frontend
- `apps/web/app/stores/sessions.ts` — Add `isSessionStale()`, `getLastActivityTime()`, add `updatedAt` to `SessionSet`
- `apps/web/app/components/sessions/StaleSessionModal.vue` — New component
- `apps/web/app/pages/sessions/active.vue` — Show stale modal after fetch
- `apps/api/src/sessions/sessions.service.ts` — Include `updatedAt` in set select within `sessionInclude`
