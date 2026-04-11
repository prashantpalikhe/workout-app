import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import { apiAs } from '../../helpers/api'

test.describe('Programs', () => {
  test('create a new program via API and verify in list', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Create program via API (avoids fragile desktop/mobile button detection)
    const program = await apiAs<{ id: string, name: string }>(
      user.tokens.accessToken,
      '/programs',
      { method: 'POST', body: JSON.stringify({ name: 'E2E Test Program' }) }
    )

    await page.goto('/programs')
    await expect(page.getByText('E2E Test Program').first()).toBeVisible()

    // Navigate to detail
    await page.getByText('E2E Test Program').first().click()
    await expect(page).toHaveURL(`/programs/${program.id}`, { timeout: 10000 })
  })

  test('view program detail page', async ({ page }) => {
    const user = await loginAsNewUser(page)

    const program = await apiAs<{ id: string }>(
      user.tokens.accessToken,
      '/programs',
      { method: 'POST', body: JSON.stringify({ name: 'Detail Test Program' }) }
    )

    await page.goto(`/programs/${program.id}`)
    await expect(page).toHaveURL(`/programs/${program.id}`)
    await expect(page.getByText(/no exercises/i)).toBeVisible()
  })
})
