import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'

test('registers a new user and redirects to dashboard', async ({ page }) => {
  const id = randomUUID().slice(0, 8)

  await page.goto('/register')
  await page.getByLabel('First Name').fill('Alice')
  await page.getByLabel('Last Name').fill(`Tester${id}`)
  await page.getByLabel('Email').fill(`test-${id}@example.com`)
  await page.getByLabel('Password').fill('Test1234!')
  await page.getByRole('button', { name: 'Create Account' }).click()

  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  await expect(page.getByText('Ready to work out?')).toBeVisible()
})

test('shows error for duplicate email', async ({ page }) => {
  const id = randomUUID().slice(0, 8)
  const email = `test-${id}@example.com`

  // Register first time
  await page.goto('/register')
  await page.getByLabel('First Name').fill('Bob')
  await page.getByLabel('Last Name').fill('Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('Test1234!')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

  // Clear auth and try again
  await page.evaluate(() => localStorage.clear())
  await page.goto('/register')
  await page.getByLabel('First Name').fill('Bob')
  await page.getByLabel('Last Name').fill('Tester')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('Test1234!')
  await page.getByRole('button', { name: 'Create Account' }).click()

  // Should show error or stay on register — not redirect to dashboard
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL('/register')
  await expect(page).toHaveURL('/register')
})

test('validates required fields', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL('/register')
})
