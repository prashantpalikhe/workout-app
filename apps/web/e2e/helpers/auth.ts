import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'

const API_BASE = 'http://localhost:3002/api'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
  tokens: AuthTokens
  userId: string
}

/** Register a unique user via the API and return credentials + tokens. */
export async function createTestUser(
  overrides?: Partial<{ firstName: string, lastName: string }>
): Promise<TestUser> {
  const id = randomUUID().slice(0, 8)
  const email = `test-${id}@example.com`
  const password = 'Test1234!'
  const firstName = overrides?.firstName ?? 'Test'
  const lastName = overrides?.lastName ?? `User${id}`

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName })
  })

  if (!res.ok) {
    throw new Error(`Register failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  return {
    email,
    password,
    firstName,
    lastName,
    tokens: data.tokens,
    userId: data.user.id
  }
}

/**
 * Create a test user via API, then inject auth tokens into the page's
 * localStorage so subsequent navigations are authenticated.
 */
export async function loginAsNewUser(page: Page): Promise<TestUser> {
  const user = await createTestUser()

  // Navigate to origin so localStorage is scoped to the correct domain
  await page.goto('/')
  await page.evaluate(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
    },
    user.tokens
  )

  return user
}
