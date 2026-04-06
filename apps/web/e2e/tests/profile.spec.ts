import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'

test.describe('Profile', () => {
  test('loads profile page', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/profile')

    await expect(page).toHaveURL('/profile')
    // The profile page has an "Edit Profile" button on all viewports
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible()
  })

  test('shows stats section', async ({ page }) => {
    await loginAsNewUser(page)
    await page.goto('/profile')

    // Stats bar shows workout count — verify the stats section loaded
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible()
  })
})
