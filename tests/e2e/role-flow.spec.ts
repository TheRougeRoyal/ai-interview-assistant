import { test, expect } from '@playwright/test'

test.describe('Role-based flows', () => {
  test('Interviewee signup and access interview', async ({ page }) => {
    // Skeleton: adapt selectors to your UI when enabling
    await page.goto('http://localhost:3000')
    await page.click('text=Create Account')
    await page.fill('select#role', 'interviewee')
    await page.fill('input#email', 'e2e-interviewee@example.com')
    await page.fill('input#password', 'password123')
    await page.fill('input#confirmPassword', 'password123')
    await page.click('text=Create Account')

    // After signup, should land on interviewee dashboard
    await expect(page).toHaveURL(/\/interviewee/)

    // Try to access interviewer route - should show access denied or redirect
    await page.goto('http://localhost:3000/interviewer')
    await expect(page.locator('text=Access denied')).toBeVisible()
  })

  test('Interviewer signup and access dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.click('text=Create Account')
    await page.fill('select#role', 'interviewer')
    await page.fill('input#email', 'e2e-interviewer@example.com')
    await page.fill('input#password', 'password123')
    await page.fill('input#confirmPassword', 'password123')
    await page.click('text=Create Account')

    await expect(page).toHaveURL(/\/interviewer/)

    // Try interviewee route
    await page.goto('http://localhost:3000/interviewee')
    await expect(page.locator('text=Access denied')).toBeVisible()
  })
})
