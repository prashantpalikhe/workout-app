# Stale Session Recovery — Feature Specification

## Problem

Users sometimes forget to complete a workout session. When they return hours or days later and tap "Finish," the session records an absurd duration (e.g., 24 hours) that pollutes their history, stats, and streaks.

---

## Solution

When the user taps "Finish" on a session that has been running for more than **3 hours**, the completion modal shows a warning and lets the user **adjust the end time** before completing. The user is in full control — no auto-correction, no assumptions.

---

## How It Works

### Normal flow (< 3 hours)

User taps "Finish" → standard completion modal (RPE + notes) → `completedAt = now()`.

No changes to this flow.

### Long session flow (>= 3 hours)

User taps "Finish" → completion modal opens with an additional **duration warning + end time editor**:

1. **Warning banner** at the top of the modal: "This workout has been running for [X hours Y minutes]. Did you forget to finish? You can adjust the end time below."
2. **End time input**: a `datetime-local` field defaulting to the current time. The user can adjust it to when they actually stopped working out.
3. The rest of the modal is unchanged: RPE input, notes input, exercise/set summary.
4. On submit:
   - If the user **changed** the end time → `completedAt` = the user-chosen time
   - If the user **did not change** the end time → `completedAt = now()` (no override sent to server)

### Duration threshold

A session is considered "long" when `now() - startedAt > 3 hours`. Simple check, no set-level timestamps needed.

### Trainer exclusion

The warning and end time editor are **not shown in trainer mode**. Trainer completion flows work as before regardless of session duration.

---

## Completion Modal Changes

The existing `SessionCompleteModal.vue` gains a conditional section shown only when the session is long AND the user is not in trainer mode.

State is fully recomputed each time the modal opens (via `watch(open)`):
- `isLongSession` — recalculated from `now() - startedAt`
- `endTime` — reset to current local time
- `endTimeChanged` — reset to `false`
- `maxEndTime` — reset to current local time (not a cached computed)

The end time input uses `datetime-local` with:
- `min` = session `startedAt` (formatted as local time)
- `max` = current time (recomputed on each open)

### Client-side validation

Before submitting, explicit checks run (not relying on native input constraints):
- End time before `startedAt` → shows error "End time cannot be before the workout started"
- End time in the future → shows error "End time cannot be in the future"

---

## Backend Changes

### Schema

`completeSessionInputSchema` accepts an optional `completedAt`:

```ts
completedAt: z.string().datetime().optional()
```

### Session completion

`SessionsService.complete()`:
- If `dto.completedAt` is provided: parse it, validate it's >= `startedAt` and <= `now()`, use it
- If not provided: use `new Date()` as before
- Invalid `completedAt` returns 400 Bad Request

No staleness check on the server — any session can send a `completedAt` as long as it's in valid range. The 3-hour warning is purely a frontend UX hint.

---

## What This Does NOT Do

- **No blocking modal on app load.** The user can resume and interact with their session freely. The warning only appears when they tap "Finish."
- **No auto-correction.** The server doesn't compute or override the end time. The user decides.
- **No new schema migrations.** No new database columns. Just an optional field on the existing complete input.
- **No stale detection state.** No `staleDismissedAt`, no `updatedAt` on sets. Simple `startedAt` duration check.
- **No trainer scope.** Trainer completion flows don't show the warning.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Session < 3 hours | Normal flow, no warning, `completedAt = now()` |
| Session > 3 hours, user doesn't adjust end time | `completedAt = now()`, long duration preserved (their choice) |
| Session > 3 hours, user adjusts end time | `completedAt` = user-chosen time, duration reflects adjustment |
| User picks end time before `startedAt` | Client-side error, can't submit |
| User picks end time in the future | Client-side error, can't submit |
| User opens modal, adjusts time, cancels, reopens | All state (end time, changed flag) is reset on reopen |
| Trainer completes a long session | No warning shown, normal flow |

---

## Files Modified

1. `packages/shared/src/schemas/session.ts` — added optional `completedAt` to `completeSessionInputSchema`
2. `apps/api/src/sessions/sessions.service.ts` — uses `dto.completedAt` when provided, validates range
3. `apps/api/src/sessions/sessions.service.spec.ts` — 4 tests for completedAt handling
4. `apps/web/app/stores/sessions.ts` — `completeSession` accepts optional `completedAt`
5. `apps/web/app/components/sessions/SessionCompleteModal.vue` — duration warning, end time editor, client-side validation
