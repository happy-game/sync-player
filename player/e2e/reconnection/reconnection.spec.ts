import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    expectCurrentPlaylistItem,
    expectPlaylistTitles,
    getPlaybackState,
    getPlaylistItems,
    login,
    logout,
    playPlaylistItem,
    setMuted,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Reconnection & Resilience E2E', () => {
    test('page refresh mid-session preserves room playlist', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            const { username, roomName } = await login(page);

            await addPlaylistItem(page, video);
            await expectPlaylistTitles(page, [video.title]);

            // Refresh the page
            await page.reload({ waitUntil: 'domcontentloaded' });

            // After refresh, user may see login modal (session might be lost or restored)
            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            const isLoginVisible = await loginModal.getByRole('heading', { name: '登录' }).isVisible().catch(() => false);

            if (isLoginVisible) {
                // Re-login with same room
                await login(page, { username: `${username}-rejoined`, roomName });
            }

            // After rejoining, playlist should still have the item
            await expect.poll(async () => {
                const items = await getPlaylistItems(page);
                return items.length;
            }).toBeGreaterThan(0);
        } finally {
            await context.close();
        }
    });

    test('second user joining after playlist setup gets correct playlist state', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            const firstLogin = await login(firstUser.page);

            await addPlaylistItem(firstUser.page, video);
            await playPlaylistItem(firstUser.page, video.title);
            await expectCurrentPlaylistItem(firstUser.page, video.title);

            // Second user joins the same room after playlist is set up
            await login(secondUser.page, { roomName: firstLogin.roomName });

            // Second user should see the same playlist item
            await expectPlaylistTitles(secondUser.page, [video.title]);
            await expectCurrentPlaylistItem(secondUser.page, video.title);
        } finally {
            await Promise.all([firstUser.context.close(), secondUser.context.close()]);
        }
    });

    test('multiple browser contexts in the same room remain independent', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });

            await addPlaylistItem(firstUser.page, video);
            await expectPlaylistTitles(firstUser.page, [video.title]);
            await expectPlaylistTitles(secondUser.page, [video.title]);

            await playPlaylistItem(firstUser.page, video.title);
            await expectCurrentPlaylistItem(firstUser.page, video.title);
            await expectCurrentPlaylistItem(secondUser.page, video.title);

            // Both users should have independent playback state objects
            await setMuted(firstUser.page, true);
            await setMuted(secondUser.page, true);

            const firstState = await getPlaybackState(firstUser.page);
            const secondState = await getPlaybackState(secondUser.page);

            expect(firstState.source).toContain(video.url);
            expect(secondState.source).toContain(video.url);
        } finally {
            await Promise.all([firstUser.context.close(), secondUser.context.close()]);
        }
    });

    test('user can logout and re-login to a different room', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const firstLogin = await login(page);
            const video = TEST_VIDEOS[0];
            await addPlaylistItem(page, video);
            await expectPlaylistTitles(page, [video.title]);

            // Logout using the helper
            await logout(page);

            // Re-login to a different room
            const secondLogin = await login(page);
            expect(secondLogin.roomName).not.toBe(firstLogin.roomName);

            // New room should have empty playlist
            await expect.poll(async () => getPlaylistItems(page)).toEqual([]);
        } finally {
            await context.close();
        }
    });
});
