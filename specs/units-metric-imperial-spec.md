# Metric / Imperial Unit System — Feature Specification

## Overview

The app stores all physical quantities (weight, height, distance) in **metric units internally** and converts to the user's preferred unit at display time. Users can choose between **Metric** (kg, cm, km) and **Imperial** (lbs, ft/in, miles) via a single setting that applies app-wide across all features, pages, and user roles.

The storage-metric / display-converted invariant means data is unit-agnostic at rest and unit-aware only at the edges — inputs convert to metric before saving, outputs convert from metric before rendering.

---

## Goals

- A single user preference controls unit display across the entire app.
- The preference applies to **both athletes and trainers** (trainers viewing athlete data see weights in the trainer's preferred unit).
- First paint on every page is in the correct unit — no flash of unconverted content.
- Input fields respect the unit: a user in imperial mode types `225` and the system stores `102.06` kg.
- Round-tripping a value (type → save → reload → display) produces the same user-facing number.
- Conversions are centralized in one place; no component does math inline.
- Switching the preference takes effect immediately across the app without a reload.

## Non-Goals

- Per-exercise unit overrides (e.g. "this exercise always in kg"). Everything is one preference.
- Localized number formatting beyond what the browser provides via `toLocaleString`.
- Supporting additional unit systems (stones, pood). Only metric and imperial.
- Changing the database schema to store values in the user's preferred unit.

---

## The Storage Invariant

> **All weights, heights, and distances are stored in metric.**

- **Weight** → kilograms (kg)
- **Body weight** → kilograms (kg)
- **Height** → centimeters (cm)
- **Distance** → kilometers (km)

This invariant is enforced at the API boundary. The backend never accepts imperial values; the frontend converts any imperial input to metric before sending it to the API. The backend never emits imperial values; all responses contain raw metric numbers and the frontend converts them for display.

**Why:** single source of truth, trivial cross-user aggregation (leaderboards, group stats), no ambiguity in stored values, no user-preference-aware serialization in services or background jobs.

---

## User Preference

### Where it lives

The preference is stored on the `UserSettings` table (not `AthleteProfile`), because:

1. It's a UI/display preference, not athlete-specific data.
2. Trainers also need a unit preference — they don't have an athlete profile.
3. It groups naturally with other app-wide preferences (`theme`, `restTimerEnabled`, `defaultRestSec`).
4. Future app-wide settings (locale, density, notification prefs) belong in the same place.

### Schema

```
UserSettings {
  userId              String  @id
  unitPreference      UnitSystem @default(METRIC)   // NEW
  restTimerEnabled    Boolean
  defaultRestSec      Int
  theme               Theme
  ...
}

enum UnitSystem {
  METRIC
  IMPERIAL
}
```

`unitPreference` is migrated **off** `AthleteProfile` and **onto** `UserSettings`. Existing values are copied during migration; athletes without the field default to `METRIC`.

### API surface

- **`GET /users/me`** returns the user identity *with a nested `settings` object* containing `unitPreference` and all other UserSettings fields. This is the only call needed on app startup — one round-trip, no waterfall, no race with "first paint in wrong unit."
- **`PATCH /users/me/settings`** updates any UserSettings field including `unitPreference`. On success, the frontend updates the store directly without re-fetching.
- The preference is never included in individual entity responses (sessions, exercises, records) — those stay purely numeric metric.

### Settings page

The settings page already has a metric/imperial select bound to `unitPreference`. After migration it posts to `/users/me/settings` instead of `/users/me/profile`. No UI change.

---

## Display Rules

### Weight

| Mode | Format | Example |
|------|--------|---------|
| Metric | Integer or 1 decimal (matches source) | `100 kg`, `102.5 kg` |
| Imperial | 1 decimal for values < 1000, integer for volumes ≥ 1000 | `220.5 lbs`, `12,340 lbs` |

**Rationale for the 1-decimal rule:** metric values are typically clean (100, 102.5), but their imperial conversions are not (100 kg → 220.46 lbs). One decimal reads cleanly without pretending to more precision than the source justifies.

**Thousands separators:** use `toLocaleString()` for volumes in both modes.

### Height

| Mode | Format | Example |
|------|--------|---------|
| Metric | Integer cm | `180 cm` |
| Imperial | Feet and inches | `5' 11"` |

**Why feet-and-inches for imperial:** decimal inches (`70.87 in`) is unusable for body height. Feet-and-inches is the de facto format for humans in imperial-using regions.

### Volume (aggregated weight × reps)

Volumes are **summed in metric, converted once to the display unit**. Never convert per-set and sum — that compounds rounding error across hundreds of sets.

| Mode | Format | Example |
|------|--------|---------|
| Metric | Integer, thousands separator | `12,340 kg` |
| Imperial | Integer, thousands separator | `27,205 lbs` |

### Personal Records

PR values use 1 decimal in both modes (matches existing behavior in `sessions/[id].vue`):

- `1RM 102.5 kg` / `1RM 225.9 lbs`
- `Heaviest 100 kg` / `Heaviest 220.5 lbs`
- `Most volume · 1,250 kg` / `Most volume · 2,756 lbs`
- `Most reps · 12` (unit-agnostic)

### Column Labels

Table column headers in session/exercise history update dynamically:

- Metric: `Weight (kg)`
- Imperial: `Weight (lbs)`

Input placeholders update the same way.

### Distance

Not currently displayed but reserved: metric → `km`, imperial → `mi`. Conversion factor: 1 km = 0.621371 mi.

---

## Input Rules

### The Hot Path: Set Logging

When a user is in imperial mode and logs a set at `225 lbs × 5`, the system must:

1. Accept the number `225` as-is in the input field.
2. Display `225` until the user edits it.
3. Convert to kg (`lbToKg(225) → 102.06`) and store it as the form's metric source of truth.
4. Send that metric value to the server on save.
5. On reload, fetch `102.06` kg and render it as `225 lbs` (via `kgToLb(102.06) = 225.0`).

The round-trip **must** produce the same user-facing value, and — critically — the stored metric value **must not drift** when the user doesn't edit the weight field.

### Form State Rule

> **Form components hold the metric source of truth, not the display value.**

Every input that edits a unit-bearing value (`SessionSetRow.vue`, `CompactSetInput.vue`, `ProfileEditModal.vue`) stores the metric number in form state (`form.weightKg`, `form.heightCm`). The input is bound via a **computed** with a getter that converts metric → display and a setter that converts user input display → metric.

The setter only fires when the user actively types. If they never touch the input, the stored metric value passes through unchanged on save.

This design avoids two classes of bug:

1. **Invisible drift when saving unrelated fields.** Previously, `form.weight` was held in display units, and `save()` unconditionally did `parseWeightInput(form.weight)`. Every save of any field rounded the stored kg value — e.g. `80 kg → 176.4 lbs display → lbToKg(176.4) = 80.01 kg`. That silently mutates workout history.
2. **Rounding on toggle-complete.** Marking a set complete (or editing a different field on the same set) flushes the full payload back to the server. If that payload recomputes weight from the display value, the stored kg drifts.

### Round-Trip Stability

`kgToLb` and `lbToKg` in `@workout/shared` round to 2 decimal places. Not every clean metric value round-trips cleanly — `80 kg → 176.4 lb → 80.01 kg` drifts, and `170 cm → 5'7" → 170.18 cm` drifts. **The form-state rule above makes this moot**: the stored value is the source and is never regenerated from display output.

**Invariants:**

- If the user never types in the weight field, `payload.weight === props.set.weight` exactly (pass-through).
- If the user types `x` in the current display unit, `payload.weight === parseWeightInput(x)` (single conversion).
- Display after reload: `formatWeightValue(payload.weight)` — may differ from the literal input value by a small amount when the helpers round, but the underlying storage is stable.

### Body Metrics

Height and body weight in the profile edit modal follow the same rules: user types in display units, frontend converts on save. Reload produces the same user-facing values.

---

## Data Flow

### Read path (display)

```
API response (metric kg)
    ↓
Frontend component receives kg value
    ↓
useUnits().formatWeight(kgValue)
    ↓
  if METRIC: "{value} kg"
  if IMPERIAL: "{kgToLb(value)} lbs"
    ↓
Rendered in UI
```

### Write path (input)

```
User types "225" in weight input (imperial mode)
    ↓
form.weight = 225  (display units, component-local state)
    ↓
User blurs / completes set
    ↓
useUnits().parseWeightInput(225)
    ↓
  if METRIC: 225 (unchanged)
  if IMPERIAL: lbToKg(225) = 102.06
    ↓
API PATCH /sessions/:id/sets/:id { weight: 102.06 }
    ↓
DB stores 102.06 kg
```

### Reactivity

When the user changes their preference on the settings page:

```
User toggles METRIC → IMPERIAL
    ↓
PATCH /users/me/settings { unitPreference: 'IMPERIAL' }
    ↓
authStore.settings.unitPreference = 'IMPERIAL'  (direct store mutation on success)
    ↓
Every computed using useUnits() re-runs
    ↓
Every weight/height/volume in the app re-renders in the new unit
```

No page reload. No refetch of session data. The numbers are all in kg in memory — only the formatters change.

---

## Role-Specific Behavior

### Athletes

- See all their own weights in their chosen unit.
- Logging sets uses their chosen unit.
- Body metrics (height, weight) in profile use their chosen unit.

### Trainers

- See all athletes' weights in the **trainer's** unit, not the athlete's. A trainer who prefers lbs sees athlete data in lbs regardless of the athlete's preference.
- **Rationale:** a trainer coaching 20 athletes can't mentally switch between kg and lbs across contexts. The trainer's unit is the consistent lens.
- Group session input (logging on behalf of an athlete) uses the trainer's unit.

---

## Edge Cases

### Pre-hydration rendering

Before `authStore.initialize()` resolves, `authStore.settings` is `null`. During this window, `useUnits()` falls back to `METRIC`. Since the app is an SPA and the initial HTML is empty, there's no visible content to mis-unit before the store hydrates.

### Unauthenticated pages

Login, register, forgot password, etc. never display weights. `useUnits()` returns metric defaults if called on these pages — harmless.

### Switching units mid-workout

If a user changes preference while an active session is in progress:
- In-memory `form.weight` values in open set rows are in the **old** unit.
- The watcher on `useUnits().unitPreference` re-converts open form values: `form.weight = convertDisplayWeight(form.weight, oldUnit, newUnit)`.
- Any debounced autosave pending from the old unit is flushed **before** the conversion swap.
- This is rare but must be handled to avoid data corruption.

### Partial sets (only reps, no weight)

`REPS_ONLY` tracking type has no weight column — conversion is a no-op. `MAX_REPS` PR values are unit-agnostic.

### Zero and null

`formatWeight(0)` returns `-` (existing behavior for "no data" — consistent with the session detail volume stat). `null` weights are rendered as `-`.

---

## Testing Strategy

### Unit tests (`useUnits` composable)

- `formatWeight(100, metric) === '100 kg'`
- `formatWeight(100, imperial) === '220.5 lbs'`
- `parseWeightInput(225, imperial) === 102.06`
- `formatHeight(180, imperial) === "5' 11\""`
- Round-trip: `formatWeight(parseWeightInput(x, imperial), imperial)` equals `formatWeight(x, imperial)` for x ∈ {45, 100, 135, 225, 315, 405}
- Volume: `formatVolume(12340, imperial) === '27,205 lbs'`
- Null user → metric defaults

### Integration tests (Vitest + Vue Test Utils)

- Mount `SessionSetRow` with an imperial auth store, type `225`, trigger autosave, assert the `updateSet` call payload contains `weight: 102.06`.
- Mount `SessionSetRow` with a metric store populated from a kg value, flip the store to imperial, assert the form value re-converts to display lbs.

### Manual QA checklist

1. Log in with METRIC preference. Log three sets across a session. Values display and save correctly.
2. Change to IMPERIAL in settings. Navigate to the same session. Values display in lbs. Column headers read "Weight (lbs)". No layout breaks.
3. Start a new workout in IMPERIAL. Type `225` / `5`. Complete the set. Reload. The set should still display `225 lbs` (not `224.9` or `225.1`).
4. Flip back to METRIC. The same set should display `102.06 kg`.
5. Profile edit modal: enter body weight `180 lbs` and height `5' 11"`. Save. Reload. Values persist. Flip to METRIC — should show `81.6 kg` and `180 cm`.
6. Trainer athlete detail page in IMPERIAL: PRs, volume, and athlete body metrics all in lbs.
7. Exercise stats chart: tooltips and y-axis in the correct unit.

---

## Out of Scope for Initial Implementation

- **Plate-rounding snap on prefill.** When prefilling a set from the last one, we could snap to the nearest plate increment (2.5 kg metric, 2.5 lb imperial). Deferred until users request.
- **Distance display in session history.** No distance-based exercises are currently visible in history UI.
- **Per-athlete unit override for trainers.** Trainer's preference always wins.
- **Migrating historical weight values** — all stored values stay in kg; only the display layer changes.
