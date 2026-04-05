import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page should load and display welcome', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Welcome/);
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('should have header navigation links', async ({ page }) => {
    await page.goto('/');

    // Check for main navigation links
    const homeLink = page.locator('a[href="/"]').first();
    const blogLink = page.locator('a[href="/blog"]').first();
    const subscribeLink = page.locator('a[href="/subscribe"]').first();

    await expect(homeLink).toBeVisible();
    await expect(blogLink).toBeVisible();
    await expect(subscribeLink).toBeVisible();
  });

  test('should navigate to blog from home', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/blog"]');

    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator('h1, h2')).toContainText(/[Bb]log|Posts?/);
  });

  test('should navigate to subscribe from home', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/subscribe"]');

    await expect(page).toHaveURL(/\/subscribe\/?$/);
    await expect(page.locator('h1, h2')).toContainText(/[Ss]ubscri/);
  });

  test('should navigate back to home from other pages', async ({ page }) => {
    await page.goto('/blog');
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();

    await expect(page).toHaveURL(/\/?$/);
  });

  test('should have working RSS feed link', async ({ page }) => {
    await page.goto('/');
    const rssLink = page.locator('a[href="/rss.xml"]');

    await expect(rssLink).toBeVisible();

    const response = await page.request.get(page.url().replace(/\/$/, '') + '/rss.xml');
    expect(response.status()).toBe(200);
  });
});
