import { test, expect } from '@playwright/test'
import path from 'path'

/**
 * E2E tests for the trading card submission flow.
 *
 * Prerequisites:
 * - For production tests: Use playwright.prod.config.ts
 * - For local development: Backend running (AWS_PROFILE=prod npx sst dev)
 * - Test image available at ~/Desktop/IMG_7946.jpeg (or update path)
 */

const TEST_IMAGE_PATH = path.join(
  process.env.HOME || '',
  'Desktop',
  'IMG_7946.jpeg'
)

// Increase timeout for E2E tests
test.setTimeout(90000)

test.describe('Submit Card Flow', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Navigate to the app - React will read localStorage here
    await page.goto(baseURL || '/')

    // Immediately clear localStorage (before waiting for app to fully load)
    await page.evaluate(() => {
      localStorage.removeItem('trading-card-draft')
    })

    // Reload to ensure clean state - React will now read empty localStorage
    await page.reload()

    // Wait for the app to load with clean state
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 })
  })

  test('should complete player card submission', async ({ page }) => {
    // Wait for tournament select to be populated
    const tournamentSelect = page.locator('select').first()
    await expect(tournamentSelect).toBeVisible({ timeout: 10000 })

    // Select first available tournament (skip the placeholder option)
    await tournamentSelect.selectOption({ index: 1 })

    // Click continue
    await page.getByRole('button', { name: /continue/i }).click()

    // Wait for card type select
    const cardTypeSelect = page.locator('select').filter({ hasText: /select type/i })
    await expect(cardTypeSelect).toBeVisible({ timeout: 5000 })

    // Select "Player" card type
    await cardTypeSelect.selectOption('player')

    // Upload a photo using file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for cropper to appear (indicates photo loaded)
    await expect(page.getByTestId('container')).toBeVisible({
      timeout: 30000,
    })

    // Fill out required fields using actual placeholders from the app
    // First name (placeholder="Brandon")
    await page.locator('input[placeholder="Brandon"]').fill('Test')

    // Last name (placeholder="Williams")
    await page.locator('input[placeholder="Williams"]').fill('Player')

    // Team - find select with "Select team" option and select first real team
    const teamSelect = page.locator('select').filter({ has: page.locator('option:has-text("Select team")') })
    await expect(teamSelect).toBeVisible({ timeout: 5000 })
    // Select the second option (index 1) which is the first real team
    await teamSelect.selectOption({ index: 1 })

    // Position - find select with position options
    const positionSelect = page.locator('select').filter({ has: page.locator('option:has-text("Keeper")') })
    if (await positionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await positionSelect.selectOption({ index: 1 })
    }

    // Jersey number (placeholder="15") - optional
    await page.locator('input[placeholder="15"]').fill('7').catch(() => {})

    // Photographer credit (placeholder="Photographer name")
    await page.locator('input[placeholder="Photographer name"]').fill('Test Photographer')

    // Wait for form to be ready
    await expect(page.getByText(/ready to create|draft saved/i).first()).toBeVisible({ timeout: 15000 })

    // Wait for auto-save to complete
    await page.waitForTimeout(3000)

    // Find and click Submit Card button (specifically the one in the form, not the step indicator)
    const submitButton = page.getByRole('button', { name: 'Submit Card' }).first()
    await expect(submitButton).toBeEnabled({ timeout: 10000 })
    await submitButton.click()

    // Handle confirmation if present
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i }).first()
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click()
    }

    // Wait for success - should see download link or success message
    await expect(
      page.getByText(/success|download|submitted|your card/i).first()
    ).toBeVisible({ timeout: 60000 })
  })

  test('should handle rare card flow', async ({ page }) => {
    // Select tournament
    const tournamentSelect = page.locator('select').first()
    await expect(tournamentSelect).toBeVisible({ timeout: 10000 })
    await tournamentSelect.selectOption({ index: 1 })
    await page.getByRole('button', { name: /continue/i }).click()

    // Select rare card type
    const cardTypeSelect = page.locator('select').filter({ hasText: /select type/i })
    await expect(cardTypeSelect).toBeVisible({ timeout: 5000 })
    await cardTypeSelect.selectOption('rare')

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for cropper
    await expect(page.getByTestId('container')).toBeVisible({
      timeout: 30000,
    })

    // For rare cards, fill Title (placeholder="Championship MVP")
    await page.locator('input[placeholder="Championship MVP"]').fill('Test Rare Card')

    // Photographer credit (placeholder="Photographer name")
    await page.locator('input[placeholder="Photographer name"]').fill('Rare Card Photographer')

    // Wait for form to be ready
    await expect(page.getByText(/ready to create|draft saved/i).first()).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(3000)

    // Submit - use specific button name
    const submitButton = page.getByRole('button', { name: 'Submit Card' }).first()
    await expect(submitButton).toBeEnabled({ timeout: 10000 })
    await submitButton.click()

    // Handle confirmation
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i }).first()
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click()
    }

    // Wait for success
    await expect(
      page.getByText(/success|download|submitted/i).first()
    ).toBeVisible({ timeout: 60000 })
  })

  // This test intentionally runs last since it leaves a draft in localStorage
  test('should resume draft after page refresh', async ({ page, baseURL }) => {
    // Select tournament
    const tournamentSelect = page.locator('select').first()
    await expect(tournamentSelect).toBeVisible({ timeout: 10000 })
    await tournamentSelect.selectOption({ index: 1 })
    await page.getByRole('button', { name: /continue/i }).click()

    // Wait for card type select and select Player
    const cardTypeSelect = page.locator('select').filter({ hasText: /select type/i })
    await expect(cardTypeSelect).toBeVisible({ timeout: 5000 })
    await cardTypeSelect.selectOption('player')

    // Upload photo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(TEST_IMAGE_PATH)

    // Wait for cropper to appear (indicates photo loaded)
    await expect(page.getByTestId('container')).toBeVisible({
      timeout: 30000,
    })

    // Fill some unique values we can verify after refresh
    await page.locator('input[placeholder="Brandon"]').fill('ResumeTest')
    await page.locator('input[placeholder="Williams"]').fill('LastName')

    // Select a team (required field)
    const teamSelect = page.locator('select').filter({ has: page.locator('option:has-text("Select team")') })
    await expect(teamSelect).toBeVisible({ timeout: 5000 })
    await teamSelect.selectOption({ index: 1 })

    // Select position (required field)
    const positionSelect = page.locator('select').filter({ has: page.locator('option:has-text("Keeper")') })
    if (await positionSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await positionSelect.selectOption({ index: 1 })
    }

    // Fill photographer
    await page.locator('input[placeholder="Photographer name"]').fill('Resume Photo Credit')

    // Wait for form to be ready and auto-save to complete
    await expect(page.getByText(/draft saved/i)).toBeVisible({ timeout: 15000 })

    // Refresh the page
    await page.reload()

    // Should see resume modal
    await expect(page.getByText(/resume your draft/i)).toBeVisible({
      timeout: 10000,
    })

    // Click Resume Draft button
    await page.getByRole('button', { name: /resume draft/i }).click()

    // Verify data was restored - check first name
    await expect(page.locator('input[placeholder="Brandon"]').first()).toHaveValue(
      'ResumeTest',
      { timeout: 10000 }
    )

    // Verify cropper is visible (photo restored)
    await expect(page.getByTestId('container')).toBeVisible({ timeout: 15000 })
  })
})
