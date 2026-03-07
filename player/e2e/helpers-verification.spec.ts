import { test, expect } from '@playwright/test';
import { addPlaylistItem, clearPlaylist, clickVideoSurface, deletePlaylistItem, enterPlayerPage, expectCurrentPlaylistItem, expectPlaybackNear, expectPlaylistTitles, expectRoomUsers, expectSourceToContain, getPlaybackState, getPlaylistEntries, getPlaylistItems, getRoomInfo, getSyncControlState, login, logout, movePlaylistItem, pause, play, playPlaylistItem, requestSync, seekTo, setMuted, TEST_VIDEOS, toggleSync, waitForUi } from './helpers.js';

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

    test('room helpers', async ({ browser }) => {
        const firstContext = await browser.newContext();
        const secondContext = await browser.newContext();
        const firstPage = await firstContext.newPage();
        const secondPage = await secondContext.newPage();

        try {
            const firstLogin = await login(firstPage);
            const secondLogin = await login(secondPage, { roomName: firstLogin.roomName });

            await firstPage.reload();
            await secondPage.reload();  // 刷新页面，验证用户列表是否正确
            await expectRoomUsers(firstPage, [firstLogin.username, secondLogin.username]);
            await expectRoomUsers(secondPage, [firstLogin.username, secondLogin.username]);

            const firstRoomInfo = await getRoomInfo(firstPage);
            const secondRoomInfo = await getRoomInfo(secondPage);

            expect(firstRoomInfo.roomName).toBe(firstLogin.roomName);
            expect(firstRoomInfo.roomId).toBeGreaterThan(0);
            expect(firstRoomInfo.roomId).toBe(secondRoomInfo.roomId);
            expect(firstRoomInfo.users.find((user) => user.username === firstLogin.username)?.isCurrentUser).toBe(true);
            expect(firstRoomInfo.users.find((user) => user.username === secondLogin.username)?.online).toBe(true);
            expect(secondRoomInfo.users.find((user) => user.username === secondLogin.username)?.isCurrentUser).toBe(true);
        } finally {
            await firstContext.close();
            await secondContext.close();
        }
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

    test('playlist advanced helpers', async ({ page }) => {
        expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);

        const [firstItem, secondItem, thirdItem] = TEST_VIDEOS;

        await login(page);

        await addPlaylistItem(page, firstItem);
        await addPlaylistItem(page, secondItem);
        await addPlaylistItem(page, thirdItem);
        await expectPlaylistTitles(page, [firstItem.title, secondItem.title, thirdItem.title]);

        const initialEntries = await getPlaylistEntries(page);
        expect(initialEntries[0]?.canMoveTop).toBe(false);
        expect(initialEntries[0]?.canMoveUp).toBe(false);
        expect(initialEntries[2]?.canMoveDown).toBe(false);
        await movePlaylistItem(page, thirdItem.title, 'top');
        await expectPlaylistTitles(page, [thirdItem.title, secondItem.title, firstItem.title]);

        await playPlaylistItem(page, firstItem.title);
        await expectCurrentPlaylistItem(page, firstItem.title);

        await clearPlaylist(page);
        await expect.poll(async () => getPlaylistItems(page)).toEqual([]);
    });

    test('sync helpers', async ({ browser }) => {
        const firstContext = await browser.newContext();
        const secondContext = await browser.newContext();
        const firstPage = await firstContext.newPage();
        const secondPage = await secondContext.newPage();

        try {
            const syncItem = TEST_VIDEOS[0];
            const firstLogin = await login(firstPage);
            await login(secondPage, { roomName: firstLogin.roomName });

            await addPlaylistItem(firstPage, syncItem);
            await playPlaylistItem(firstPage, syncItem.title);

            await expectSourceToContain(firstPage, syncItem.url);
            await expectSourceToContain(secondPage, syncItem.url);
            await setMuted(firstPage, true);
            await setMuted(secondPage, true);

            const initialSyncState = await getSyncControlState(secondPage);
            expect(initialSyncState.enabled).toBe(true);

            await toggleSync(secondPage);
            expect((await getSyncControlState(secondPage)).enabled).toBe(false);

            await toggleSync(secondPage);
            expect((await getSyncControlState(secondPage)).enabled).toBe(true);

            await seekTo(firstPage, 10);
            // With sync enabled, both users should be near 10s
            await expectPlaybackNear(secondPage, 10, 2);
            
            await toggleSync(secondPage);
            await seekTo(secondPage, 2);
            await requestSync(secondPage);
            await expect.poll(async () => (await getPlaybackState(secondPage)).currentTime < 5).toBe(true);

            await toggleSync(secondPage);
            await requestSync(secondPage);
            await expect.poll(async () => {
                const firstPlaybackState = await getPlaybackState(firstPage);
                const secondPlaybackState = await getPlaybackState(secondPage);
                return Math.abs(firstPlaybackState.currentTime - secondPlaybackState.currentTime);
            }).toBeLessThan(1.5);

            if ((await getPlaybackState(firstPage)).paused) {
                await clickVideoSurface(firstPage);
                await expect.poll(async () => (await getPlaybackState(firstPage)).paused).toBe(false);
            }

            await clickVideoSurface(firstPage);
            await expect.poll(async () => (await getPlaybackState(secondPage)).paused).toBe(true);
        } finally {
            await firstContext.close();
            await secondContext.close();
        }
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
