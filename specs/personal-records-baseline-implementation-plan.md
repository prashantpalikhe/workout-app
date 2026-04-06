# Plan: Add `isBaseline` to Personal Records

## Context

When a user does an exercise for the first time, every set trivially becomes a "personal record" because there's nothing to compare against. This is misleading — a PR should mean you **beat** a previous best, not that you did something for the first time.

Currently both `detectPRs` (post-session) and `checkPR` (live check) treat first-time exercises as PRs. We need to still save first-time records (they're the baseline for future comparisons) but stop displaying them as achievements.

## Changes

### 1. Prisma Schema — add `isBaseline` column

**File:** `apps/api/prisma/schema.prisma` (line 480-498)

Add `isBaseline Boolean @default(false) @map("is_baseline")` to the `PersonalRecord` model.

### 2. Migration

Run `pnpm prisma migrate dev --name add-is-baseline-to-personal-records`.

**Backfill strategy: conservative.** The current schema stores `achieved_on` as a DATE (not timestamp) and `session_set_id` can be null, so we cannot reliably determine which record was truly first when multiple records for the same `(athlete_id, exercise_id, pr_type)` share the same date. 

Approach: for each `(athlete_id, exercise_id, pr_type)` group, mark the record with the **oldest `achieved_on`** as baseline. If multiple records share that oldest date, mark the one with the **smallest `id`** (UUID, lexicographic — a best-effort tiebreaker). Add a comment in the migration SQL acknowledging this is approximate for same-day records.

### 3. Backend — `RecordsService.detectPRs`

**File:** `apps/api/src/records/records.service.ts`

**Interface** (line 24): Add `isBaseline: boolean` to `CandidatePR`.

**Detection loop** (lines 85-104):
```ts
const isBaseline = !existingBest;
if (isBaseline || candidate.value > existingBest.value) {
  newPRs.push({ ..., isBaseline });
}
```

**Create data** (lines 120-132): Pass `isBaseline` into Prisma create.

**Return mapping** (lines 150-158): Include `isBaseline` in response so session completion can distinguish.

### 4. Backend — `RecordsService.checkPR`

**File:** `apps/api/src/records/records.service.ts` (lines 280-316)

Fix: if no historical saved record exists for this exercise+prType, skip it entirely — no PR marker even if the current session has improving sets.

```ts
// For each prType:
const existingBest = await this.prisma.personalRecord.findFirst({
  where: { athleteId: userId, exerciseId: input.exerciseId, prType },
  orderBy: { value: 'desc' },
  select: { value: true },
});

// No historical record → not a PR, skip
if (!existingBest) continue;

const sessionBest = sessionSets.length > 0
  ? this.computeCandidate(prType, sessionSets)
  : null;

const bestValue = Math.max(existingBest.value, sessionBest?.value ?? 0);

if (candidate.value > bestValue) {
  prTypes.push({ type: prType, label });
}
```

This ensures a user's first-ever session for an exercise shows zero PR markers on all sets, even when set 2 improves on set 1.

### 5. Backend — `RecordsService.findAll`

**File:** `apps/api/src/records/records.service.ts` (lines 162-201)

Add `isBaseline: false` to `where` clause. Baselines excluded from records listing page.

### 6. Backend — `RecordsService.findByExercise`

**File:** `apps/api/src/records/records.service.ts` (lines 204-227)

Add `isBaseline: false` to `where` clause. ExercisePRCards only show genuine PRs.

### 7. Backend — Exercise history PR badges

**File:** `apps/api/src/exercises/exercises.service.ts` (lines 346-350, 376)

The `getHistory` method includes `personalRecord` on sets and forwards it directly in the response mapping (line 376). Add `isBaseline` to the select, then null it out in the mapping:

```ts
// In include:
personalRecord: {
  select: { id: true, prType: true, value: true, isBaseline: true },
},

// In mapping:
personalRecord: s.personalRecord?.isBaseline ? null : s.personalRecord
  ? { id: s.personalRecord.id, prType: s.personalRecord.prType, value: s.personalRecord.value }
  : null,
```

### 8. Backend — Session response normalization

**Files:**
- `apps/api/src/sessions/sessions.service.ts`
- `apps/api/src/sessions/session-exercises.service.ts`

`sessions.service.ts` (line 23) defines a shared `sessionInclude` used by `findActive`, `findAll`, `findById`, `update`, `complete`, `abandon`, and both `start` flows. Rather than patching each method individually, implement a shared `normalizeSession()` helper that strips baseline `personalRecord` objects from all set data. Add `isBaseline` to the `personalRecord` select in `sessionInclude`, then pipe every returned session through the normalizer before returning.

Similarly, `session-exercises.service.ts` has its own set include — apply the same normalizer or a shared `normalizeSet()` utility.

This avoids duplicating null-out logic per method and ensures no session response path leaks baselines.

### 9. Backend — User stats PR count

**File:** `apps/api/src/users/user-stats.service.ts` (line 60-62)

Change:
```ts
this.prisma.personalRecord.count({
  where: { athleteId: userId },
})
```
to:
```ts
this.prisma.personalRecord.count({
  where: { athleteId: userId, isBaseline: false },
})
```

So `totalPersonalRecords` only counts genuine PRs, not baselines.

### 10. Frontend — No changes needed

All filtering happens server-side:
- `ExerciseHistoryList.vue` — `v-if="set.personalRecord"` already handles null
- `ExerciseHistorySlideover.vue` — same
- `ExercisePRCards.vue` — receives from `findByExercise` which excludes baselines
- `pages/records.vue` — receives from `findAll` which excludes baselines
- Shared types (`ExerciseHistorySet.personalRecord`) — unchanged, still `| null`

### 11. Tests

**File:** `apps/api/src/records/records.service.spec.ts`

Update existing:
- "should create PRs when no existing records" — verify `isBaseline: true` on created records

Add new tests in `records.service.spec.ts`:
- "should set isBaseline false when beating existing record"
- "checkPR returns isPR false when no existing records (first-time exercise)"
- "checkPR returns isPR false even when second set beats first set in first-ever session"
- "findAll excludes baseline records"
- "findByExercise excludes baseline records"

Add/update tests in other affected services:
- `user-stats.service.spec.ts` — verify `totalPersonalRecords` excludes baselines (`isBaseline: false` in count query)
- `exercises.service.spec.ts` — verify `getHistory` nulls out baseline `personalRecord` on sets
- `session-exercises.service.spec.ts` — verify add/update exercise responses strip baseline PR badges
- `sessions.service.spec.ts` — verify baseline `personalRecord` values are stripped to null on at least one single-session path (`findById` or `complete`) and one collection/start path (`findAll` or `start`)

## Files to modify

1. `apps/api/prisma/schema.prisma` — add column
2. `apps/api/src/records/records.service.ts` — detectPRs, checkPR, findAll, findByExercise
3. `apps/api/src/records/records.service.spec.ts` — update + new tests
4. `apps/api/src/exercises/exercises.service.ts` — getHistory PR badge filtering
5. `apps/api/src/sessions/sessions.service.ts` — personalRecord select + null out baselines
6. `apps/api/src/sessions/session-exercises.service.ts` — personalRecord select + null out baselines
7. `apps/api/src/users/user-stats.service.ts` — exclude baselines from PR count

## Verification

1. Run `pnpm prisma migrate dev` in `apps/api` to apply migration
2. Run tests: `cd apps/api && pnpm test -- records.service`
3. Run tests: `cd apps/api && pnpm test -- sessions.service`
4. Run tests: `cd apps/api && pnpm test -- user-stats.service`
5. Run tests: `cd apps/api && pnpm test -- exercises.service`
6. Run tests: `cd apps/api && pnpm test -- session-exercises.service`
6. Manual scenarios:
   - First-time exercise → no PR badges in history, no PR cards, not on records page (row exists in DB with `isBaseline: true`)
   - Second session beating first → PR badge shows, appears on records page, PR cards update
   - First session with improving sets (set 2 > set 1) → still no PR markers
   - User stats `totalPersonalRecords` excludes baselines
