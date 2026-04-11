import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../helpers/auth'
import { apiAs } from '../helpers/api'

/**
 * Regression: opening the profile edit modal in imperial mode and saving an
 * unrelated field (bio) must NOT drift the stored body weight or height.
 *
 * Root cause of the original bug: the form held display-unit values which
 * were rounded on the way in, and unconditionally converted back to metric
 * on save. Typing nothing still drifted 80 kg → 176.4 lb → 80.01 kg and
 * 170 cm → 5'7" → 170.18 cm.
 *
 * Fixed by making the form hold kg/cm (source of truth) with computed
 * display bindings that only write back when the user actively types.
 */
test.describe('Profile body metrics — unit preference drift', () => {
  test('editing only bio in imperial mode leaves weight/height exactly as stored', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Seed the athlete profile with clean metric values.
    await apiAs(user.tokens.accessToken, '/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ weight: 80, height: 170, bio: 'original bio' })
    })

    // Switch to imperial.
    await apiAs(user.tokens.accessToken, '/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ unitPreference: 'IMPERIAL' })
    })

    // Wait for the profile fetch to resolve before opening the edit modal,
    // otherwise the modal populates from a null profile and saving nukes the
    // seeded values.
    await page.goto('/profile', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible()
    await page.getByRole('button', { name: /edit profile/i }).click()

    // The modal should show the seeded values converted to imperial display.
    // 80 kg → 176.4 lbs, 170 cm → 5 ft 7 in. Wait for those to populate before
    // touching anything — their presence confirms props.profile is hydrated.
    const weightInput = page.locator('input[type="number"]').first()
    await expect(weightInput).toHaveValue('176.4')
    const ftInput = page.locator('input[type="number"]').nth(1)
    const inInput = page.locator('input[type="number"]').nth(2)
    await expect(ftInput).toHaveValue('5')
    await expect(inInput).toHaveValue('7')

    // Change only the bio field.
    await page.getByRole('textbox', { name: /bio/i }).fill('new bio, nothing else touched')

    // Save.
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.waitForTimeout(700)

    // Verify the DB: weight and height must be unchanged.
    const profile = (await apiAs(
      user.tokens.accessToken,
      '/users/me/profile'
    )) as { weight: number | null, height: number | null, bio: string | null }

    expect(profile.weight).toBe(80)
    expect(profile.height).toBe(170)
    expect(profile.bio).toBe('new bio, nothing else touched')
  })

  test('editing the weight field in imperial mode persists the converted kg', async ({ page }) => {
    const user = await loginAsNewUser(page)

    // Seed in imperial mode from the start.
    await apiAs(user.tokens.accessToken, '/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify({ unitPreference: 'IMPERIAL' })
    })

    await page.goto('/profile')
    await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible()
    await page.getByRole('button', { name: /edit profile/i }).click()

    // Wait for the modal to render before typing.
    const weightInput = page.locator('input[type="number"]').first()
    await expect(weightInput).toBeVisible()

    // Type 180 lbs into the weight field.
    await weightInput.fill('180')

    await page.getByRole('button', { name: 'Save Changes' }).click()
    await page.waitForTimeout(700)

    const profile = (await apiAs(
      user.tokens.accessToken,
      '/users/me/profile'
    )) as { weight: number | null }

    // 180 lb → 81.65 kg via shared lbToKg helper (2-decimal rounding).
    expect(profile.weight).toBeCloseTo(81.65, 2)
  })
})
