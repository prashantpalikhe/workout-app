import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'

test('logs out and redirects to login page', async ({ page }) => {
  await loginAsNewUser(page)
  await page.goto('/dashboard')
  await expect(page.getByText('Ready to work out?')).toBeVisible()

  // On mobile, open the hamburger menu first to access sidebar navigation
  const menuButton = page.getByRole('button', { name: 'Open menu' })
  if (await menuButton.isVisible()) {
    await menuButton.click()
    await page.waitForTimeout(300) // Wait for sidebar animation
  }

  await page.getByRole('button', { name: 'Logout' }).click({ timeout: 10000 })

  await expect(page).toHaveURL('/login', { timeout: 10000 })

  const hasToken = await page.evaluate(() => !!localStorage.getItem('access_token'))
  expect(hasToken).toBe(false)
})
