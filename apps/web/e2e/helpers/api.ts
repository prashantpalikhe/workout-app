const API_BASE = 'http://localhost:3002/api'

/** Make an authenticated API request. */
export async function apiAs<T = unknown>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  })

  if (!res.ok) {
    throw new Error(`API ${options.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`)
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as T
  return res.json()
}

/** Create a program via API. */
export async function createProgram(token: string, name: string) {
  return apiAs(token, '/programs', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
}

/** Add an exercise to a program via API. */
export async function addProgramExercise(
  token: string,
  programId: string,
  exerciseId: string
) {
  return apiAs(token, `/programs/${programId}/exercises`, {
    method: 'POST',
    body: JSON.stringify({ exerciseId })
  })
}

/** Start a freestyle workout session via API. */
export async function startSession(token: string, name?: string) {
  return apiAs(token, '/sessions/start', {
    method: 'POST',
    body: JSON.stringify({ name: name ?? 'E2E Test Workout' })
  })
}

/** Add an exercise to a session via API. */
export async function addSessionExercise(
  token: string,
  sessionId: string,
  exerciseId: string
) {
  return apiAs(token, `/sessions/${sessionId}/exercises`, {
    method: 'POST',
    body: JSON.stringify({ exerciseId })
  })
}

/** Add a set to a session exercise via API. */
export async function addSessionSet(
  token: string,
  sessionId: string,
  exerciseId: string,
  data: { setNumber: number, weight?: number, reps?: number, completed?: boolean }
) {
  return apiAs(
    token,
    `/sessions/${sessionId}/exercises/${exerciseId}/sets`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )
}

/** Complete a session via API. */
export async function completeSession(token: string, sessionId: string) {
  return apiAs(token, `/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

/** Fetch exercises from API (for getting IDs). */
export async function fetchExercises(token: string) {
  return apiAs<{ data: Array<{ id: string, name: string }> }>(
    token,
    '/exercises?limit=50'
  )
}
