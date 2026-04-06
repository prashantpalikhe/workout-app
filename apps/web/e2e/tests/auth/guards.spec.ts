import { test, expect } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'

test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/login', { timeout: 10000 })
})

test('unauthenticated user is redirected from /sessions to /login', async ({ page }) => {
  await page.goto('/sessions')
  await expect(page).toHaveURL('/login', { timeout: 10000 })
})

test('unauthenticated user is redirected from /programs to /login', async ({ page }) => {
  await page.goto('/programs')
  await expect(page).toHaveURL('/login', { timeout: 10000 })
})

test('authenticated user on /login is redirected to /dashboard', async ({ page }) => {
  await loginAsNewUser(page)
  await page.goto('/login')
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
})

test('authenticated user on / is redirected to /dashboard', async ({ page }) => {
  await loginAsNewUser(page)
  await page.goto('/')
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
})

test('authenticated user on /register is redirected to /dashboard', async ({ page }) => {
  await loginAsNewUser(page)
  await page.goto('/register')
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
})
