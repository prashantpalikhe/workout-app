import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import {
  apiAs,
  fetchExercises,
  startSession,
  addSessionExercise,
  addSessionSet
} from '../../helpers/api'

/**
 * Data-correctness test for metric/imperial unit conversion in the active
 * workout hot path. The invariant: when an imperial-preferring user types
 * a weight in lbs and saves, the database must contain the equivalent kg.
 * The round-trip (type → save → reload) must display the same number back.
 */
test.describe('Imperial set logging', () => {
  test('logs a weight in lbs, stores kg, round-trips cleanly', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Flip the preference to imperial via the settings API.
    await apiAs(user.tokens.accessToken, '/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ unitPreference: 'IMPERIAL' })
    })

    // Seed a session with an exercise and an empty set.
    const exercises = await fetchExercises(user.tokens.accessToken)
    const benchPress = exercises.data.find(e => e.name === 'Barbell Bench Press')!
    const session = (await startSession(user.tokens.accessToken, 'Imperial Bench')) as { id: string }
    const se = (await addSessionExercise(user.tokens.accessToken, session.id, benchPress.id)) as { id: string }
    const set = (await addSessionSet(
      user.tokens.accessToken,
      session.id,
      se.id,
      { setNumber: 1 }
    )) as { id: string }

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // Input's accessible name comes from its placeholder, which is now `weightUnit`.
    // In imperial mode the placeholder reads "lbs".
    const weightInput = page.getByRole('textbox', { name: 'lbs' })
    await expect(weightInput).toBeVisible()

    // Type 225 lbs and blur to trigger autosave.
    await weightInput.fill('225')
    await page.getByRole('textbox', { name: 'Reps' }).fill('5')
    await page.getByRole('textbox', { name: 'Reps' }).blur()

    // Give the 400ms autosave debounce time to fire + round-trip.
    await page.waitForTimeout(900)

    // ── ASSERT 1: the DB has the converted kg value (not the raw 225 lbs). ──
    const storedSession = (await apiAs(
      user.tokens.accessToken,
      `/sessions/${session.id}`
    )) as { sessionExercises: Array<{ sets: Array<{ id: string, weight: number | null, reps: number | null }> }> }
    const storedSet = storedSession.sessionExercises[0].sets.find(s => s.id === set.id)!
    expect(storedSet.weight).not.toBeNull()
    // 225 lb -> 102.06 kg (via shared lbToKg, rounded to 2dp)
    expect(storedSet.weight).toBeCloseTo(102.06, 2)
    expect(storedSet.reps).toBe(5)

    // ── ASSERT 2: reloading the page still shows 225 lbs, not 224.9. ──
    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    const reloadedWeightInput = page.getByRole('textbox', { name: 'lbs' })
    // The displayed value after round-trip must equal what the user typed.
    await expect(reloadedWeightInput).toHaveValue('225')

    // ── ASSERT 3: flipping back to metric shows the stored kg value. ──
    await apiAs(user.tokens.accessToken, '/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ unitPreference: 'METRIC' })
    })
    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    const metricInput = page.getByRole('textbox', { name: 'kg' })
    // 102.06 kg rounded to 1 decimal for display = 102.1
    await expect(metricInput).toHaveValue('102.1')
  })

  test('metric user keeps hardcoded kg behavior', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Seed with an existing set in kg (bypassing the UI).
    const exercises = await fetchExercises(user.tokens.accessToken)
    const benchPress = exercises.data.find(e => e.name === 'Barbell Bench Press')!
    const session = (await startSession(user.tokens.accessToken, 'Metric Bench')) as { id: string }
    const se = (await addSessionExercise(user.tokens.accessToken, session.id, benchPress.id)) as { id: string }
    await addSessionSet(
      user.tokens.accessToken,
      session.id,
      se.id,
      { setNumber: 1, weight: 100, reps: 5 }
    )

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    const weightInput = page.getByRole('textbox', { name: 'kg' })
    await expect(weightInput).toHaveValue('100')
  })
})
