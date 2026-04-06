import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'

test.describe('Exercises', () => {
  test('shows seeded exercises in the list', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/exercises')

    // Verify seeded exercises are visible
    await expect(page.getByText('Barbell Bench Press').first()).toBeVisible()
    await expect(page.getByText('Barbell Squat').first()).toBeVisible()
    await expect(page.getByText('Barbell Deadlift').first()).toBeVisible()
  })

  test('navigates to exercise detail', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/exercises')

    // Click the first exercise row to navigate to detail
    await page.getByText('Barbell Bench Press').first().click()

    await expect(page).toHaveURL(/\/exercises\/[a-f0-9-]+/, { timeout: 10000 })
  })
})
