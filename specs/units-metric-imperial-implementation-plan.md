# Metric / Imperial Wiring — Implementation Plan

> Execution plan for the spec at `specs/units-metric-imperial-spec.md`. Five commits, ordered by dependency and risk.

## Pre-work: inventory snapshot

Already done during planning. Summary:

**Display-only sites (~11 files):** `pages/sessions/[id].vue`, `pages/sessions/active.vue`, `pages/records.vue`, `pages/trainer/athletes/[id].vue`, `components/sessions/SessionHistoryCard.vue`, `components/sessions/ExerciseHistorySlideover.vue`, `components/exercises/ExerciseHistoryList.vue`, `components/exercises/ExercisePRCards.vue`, `components/exercises/ExerciseStatsChart.vue`, `components/profile/ProfileStatsBar.vue`, `components/trainer/group-session/ExerciseHistoryPanel.vue`.

**Input sites (~4 files):** `components/sessions/SessionSetRow.vue` (hot path), `components/sessions/SessionExerciseCard.vue` (column headers + addSet prefill), `components/trainer/group-session/CompactSetInput.vue`, `components/trainer/group-session/AthleteSessionCard.vue` (label), `components/profile/ProfileEditModal.vue` (body metrics).

**Out of scope (verified):** `ProgramExerciseEditModal.vue` (no prescribed weight field), `ProfileWeeklyChart.vue` (duration/reps only).

**Total:** ~17 files, ~600–700 line diff, 5 commits.

---

## Commit 1 — Schema migration + backend `/users/me` enrichment

**Goal:** move `unitPreference` from `AthleteProfile` to `UserSettings`, and return the full settings object as part of `GET /users/me`. No UI change yet.

### Why this ordering

Including `settings` on `/users/me` eliminates the "flash of wrong unit" problem before we write any display code. It also means `useUserSettings` becomes a thin reader around the auth store — one source of truth, no separate fetch, no waterfall.

### Files

- `apps/api/prisma/schema.prisma` — add `unitPreference UnitSystem @default(METRIC)` to `UserSettings`; remove from `AthleteProfile`. Reuse the existing enum.
- `apps/api/prisma/migrations/<timestamp>_move_unit_preference/migration.sql` — add column, copy existing values via `UPDATE user_settings SET unit_preference = ap.unit_preference FROM athlete_profile ap WHERE user_settings.user_id = ap.user_id`, drop the old column.
- `apps/api/src/users/users.service.ts` — `findMeById()` returns `{ ...user, settings }` using `include: { settings: true }`.
- `apps/api/src/users/users.controller.ts` — `getMe` endpoint already calls the service; no signature change, just returns the enriched object.
- `apps/api/src/users/user-profile.service.ts` (or wherever `PATCH /users/me/profile` is handled) — remove `unitPreference` from the allowed update fields.
- `apps/api/src/users/user-settings.service.ts` — accept `unitPreference` in the allowed update fields.
- `apps/api/src/users/users.service.spec.ts` / controller spec — update mock shapes.
- `packages/shared/src/schemas/user.ts` — move `unitPreference` from `athleteProfileSchema` / `athleteProfileInputSchema` to `userSettingsSchema` / `userSettingsInputSchema`. Extend the `MeResponse` type to include `settings: UserSettings`.
- `apps/web/app/stores/auth.ts` — extend `AuthUser` interface with `settings: { unitPreference, restTimerEnabled, defaultRestSec, theme, ... }`; on `fetchUser` the settings come bundled. No separate fetch.
- `apps/web/app/composables/useUserSettings.ts` — drop the independent fetch/cache. Become a thin reader: `settings = computed(() => authStore.user?.settings ?? defaults)`. On settings-page save, mutate `authStore.user.settings` directly. Preserve the existing public API (`restTimerEnabled`, `defaultRestSec`, `fetch`, `refresh`) so callers don't break — `fetch`/`refresh` become no-ops or delegate to `authStore.fetchUser()`.
- `apps/web/app/pages/settings.vue` — on successful `PATCH /users/me/settings`, mutate `authStore.user.settings.unitPreference = unitPreference.value`. Remove the `PATCH /users/me/profile` call for the unit field (keep it for body metrics).

### Risk

**Medium.** The migration is the risky part — existing data must be copied across cleanly. Test the migration on a local seed first: `prisma migrate reset` → verify preferences still resolve after the move. Default of `METRIC` covers any row that was `NULL`.

### Estimate

~150 lines across ~10 files (mostly the migration + schema + type edits).

---

## Commit 2 — `useUnits()` composable + unit tests

**Goal:** deliver the abstraction, fully tested, with no call sites yet.

### Files

- `apps/web/app/composables/useUnits.ts` — new.
- `apps/web/app/composables/useUnits.test.ts` — new (Vitest, colocated).
- `packages/shared/src/utils/unit-conversion.ts` — optionally add `cmToFtIn(cm): { ft: number, inches: number }` and a matching test in the shared package.
- `packages/shared/src/utils/unit-conversion.test.ts` — add round-trip tests if not already present: `lbToKg(kgToLb(x)) ≈ x` for x ∈ {0, 1, 45, 100, 225, 315, 1000}.

### Composable surface (from the spec)

```
useUnits() returns:
  unitPreference:  ComputedRef<'METRIC' | 'IMPERIAL'>
  isImperial:      ComputedRef<boolean>
  weightUnit:      ComputedRef<'kg' | 'lbs'>
  heightUnit:      ComputedRef<'cm' | 'ft/in'>

  formatWeight(kg, opts?)      → string    e.g. "225 lbs"
  formatWeightValue(kg)        → number    for chart datasets (no unit suffix)
  formatVolume(kg)             → string    "12,340 lbs" — aggregation-safe
  formatHeight(cm)             → string    "5' 11\""
  parseWeightInput(userValue)  → number    display → kg for storage
  parseHeightInput(ft, inches) → number    → cm for storage
  weightColumnLabel()          → string    "Weight (kg)" | "Weight (lbs)"
```

All formatters fall back to metric if `authStore.user?.settings` is null.

### Tests

- Metric and imperial formatting at edge values (0, null, decimals).
- Round-trip: `formatWeight(parseWeightInput(x, imperial), imperial) === formatWeight(x, imperial)` for x ∈ {45, 100, 135, 225, 315, 405}.
- Height conversion: 180 cm → `"5' 11\""`; reverse via `parseHeightInput(5, 11)` → ~180 cm.
- Volume aggregation: `formatVolume(12340, metric) === '12,340 kg'`, `formatVolume(12340, imperial) === '27,205 lbs'`.
- Pre-hydration: null user returns metric defaults.

### Risk

**Low.** Pure logic, fully tested, no call sites.

### Estimate

~150 lines composable + ~120 lines tests.

---

## Commit 3 — Display-only sweep

**Goal:** route every read-only weight/volume/height display through `useUnits()`. Mechanical, one pattern repeated.

### Files

Same list as the inventory's display-only section. Each file gets `const { formatWeight, formatVolume, weightUnit } = useUnits()` at the top and existing `${x} kg` / `Weight (kg)` expressions wrapped in the formatter.

Specific notes:

- **`pages/sessions/[id].vue`** — `formattedVolume`, `getPrDetail` value strings, `getColumnLabels()` (turn into a computed reading `weightUnit`), set cell formatting in `getSetValues`.
- **`pages/sessions/active.vue`** — `formattedVolume` computed (L218).
- **`pages/records.vue`** — `formatValue` helper uses `formatWeight`.
- **`pages/trainer/athletes/[id].vue`** — PR formatters, volume stat, athlete body metrics (`formatWeight` for bodyweight, `formatHeight` for height).
- **`components/sessions/SessionHistoryCard.vue`** — `formattedVolume`.
- **`components/sessions/ExerciseHistorySlideover.vue`** — inline `${set.weight}kg`.
- **`components/exercises/ExerciseHistoryList.vue`** — column labels + cell values (this file has its own `getColumnLabels` duplicate; fix both or extract to a shared helper).
- **`components/exercises/ExercisePRCards.vue`** — `formatValue`.
- **`components/profile/ProfileStatsBar.vue`** — volume + the hardcoded "Volume (kg)" label.
- **`components/trainer/group-session/ExerciseHistoryPanel.vue`** — inline `${set.weight}kg`.

### Optional refactor

`getColumnLabels` exists in two files. If I'm touching both, extract it to a `composables/useSetColumns.ts` or `utils/set-columns.ts` — but only if it stays one-per-tracking-type straightforward. Don't over-abstract for two call sites.

### Risk

**Medium** (scope, not correctness). Lots of files, but every change is cosmetic and verifiable by eye. Regressions are visual and obvious. Smoke-test both modes on sessions list + session detail + profile + trainer athlete detail.

### Estimate

~150 lines across 11 files (1-5 line edits per file).

---

## Commit 4 — Set logging input conversion (HIGH RISK, ISOLATED)

**Goal:** wire weight inputs + their save paths through `useUnits()`. Ship alone.

### Why isolated

See the earlier discussion — data correctness, not visual. Isolation gives a tight bisect surface, forces focused QA, and makes rollback surgical. Do **not** bundle with the display sweep.

### Files

- **`apps/web/app/components/sessions/SessionSetRow.vue`** — the hot path.
  - `form.weight` holds the **display-unit** value, not kg.
  - The prop-sync watcher (currently copies `props.set.weight` → `form.weight`) runs through a new helper that converts `props.set.weight` (kg) → display units.
  - The debounced autosave payload runs `form.weight` through `parseWeightInput` → kg before the API call.
  - `toggleCompleted` (which flushes pending autosave and writes immediately) uses the same parse path.
  - `:placeholder="weightUnit"` on the weight input.
  - Add a watcher on `useUnits().unitPreference` that re-converts `form.weight` when the user flips units mid-session (see spec edge case).
- **`apps/web/app/components/sessions/SessionExerciseCard.vue`** — column header spans use `{{ weightUnit }}` (L250, L263). `addSet()` prefill copies `lastSet.weight` kg-to-kg; **no change to that data flow** since the server round-trip keeps it metric.
- **`apps/web/app/components/trainer/group-session/CompactSetInput.vue`** — same pattern as `SessionSetRow.vue` but simpler (no autosave indirection). Uses the **trainer's** unit preference, not the athlete's.
- **`apps/web/app/components/trainer/group-session/AthleteSessionCard.vue`** — "kg" label at L238 uses `weightUnit`.

### Risk

**HIGH — data correctness.** A conversion bug here silently corrupts user set data.

**Mitigations:**

- Before merging, manually log 3 sets in metric mode and 3 in imperial. Switch modes. Reload. Verify values round-trip.
- Write a Vitest integration test: mount `SessionSetRow` with an imperial auth store, type `225`, assert the save payload contains `weight: 102.06`.
- Verify `toggleCompleted` and the debounced autosave both use `parseWeightInput` — miss one path, half the writes are wrong.
- Keep `useAutoSave`'s debounce (400 ms) untouched — no timing drift.
- Watch for re-save loops: if the prop-sync watcher fires on every save because the round-tripped value differs from the input by 0.01, you'll get an infinite save loop. Guard with a tolerance check.

### Estimate

~120 lines across 4 files + ~60 lines integration test.

---

## Commit 5 — Charts and body metrics input

**Goal:** finish the sweep with the chart and the profile edit modal.

### Files

- **`apps/web/app/components/exercises/ExerciseStatsChart.vue`**
  - Convert `maxWeight`, `estimated1RM`, `totalVolume` data points via `formatWeightValue` when building the Chart.js dataset (so y-axis values are in display units).
  - Unit labels in the metric selector + tooltip formatter use `formatWeight`.
  - `maxReps` series is unit-agnostic — no change.
- **`apps/web/app/components/profile/ProfileEditModal.vue`**
  - `form.weight` (bodyweight) held in display units, converted on save. Label switches (`kg` / `lbs`).
  - `form.height` split into two inputs for imperial (`ft` / `in`), converted to cm on save. In metric, keep the single cm input.
  - Prop-sync watcher converts from stored kg/cm to display values on modal open.
  - Save path converts back to kg/cm before calling `PATCH /users/me/profile`.

### Risk

**Medium.** Charts are read-only (no data persistence) — regressions are visual. Profile modal has a write path — verify DB values stay in kg/cm after a round-trip.

### Estimate

~100 lines across 2 files.

---

## Testing summary (from the spec, consolidated)

### Automated

- **`useUnits.test.ts`** — every formatter and parser, round-trip invariants, pre-hydration fallback.
- **`SessionSetRow.spec.ts`** — imperial auth store, type value, assert the save payload is metric.
- **`packages/shared/src/utils/unit-conversion.test.ts`** — if it doesn't exist, create it with round-trip cases.

### Manual QA (before merging Commit 4)

See the spec's testing checklist — 7 scenarios covering both units, both user roles, and the write path.

---

## Rollout order

1. **Commit 1** — schema migration + `/users/me` bundling. No user-visible change. Verify migration runs cleanly.
2. **Commit 2** — composable. No user-visible change. Verify tests pass.
3. **Commit 3** — display sweep. Smoke-test both modes on all listed pages. Regressions are visual and easy to spot.
4. **Commit 4** — ⚠️ set logging. **Manual QA required** before push. Test the round-trip scenario in the spec's checklist.
5. **Commit 5** — charts + body metrics. Smoke-test the exercise stats chart and the profile edit modal in both modes.

## Deferred follow-ups (tracked, not blocking)

- **Plate-rounding snap** on prefill — 2.5 kg metric, 2.5 lb imperial. Defer until requested.
- **Distance display** — nothing currently shows distance in history UI.
- **Trainer per-athlete unit override** — decided: trainer's unit always wins.

---

## Critical files

- `apps/api/prisma/schema.prisma`
- `apps/web/app/stores/auth.ts`
- `apps/web/app/composables/useUnits.ts` (new)
- `apps/web/app/composables/useUserSettings.ts`
- `apps/web/app/components/sessions/SessionSetRow.vue`
- `apps/web/app/pages/settings.vue`
- `apps/api/src/users/users.service.ts`
