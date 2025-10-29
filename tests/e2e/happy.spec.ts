import { test } from '@playwright/test'
import { mockAllNetwork } from './mocks'
import { gotoInterviewee, uploadSampleResume, completeGatingIfNeeded, answerQuestion } from './utils'

test.beforeEach(async ({ page }) => {
  await mockAllNetwork(page)
})

test('complete interview happy path', async ({ page }) => {
  await gotoInterviewee(page)
  await uploadSampleResume(page)
  await page.getByText('Test User').waitFor({ timeout: 10000 })
  await completeGatingIfNeeded(page)
  await page.locator('[data-testid="question-runner-root"]').waitFor({ timeout: 20000 })
  for (let i = 1; i <= 6; i++) {
    await page.locator(`[data-testid="question-card-${i}"]`).waitFor({ timeout: 20000 })
    await answerQuestion(page, `A${i}`)
  }
  await page.locator('[data-testid="final-summary"]').waitFor({ timeout: 20000 })
})
