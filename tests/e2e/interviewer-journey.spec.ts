/**
 * E2E Tests - Interviewer Journey
 * Tests for complete interviewer user flow
 */

import { test, expect } from '@playwright/test';

test.describe('Interviewer Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login as interviewer
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'interviewer@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    await expect(page).toHaveURL(/.*\/interviewer/);
  });

  test('should view and score candidates', async ({ page }) => {
    // Step 1: View candidate list
    test.step('View candidate list', async () => {
      await expect(page.locator('text=Candidates')).toBeVisible();
      
      const candidateRows = page.locator('[data-candidate-id]');
      const count = await candidateRows.count();
      expect(count).toBeGreaterThan(0);
    });

    // Step 2: Open candidate detail
    test.step('View candidate details', async () => {
      const firstCandidate = page.locator('[data-candidate-id]').first();
      await firstCandidate.click();
      
      await expect(page.locator('text=Candidate Details')).toBeVisible();
      await expect(page.locator('text=Resume')).toBeVisible();
      await expect(page.locator('text=Interview Answers')).toBeVisible();
    });

    // Step 3: Score answers
    test.step('Score answers', async () => {
      // Find first answer
      const firstAnswer = page.locator('[data-answer-id]').first();
      await firstAnswer.click();
      
      // Enter score
      await page.fill('input[name="score"]', '85');
      await page.fill('textarea[name="feedback"]', 'Good answer with clear examples');
      
      await page.click('button:has-text("Submit Score")');
      await expect(page.locator('text=Score submitted')).toBeVisible();
    });

    // Step 4: View updated score
    test.step('Verify score displayed', async () => {
      await expect(page.locator('text=85')).toBeVisible();
      await expect(page.locator('text=Good answer')).toBeVisible();
    });
  });

  test('should filter and sort candidates', async ({ page }) => {
    // Filter by seniority
    await page.selectOption('select[name="seniority"]', 'senior');
    await expect(page.locator('text=Senior')).toBeVisible();

    // Filter by minimum score
    await page.fill('input[name="minScore"]', '80');
    
    // Sort by score descending
    await page.click('text=Score');
    
    // Verify sorted order
    const scores = await page.locator('[data-score]').allTextContents();
    const numericScores = scores.map(s => parseInt(s));
    const sorted = [...numericScores].sort((a, b) => b - a);
    expect(numericScores).toEqual(sorted);
  });

  test('should search candidates', async ({ page }) => {
    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('John');
    
    await expect(page.locator('text=John')).toBeVisible();
    
    const rows = await page.locator('[data-candidate-id]').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should export candidate data', async ({ page }) => {
    const firstCandidate = page.locator('[data-candidate-id]').first();
    await firstCandidate.click();
    
    // Start download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export PDF")')
    ]);
    
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should handle multiple reviewers', async ({ page }) => {
    const firstCandidate = page.locator('[data-candidate-id]').first();
    await firstCandidate.click();
    
    // Submit first score
    await page.fill('input[name="score"]', '90');
    await page.click('button:has-text("Submit Score")');
    
    // Logout and login as different interviewer
    await page.click('button:has-text("Logout")');
    
    await page.fill('input[name="email"]', 'interviewer2@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');
    
    // Score same candidate
    await firstCandidate.click();
    await page.fill('input[name="score"]', '85');
    await page.click('button:has-text("Submit Score")');
    
    // Should see both scores
    await expect(page.locator('text=90')).toBeVisible();
    await expect(page.locator('text=85')).toBeVisible();
  });
});
