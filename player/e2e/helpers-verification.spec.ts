import { test, expect } from '@playwright/test';
import { addPlaylistItem, deletePlaylistItem, enterPlayerPage, getPlaybackState, getPlaylistItems, login, logout, pause, play, seekTo, setMuted, TEST_VIDEOS, waitForUi } from './helpers';

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

    test('playback helpers', async ({ page }) => {
        expect(TEST_VIDEOS.length).toBeGreaterThan(0);

        const playbackItem = TEST_VIDEOS.find((video) => video.duration <= 60) ?? TEST_VIDEOS[0];

        await login(page);
        await waitForUi(page);

        await addPlaylistItem(page, playbackItem);
        await page.locator('li').filter({ hasText: playbackItem.title }).first().getByRole('button', { name: '播放' }).click();

        await expect.poll(async () => (await getPlaybackState(page)).source).toContain(playbackItem.url);
        await setMuted(page, true);
        await expect.poll(async () => (await getPlaybackState(page)).muted).toBe(true);
        await page.click('body');   // it is necessary to click body, otherwise autoplay willbe blocked by browser

        await pause(page);
        await expect.poll(async () => (await getPlaybackState(page)).paused).toBe(true);

        await play(page);
        await expect.poll(async () => (await getPlaybackState(page)).paused).toBe(false);

        await seekTo(page, 10);

        const playbackState = await getPlaybackState(page);
        expect(playbackState.source).toContain(playbackItem.url);
        expect(playbackState.currentTime).toBeGreaterThanOrEqual(9.5);
        expect(playbackState.readyState).toBeGreaterThan(0);
    });
});
