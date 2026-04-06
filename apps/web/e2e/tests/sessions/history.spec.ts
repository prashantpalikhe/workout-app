import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import {
  fetchExercises,
  startSession,
  addSessionExercise,
  addSessionSet,
  completeSession
} from '../../helpers/api'

test.describe('Session History', () => {
  test('shows completed session in history list', async ({ page }) => {
    const user = await loginAsNewUser(page)
    const token = user.tokens.accessToken

    // Seed a completed session via API
    const exercises = await fetchExercises(token)
    const squat = exercises.data.find(e => e.name === 'Barbell Squat')!
    const session = (await startSession(token, 'Leg Day E2E')) as { id: string }
    const se = (await addSessionExercise(token, session.id, squat.id)) as { id: string }
    await addSessionSet(token, session.id, se.id, {
      setNumber: 1,
      weight: 100,
      reps: 5,
      completed: true
    })
    await completeSession(token, session.id)

    // Navigate to sessions list
    await page.goto('/sessions')
    await expect(page.getByText('Leg Day E2E')).toBeVisible()
  })

  test('navigates to session detail and shows exercise data', async ({ page }) => {
    const user = await loginAsNewUser(page)
    const token = user.tokens.accessToken

    // Seed a completed session
    const exercises = await fetchExercises(token)
    const bench = exercises.data.find(e => e.name === 'Barbell Bench Press')!
    const session = (await startSession(token, 'Push Day Detail')) as { id: string }
    const se = (await addSessionExercise(token, session.id, bench.id)) as { id: string }
    await addSessionSet(token, session.id, se.id, {
      setNumber: 1,
      weight: 80,
      reps: 8,
      completed: true
    })
    await completeSession(token, session.id)

    // Navigate to detail
    await page.goto(`/sessions/${session.id}`)
    await expect(page).toHaveURL(`/sessions/${session.id}`)
    await expect(page.getByText('Barbell Bench Press').first()).toBeVisible()
  })
})
