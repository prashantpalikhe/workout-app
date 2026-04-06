import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import { fetchExercises, startSession, addSessionExercise, addSessionSet } from '../../helpers/api'

async function setupSessionWithSet(page: Page) {
  const user = await loginAsNewUser(page)
  const token = user.tokens.accessToken
  const exercises = await fetchExercises(token)
  const bench = exercises.data.find(e => e.name === 'Barbell Bench Press')!
  const session = (await startSession(token, 'Auto-Save Test')) as { id: string }
  const se = (await addSessionExercise(token, session.id, bench.id)) as { id: string }
  await addSessionSet(token, session.id, se.id, { setNumber: 1 })
  return { user, session, sessionExercise: se }
}

// Use getByRole to target only visible/accessible inputs (skips hidden mobile duplicates)
function kgInput(page: Page, nth = 0) {
  return page.getByRole('textbox', { name: 'kg' }).nth(nth)
}

function repsInput(page: Page, nth = 0) {
  return page.getByRole('textbox', { name: 'Reps' }).nth(nth)
}

test.describe('Session Auto-Save', () => {
  test('rapid edits persist correctly after debounce and page reload', async ({ page }) => {
    await setupSessionWithSet(page)

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    const weight = kgInput(page)
    await weight.fill('60')
    await weight.blur()

    // Change to 80 before the 400ms debounce fires
    await page.waitForTimeout(100)
    await weight.fill('80')
    await weight.blur()

    // Wait for debounce + API
    await page.waitForTimeout(1500)

    // Reload and verify the last value persisted
    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    expect(await kgInput(page).inputValue()).toBe('80')
  })

  test('editing weight then reps quickly preserves both values', async ({ page }) => {
    await setupSessionWithSet(page)

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    await kgInput(page).fill('100')
    await kgInput(page).blur()
    // Immediately edit reps without waiting for debounce
    await repsInput(page).fill('5')
    await repsInput(page).blur()

    await page.waitForTimeout(1500)

    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    expect(await kgInput(page).inputValue()).toBe('100')
    expect(await repsInput(page).inputValue()).toBe('5')
  })

  test('completing a set preserves all field values', async ({ page }) => {
    await setupSessionWithSet(page)

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    await kgInput(page).fill('70')
    await repsInput(page).fill('12')

    // Complete the set (sends all form data immediately)
    await page.getByRole('button', { name: /mark complete/i }).first().click()

    await page.waitForTimeout(1000)

    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()
    expect(await kgInput(page).inputValue()).toBe('70')
    expect(await repsInput(page).inputValue()).toBe('12')
  })

  test('adding a set then editing it persists correctly', async ({ page }) => {
    await setupSessionWithSet(page)

    await page.goto('/sessions/active')
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // Fill first set
    await kgInput(page, 0).fill('60')
    await repsInput(page, 0).fill('10')
    await repsInput(page, 0).blur()

    // Add another set
    await page.getByRole('button', { name: 'Add Set' }).click()
    await page.waitForTimeout(500)

    // Fill second set
    await kgInput(page, 1).fill('65')
    await repsInput(page, 1).fill('8')
    await repsInput(page, 1).blur()

    await page.waitForTimeout(1500)

    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    expect(await kgInput(page, 0).inputValue()).toBe('60')
    expect(await repsInput(page, 0).inputValue()).toBe('10')
    expect(await kgInput(page, 1).inputValue()).toBe('65')
    expect(await repsInput(page, 1).inputValue()).toBe('8')
  })
})
