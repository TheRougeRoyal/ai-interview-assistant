/**
 * E2E Tests - Interviewee Journey
 * Tests for complete interviewee user flow
 */

import { test, expect } from '@playwright/test';

test.describe('Interviewee Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should complete full interview process', async ({ page }) => {
    // Step 1: Upload resume
    test.step('Upload resume', async () => {
      await page.click('text=Upload Resume');
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/sample-resume.pdf');
      
      await expect(page.locator('text=Processing')).toBeVisible();
      await expect(page.locator('text=Upload successful')).toBeVisible({ timeout: 10000 });
    });

    // Step 2: Fill profile information
    test.step('Complete profile', async () => {
      await page.fill('input[name="name"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1234567890');
      
      await page.click('button:has-text("Start Interview")');
      await expect(page).toHaveURL(/.*\/interview/);
    });

    // Step 3: Answer questions
    test.step('Answer interview questions', async () => {
      // Answer 6 questions
      for (let i = 1; i <= 6; i++) {
        await expect(page.locator(`text=Question ${i}`)).toBeVisible();
        
        const answerTextarea = page.locator('textarea[name="answer"]');
        await answerTextarea.fill(`This is my answer to question ${i}`);
        
        if (i < 6) {
          await page.click('button:has-text("Next Question")');
        } else {
          await page.click('button:has-text("Submit Interview")');
        }
      }
    });

    // Step 4: View summary
    test.step('View summary', async () => {
      await expect(page.locator('text=Interview Complete')).toBeVisible();
      await expect(page.locator('text=Thank you')).toBeVisible();
      
      // Check that score is displayed
      await expect(page.locator('text=Score')).toBeVisible();
    });
  });

  test('should save progress and resume later', async ({ page }) => {
    // Start interview
    await page.click('text=Upload Resume');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-resume.pdf');
    
    await page.fill('input[name="name"]', 'Jane Smith');
    await page.fill('input[name="email"]', 'jane@example.com');
    await page.click('button:has-text("Start Interview")');

    // Answer first question
    await page.fill('textarea[name="answer"]', 'First answer');
    await page.click('button:has-text("Next Question")');

    // Refresh page (simulate browser close)
    await page.reload();

    // Should show welcome back modal
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await page.click('button:has-text("Continue Interview")');

    // Should be on question 2
    await expect(page.locator('text=Question 2')).toBeVisible();
  });

  test('should handle timeout gracefully', async ({ page }) => {
    // Mock faster timeout for testing
    await page.addInitScript(() => {
      window.localStorage.setItem('test_timeout', '5000'); // 5 seconds
    });

    await page.click('text=Upload Resume');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-resume.pdf');
    
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button:has-text("Start Interview")');

    // Wait for timeout
    await expect(page.locator('text=Time\'s up')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=auto-submitted')).toBeVisible();
  });

  test('should navigate using keyboard', async ({ page }) => {
    await page.click('text=Upload Resume');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample-resume.pdf');
    
    await page.fill('input[name="name"]', 'Keyboard User');
    await page.fill('input[name="email"]', 'keyboard@example.com');
    
    // Use Tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Start interview

    // Use keyboard to answer
    await page.keyboard.type('My keyboard answer');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Next question

    await expect(page.locator('text=Question 2')).toBeVisible();
  });
});
