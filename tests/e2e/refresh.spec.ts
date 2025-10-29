import { test, expect } from '@playwright/test'
import { gotoInterviewee, fillGateField, waitForGatingOrInterview } from './utils'
import { mockAllNetwork } from './mocks'

test.beforeEach(async ({ page }) => {
  await mockAllNetwork(page)
})

test('refresh mid-question preserves draft', async ({ page }) => {
  await gotoInterviewee(page)
  const state = await waitForGatingOrInterview(page)
  if (state === 'gating') {
    await fillGateField(page, 'name', 'Jane Smith')
    await fillGateField(page, 'email', 'jane.smith@example.com')
    await fillGateField(page, 'phone', '+1987654321')
  }
  await expect(page.locator('[data-testid="question-card-1"]')).toBeVisible({ timeout: 20000 })
  const textarea = page.locator('[data-testid="answer-textarea"]')
  await textarea.fill('Partial answer to be restored')
  await page.reload()
  await expect(page.locator('[data-testid="question-card-1"]')).toBeVisible({ timeout: 20000 })
  await expect(textarea).toHaveValue('Partial answer to be restored')
})
