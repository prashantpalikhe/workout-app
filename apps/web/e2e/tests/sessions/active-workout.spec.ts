import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import { fetchExercises, startSession, addSessionExercise, addSessionSet } from '../../helpers/api'

test.describe('Active Workout', () => {
  test('start freestyle workout from dashboard', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/dashboard')

    // Wait for the dashboard to load with the workout card
    await expect(page.getByText('Ready to work out?')).toBeVisible()

    // The "Start" button is inside a UFieldGroup with a dropdown sibling.
    // Use exact match to avoid hitting the dropdown trigger.
    await page.getByRole('button', { name: 'Start', exact: true }).first().click()

    await expect(page).toHaveURL('/sessions/active', { timeout: 10000 })
  })

  test('add exercise, log a set, and complete workout', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Seed a session with an exercise and set via API
    const exercises = await fetchExercises(user.tokens.accessToken)
    const benchPress = exercises.data.find(e => e.name === 'Barbell Bench Press')!

    const session = (await startSession(user.tokens.accessToken, 'E2E Bench Day')) as { id: string }
    const se = (await addSessionExercise(user.tokens.accessToken, session.id, benchPress.id)) as { id: string }
    await addSessionSet(user.tokens.accessToken, session.id, se.id, { setNumber: 1 })

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // Fill weight and reps using role-based selectors (skips hidden mobile duplicates)
    await page.getByRole('textbox', { name: 'kg' }).fill('60')
    await page.getByRole('textbox', { name: 'Reps' }).fill('10')

    // Complete the set
    await page.getByRole('button', { name: /mark complete/i }).first().click()

    // Wait for the set to be marked complete
    await page.waitForTimeout(500)

    // Click Finish
    await page.getByRole('button', { name: 'Finish' }).first().click()

    // Confirm in the modal
    await page.getByRole('button', { name: 'Complete Workout' }).click()

    // Should redirect to session detail
    await expect(page).toHaveURL(/\/sessions\/[a-f0-9-]+/, { timeout: 10000 })
    await expect(page.getByText('E2E Bench Day').first()).toBeVisible({ timeout: 10000 })
  })

  test('resume active workout from dashboard', async ({ page }) => {
    const user = await loginAsNewUser(page)
    await startSession(user.tokens.accessToken, 'Resume Test')

    await page.goto('/dashboard')
    await expect(page.getByText('Active Workout')).toBeVisible()

    await page.getByRole('button', { name: 'Resume' }).click()
    await expect(page).toHaveURL('/sessions/active', { timeout: 10000 })
  })
})
