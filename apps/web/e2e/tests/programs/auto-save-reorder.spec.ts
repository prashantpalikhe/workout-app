import { test, expect, type Page } from '@playwright/test'
import { loginAsNewUser } from '../../helpers/auth'
import { apiAs, fetchExercises, addProgramExercise } from '../../helpers/api'

test.describe('Program Auto-Save & Reorder', () => {
  async function setupProgramWithExercises(page: Page) {
    const user = await loginAsNewUser(page)
    const token = user.tokens.accessToken

    // Create a program
    const program = await apiAs<{ id: string }>(token, '/programs', {
      method: 'POST',
      body: JSON.stringify({ name: 'E2E Reorder Program' })
    })

    // Add 3 exercises
    const exercises = await fetchExercises(token)
    const bench = exercises.data.find(e => e.name === 'Barbell Bench Press')!
    const squat = exercises.data.find(e => e.name === 'Barbell Squat')!
    const deadlift = exercises.data.find(e => e.name === 'Barbell Deadlift')!

    await addProgramExercise(token, program.id, bench.id)
    await addProgramExercise(token, program.id, squat.id)
    await addProgramExercise(token, program.id, deadlift.id)

    return { user, program, exerciseNames: ['Barbell Bench Press', 'Barbell Squat', 'Barbell Deadlift'] }
  }

  test('editing program exercise targets persists after reload', async ({ page }) => {
    const { program } = await setupProgramWithExercises(page)

    await page.goto(`/programs/${program.id}`)
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // Expand the first exercise card
    await page.getByText('Barbell Bench Press').click()

    // Fill in targets
    await page.getByLabel('Sets').fill('4')
    await page.getByLabel('Reps').fill('8-12')
    await page.getByLabel('Sets').blur() // Trigger auto-save
    await page.getByLabel('Reps').blur()

    // Wait for auto-save
    await page.waitForTimeout(1500)

    // Reload and verify
    await page.reload()
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // The summary should show the targets
    await expect(page.getByText('4 × 8-12')).toBeVisible()
  })

  test('rapid target edits persist the last value', async ({ page }) => {
    const { program } = await setupProgramWithExercises(page)

    await page.goto(`/programs/${program.id}`)
    await page.getByText('Barbell Bench Press').click()

    // Rapidly change sets: 3 → 4 → 5
    const setsInput = page.getByLabel('Sets')
    await setsInput.fill('3')
    await setsInput.blur()
    await page.waitForTimeout(100)
    await setsInput.fill('4')
    await setsInput.blur()
    await page.waitForTimeout(100)
    await setsInput.fill('5')
    await setsInput.blur()

    // Wait for final save
    await page.waitForTimeout(1500)

    // Reload and verify last value won
    await page.reload()
    await page.getByText('Barbell Bench Press').click()
    const value = await page.getByLabel('Sets').inputValue()
    expect(value).toBe('5')
  })

  test('exercises display in correct order on page load', async ({ page }) => {
    const { program, exerciseNames } = await setupProgramWithExercises(page)

    await page.goto(`/programs/${program.id}`)

    // Verify all 3 exercises are visible
    for (const name of exerciseNames) {
      await expect(page.getByText(name).first()).toBeVisible()
    }

    // Verify order: get all exercise name elements
    const names = await page.locator('.font-medium').allTextContents()
    const exerciseOrder = names.filter(n => exerciseNames.includes(n))
    expect(exerciseOrder).toEqual(exerciseNames)
  })

  test('reorder exercises via drag and drop persists after reload', async ({ page }) => {
    const { program } = await setupProgramWithExercises(page)

    await page.goto(`/programs/${program.id}`)
    await expect(page.getByText('Barbell Bench Press')).toBeVisible()

    // Get the drag handles
    const dragHandles = page.locator('.drag-handle')
    await expect(dragHandles).toHaveCount(3)

    // Drag the first exercise (Bench Press) below the second (Squat)
    const firstHandle = dragHandles.nth(0)
    const secondHandle = dragHandles.nth(1)

    const firstBox = await firstHandle.boundingBox()
    const secondBox = await secondHandle.boundingBox()

    if (firstBox && secondBox) {
      // Drag from center of first to center of second + some offset
      await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(
        secondBox.x + secondBox.width / 2,
        secondBox.y + secondBox.height + 10,
        { steps: 10 }
      )
      await page.mouse.up()
    }

    // Wait for reorder API call
    await page.waitForTimeout(1500)

    // Reload and verify new order
    await page.reload()
    await expect(page.getByText('Barbell Squat')).toBeVisible()

    const names = await page.locator('.font-medium').allTextContents()
    const exerciseOrder = names.filter(n =>
      ['Barbell Bench Press', 'Barbell Squat', 'Barbell Deadlift'].includes(n)
    )
    // Bench should now be after Squat
    expect(exerciseOrder[0]).toBe('Barbell Squat')
    expect(exerciseOrder[1]).toBe('Barbell Bench Press')
    expect(exerciseOrder[2]).toBe('Barbell Deadlift')
  })
})
