import { test, expect, devices } from '@playwright/test';

// Test mobile viewport
test.use({ ...devices['Pixel 5'] });

test.describe('Responsive Design', () => {
  test('home page should be readable on mobile', async ({ page }) => {
    await page.goto('/');

    // Main content should be visible
    const mainContent = page.locator('h1, h2, main');
    await expect(mainContent.first()).toBeVisible();
  });

  test('blog listing should work on mobile', async ({ page }) => {
    await page.goto('/blog');

    // Posts should be visible (might be stacked)
    const postLinks = page.locator('a[href*="/blog/"]');
    const count = await postLinks.count();

    expect(count).toBeGreaterThanOrEqual(5);

    // First post should be clickable
    await expect(postLinks.first()).toBeVisible();
    await postLinks.first().click();

    // Blog post should be readable
    const content = page.locator('article, main');
    await expect(content).toBeVisible();
  });

  test('navigation should be accessible on mobile', async ({ page }) => {
    await page.goto('/');

    // Header should be visible
    const header = page.locator('header, [role="navigation"]');
    await expect(header).toBeVisible();

    // Should have at least one navigation link
    const navLink = page.locator('a[href="/blog"]');
    await expect(navLink).toBeVisible();
  });

  test('subscribe form should be usable on mobile', async ({ page }) => {
    await page.goto('/subscribe');

    const emailInput = page.locator('input[type="email"], input[name*="email"]');
    const submitButton = page.locator('button[type="submit"]');

    // Form elements should be visible and not overlapped
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Should be able to type
    await emailInput.fill('test@example.com');
    const value = await emailInput.inputValue();
    expect(value).toBe('test@example.com');
  });

  test('page should not have horizontal overflow', async ({ page }) => {
    await page.goto('/');

    const width = await page.evaluate(() => {
      return Math.max(
        document.documentElement.clientWidth,
        window.innerWidth
      );
    });

    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth;
    });

    // Scroll width should not exceed viewport width by much (allow small margin)
    expect(scrollWidth).toBeLessThanOrEqual(width + 10);
  });
});
