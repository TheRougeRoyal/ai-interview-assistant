import { Page, expect } from '@playwright/test'

export async function gotoInterviewee(page: Page) {
  await page.goto('/interviewee')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('[data-testid="interviewee-root"]', { timeout: 10000 })
}

export async function waitForGatingOrInterview(page: Page) {
  const gatingCard = page.locator('[data-testid="gating-card"]')
  const questionRunner = page.locator('[data-testid="question-runner"]')
  const timeoutMs = 15000
  const pollInterval = 200
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await questionRunner.first().isVisible().catch(() => false)) return 'interview'
    if (await gatingCard.first().isVisible().catch(() => false)) return 'gating'
    await page.waitForTimeout(pollInterval)
  }
  await page.screenshot({ path: 'test-results/debug-page.png', fullPage: true })
  return 'unknown'
}

export async function fillGateField(page: Page, field: 'name'|'email'|'phone', value: string): Promise<boolean> {
  const input = page.locator(`[data-testid="gating-input-${field}"]`)
  try { await input.waitFor({ state: 'visible', timeout: 7000 }) } catch { return false }
  await input.fill(value)
  const continueButton = page.locator('[data-testid="gating-continue"]')
  await expect(continueButton).toBeEnabled({ timeout: 3000 })
  await continueButton.click()
  await page.waitForTimeout(150)
  return true
}

export async function answerQuestion(page: Page, answer: string = 'Test answer') {
  const textarea = page.locator('[data-testid="answer-textarea"]')
  await textarea.waitFor({ state: 'visible', timeout: 10000 })
  await textarea.fill(answer)
  const submit = page.locator('[data-testid="submit-answer"]')
  if (await submit.isEnabled()) await submit.click()
}

export async function waitForRubric(page: Page) {
  await expect(page.locator('text=Total:')).toBeVisible({ timeout: 20000 })
}

export async function skipToEnd(page: Page, fromQuestion: number = 3) {
  for (let i = fromQuestion; i <= 6; i++) {
    await answerQuestion(page, `Auto answer ${i}`)
    if (i < 6) {
      await waitForRubric(page)
      await expect(page.locator(`[data-testid="question-card-${i + 1}"]`)).toBeVisible({ timeout: 15000 })
    }
  }
}

export async function uploadSampleResume(page: Page) {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('public/samples/sample.pdf')
}

export async function completeGatingIfNeeded(page: Page) {
  const gatingCard = page.locator('[data-testid="gating-card"]')
  if (await gatingCard.isVisible({ timeout: 5000 }).catch(() => false)) {
    await fillGateField(page, 'name', 'Test User')
    await fillGateField(page, 'email', 'test@example.com')
    await fillGateField(page, 'phone', '+1234567890')
  }
}
