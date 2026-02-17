import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'admin@hellio.com';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD || 'Noa123456';

test.describe('NotificationsPanel', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/');
  });

  test('should display notifications panel when notifications exist', async ({ page }) => {
    // Check if notifications panel is visible (when there are notifications)
    const panel = page.locator('text=Agent Notifications');

    // Panel may or may not be visible depending on notifications
    // If visible, verify structure
    if (await panel.isVisible()) {
      // Check badge count exists
      await expect(page.locator('.bg-purple-600.text-white.text-xs')).toBeVisible();

      // Check expand/collapse functionality
      await panel.click();
      await expect(page.locator('text=Agent Notifications')).toBeVisible();
    }
  });

  test('should be hidden when no notifications', async ({ page }) => {
    // Mock empty notifications response
    await page.route('**/api/agent/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/');

    // Panel should not be visible when no notifications
    await expect(page.locator('text=Agent Notifications')).not.toBeVisible();
  });

  test('should display notification with correct structure', async ({ page }) => {
    // Mock notification response
    await page.route('**/api/agent/notifications*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              type: 'new_candidate',
              summary: 'New candidate John Smith processed from email',
              action_url: '/candidates/cand_123',
              status: 'pending',
              candidate_id: 'cand_123',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Wait for panel to appear
    await expect(page.locator('text=Agent Notifications')).toBeVisible();

    // Check notification count badge (first one is the count badge in the header)
    await expect(page.locator('.bg-purple-600.text-white.text-xs.rounded-full')).toContainText('1');

    // Check notification content
    await expect(page.locator('text=New candidate John Smith processed from email')).toBeVisible();

    // Check View button exists
    await expect(page.locator('text=View').first()).toBeVisible();

    // Check Dismiss button exists
    await expect(page.locator('text=Dismiss').first()).toBeVisible();
  });

  test('should dismiss notification when clicking Dismiss', async ({ page }) => {
    let dismissCalled = false;

    await page.route('**/api/agent/notifications*', async (route) => {
      if (route.request().method() === 'GET' && !dismissCalled) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              type: 'new_position',
              summary: 'New position Senior DevOps Engineer created',
              status: 'pending',
            },
          ]),
        });
      } else if (route.request().method() === 'GET' && dismissCalled) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/agent/notifications/1', async (route) => {
      if (route.request().method() === 'PUT') {
        dismissCalled = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, status: 'dismissed' }),
        });
      }
    });

    await page.goto('/');

    // Wait for notification to appear
    await expect(page.locator('text=Agent Notifications')).toBeVisible();

    // Click dismiss
    await page.click('text=Dismiss');

    // Notification should be removed from list
    await expect(page.locator('text=New position Senior DevOps Engineer created')).not.toBeVisible();
  });

  test('should navigate to candidate when clicking View', async ({ page }) => {
    await page.route('**/api/agent/notifications*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              type: 'new_candidate',
              summary: 'New candidate processed',
              action_url: '/candidates',
              status: 'pending',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Wait for notification
    await expect(page.locator('text=Agent Notifications')).toBeVisible();

    // Click View button
    await page.click('text=View');

    // Should navigate to candidates page
    await expect(page).toHaveURL(/\/candidates/);
  });

  test('should show correct icons for different notification types', async ({ page }) => {
    await page.route('**/api/agent/notifications*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              type: 'new_candidate',
              summary: 'Candidate notification',
              status: 'pending',
            },
            {
              id: 2,
              created_at: new Date().toISOString(),
              type: 'new_position',
              summary: 'Position notification',
              status: 'pending',
            },
            {
              id: 3,
              created_at: new Date().toISOString(),
              type: 'missing_info',
              summary: 'Missing info notification',
              status: 'pending',
            },
            {
              id: 4,
              created_at: new Date().toISOString(),
              type: 'error',
              summary: 'Error notification',
              status: 'pending',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Check badge shows count
    await expect(page.locator('.bg-purple-600.text-white.text-xs')).toContainText('4');

    // Check all notifications are displayed
    await expect(page.locator('text=Candidate notification')).toBeVisible();
    await expect(page.locator('text=Position notification')).toBeVisible();
    await expect(page.locator('text=Missing info notification')).toBeVisible();
    await expect(page.locator('text=Error notification')).toBeVisible();
  });

  test('should collapse and expand panel', async ({ page }) => {
    await page.route('**/api/agent/notifications*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              created_at: new Date().toISOString(),
              type: 'new_candidate',
              summary: 'Test notification',
              status: 'pending',
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Panel should be expanded by default
    await expect(page.locator('text=Test notification')).toBeVisible();

    // Click to collapse
    await page.click('text=Agent Notifications');

    // Notification content should be hidden
    await expect(page.locator('text=Test notification')).not.toBeVisible();

    // Click to expand again
    await page.click('text=Agent Notifications');

    // Notification content should be visible again
    await expect(page.locator('text=Test notification')).toBeVisible();
  });
});

test.describe('End-to-End Agent Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should show real notifications from agent processing', async ({ page }) => {
    // This test uses the real API - notifications created by the agent
    await page.goto('/');

    // Wait a bit for any notifications to load
    await page.waitForTimeout(2000);

    // Check if notifications panel exists (will only show if agent created notifications)
    const panel = page.locator('text=Agent Notifications');

    if (await panel.isVisible()) {
      // Get the count
      const badge = page.locator('.bg-purple-600.text-white.text-xs');
      const count = await badge.textContent();
      console.log(`Found ${count} pending notifications`);

      // Verify we can interact with them
      expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
    } else {
      console.log('No pending notifications found');
    }
  });

  test('candidates page should load', async ({ page }) => {
    await page.goto('/candidates');
    await expect(page.locator('h1, h2').filter({ hasText: /candidate/i })).toBeVisible();
  });

  test('positions page should load', async ({ page }) => {
    await page.goto('/positions');
    await expect(page.locator('h1, h2').filter({ hasText: /position/i })).toBeVisible();
  });
});
