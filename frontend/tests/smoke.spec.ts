import { test, expect } from '@playwright/test'

test('candidates list loads', async ({ page }) => {
  await page.goto('/')
  await page.goto('/candidates')
  await expect(page.getByText('Candidates')).toBeVisible()
})

