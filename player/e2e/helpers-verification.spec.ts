import { test, expect } from '@playwright/test';
import { enterPlayerPage, waitForUi } from './helpers';

test.describe('E2E Helper Functions Verification', () => {
    test('enter player page', async ({ page }) => {
        await enterPlayerPage(page);
        await waitForUi(page);

        await expect(page.locator('h2:has-text("登录")')).toBeVisible();
    });
});
