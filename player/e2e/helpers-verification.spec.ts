import { test, expect } from '@playwright/test';
import { addPlaylistItem, deletePlaylistItem, enterPlayerPage, getPlaylistItems, login, logout, TEST_VIDEOS, waitForUi } from './helpers';

test.describe('E2E Helper Functions Verification', () => {
    test('enter player page', async ({ page }) => {
        await enterPlayerPage(page);
        await waitForUi(page);

        await expect(page.locator('h2:has-text("登录")')).toBeVisible();
    });

    test('login', async ({ page }) => {
        const { username, roomName } = await login(page);
        await waitForUi(page);

        await expect(page.locator(`text=房间: ${roomName}`)).toBeVisible();
        await expect(page.locator(`text=${username}`)).toBeVisible();
    });

    test('logout', async ({ page }) => {
        await login(page);
        await waitForUi(page);

        await logout(page);
        await waitForUi(page);

        await expect(page.locator('h2:has-text("登录")')).toBeVisible();
        await expect.poll(async () => page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
        await expect.poll(async () => page.evaluate(() => localStorage.getItem('sync-player-session'))).toBeNull();
    });

    test('playlist helpers', async ({ page }) => {
        expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(2);

        const [firstItem, secondItem] = TEST_VIDEOS;

        await login(page);
        await waitForUi(page);

        await addPlaylistItem(page, firstItem);
        await addPlaylistItem(page, secondItem);
        await waitForUi(page);

        await expect.poll(async () => getPlaylistItems(page)).toEqual([firstItem.title, secondItem.title]);

        await deletePlaylistItem(page, firstItem.title);
        await waitForUi(page);

        await expect.poll(async () => getPlaylistItems(page)).toEqual([secondItem.title]);
    });
});
