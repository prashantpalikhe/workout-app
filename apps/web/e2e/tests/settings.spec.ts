import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'

test.describe('Settings', () => {
  test('loads settings page with preferences', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/settings')

    await expect(page).toHaveURL('/settings')
    // These labels are inside cards, visible on all viewports
    await expect(page.getByText(/units/i).first()).toBeVisible()
    await expect(page.getByText(/rest timer/i).first()).toBeVisible()
  })

  test('displays user email in account section', async ({ page }) => {
    const user = await loginAsNewUser(page)
    await page.goto('/settings')

    await expect(page.getByText(user.email)).toBeVisible()
  })
})
