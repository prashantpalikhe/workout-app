import { test, expect } from '@playwright/test'
import { createTestUser } from '../../helpers/auth'

test('logs in with valid credentials and shows dashboard', async ({ page }) => {
  const user = await createTestUser({ firstName: 'Charlie' })

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  // Verify dashboard loaded — "Ready to work out?" is viewport-independent
  await expect(page.getByText('Ready to work out?')).toBeVisible()
})

test('shows error for wrong password', async ({ page }) => {
  const user = await createTestUser()

  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('WrongPassword1!')
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  await expect(page).toHaveURL('/login')
})

test('navigates to register page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Sign up' }).click()
  await expect(page).toHaveURL('/register')
})

test('navigates to forgot password page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page).toHaveURL('/forgot-password')
})
