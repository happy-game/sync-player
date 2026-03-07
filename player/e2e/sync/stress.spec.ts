import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    deletePlaylistItem,
    expectCurrentPlaylistItem,
    expectPlaylistTitles,
    expectRoomUsers,
    getPlaylistItems,
    getRoomInfo,
    login,
    playPlaylistItem,
    sendSync,
    getSyncControlState,
    toggleSync,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Multi-User Sync Stress E2E', () => {
    test('three users: late joiner gets correct playlist and currently playing item', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const lateJoiner = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });

            await addPlaylistItem(firstUser.page, video);
            await playPlaylistItem(firstUser.page, video.title);
            await expectCurrentPlaylistItem(firstUser.page, video.title);
            await expectCurrentPlaylistItem(secondUser.page, video.title);

            // Late joiner enters the room
            await login(lateJoiner.page, { roomName: firstLogin.roomName });

            // Late joiner should see the playlist and the currently playing item
            await expectPlaylistTitles(lateJoiner.page, [video.title]);
            await expectCurrentPlaylistItem(lateJoiner.page, video.title);
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                lateJoiner.context.close(),
            ]);
        }
    });

    test('three users: playlist changes from any user sync to all others', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const thirdUser = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [firstVideo, secondVideo, thirdVideo] = TEST_VIDEOS;

            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });
            await login(thirdUser.page, { roomName: firstLogin.roomName });

            // First user adds a video
            await addPlaylistItem(firstUser.page, firstVideo);
            await expectPlaylistTitles(secondUser.page, [firstVideo.title]);
            await expectPlaylistTitles(thirdUser.page, [firstVideo.title]);

            // Second user adds a video
            await addPlaylistItem(secondUser.page, secondVideo);
            await expectPlaylistTitles(firstUser.page, [firstVideo.title, secondVideo.title]);
            await expectPlaylistTitles(thirdUser.page, [firstVideo.title, secondVideo.title]);

            // Third user adds a video
            await addPlaylistItem(thirdUser.page, thirdVideo);
            await expectPlaylistTitles(firstUser.page, [firstVideo.title, secondVideo.title, thirdVideo.title]);
            await expectPlaylistTitles(secondUser.page, [firstVideo.title, secondVideo.title, thirdVideo.title]);
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                thirdUser.context.close(),
            ]);
        }
    });

    test('rapid playlist modifications from different users are handled consistently', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [firstVideo, secondVideo, thirdVideo] = TEST_VIDEOS;
            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });

            // Rapid additions from both users
            await addPlaylistItem(firstUser.page, firstVideo);
            await addPlaylistItem(secondUser.page, secondVideo);
            await addPlaylistItem(firstUser.page, thirdVideo);

            // Both users should see all items
            await expect.poll(async () => {
                const items = await getPlaylistItems(firstUser.page);
                return items.length;
            }).toBe(3);

            await expect.poll(async () => {
                const items = await getPlaylistItems(secondUser.page);
                return items.length;
            }).toBe(3);

            // Delete from second user
            await deletePlaylistItem(secondUser.page, secondVideo.title);

            // Both should see updated playlist
            await expect.poll(async () => {
                const items = await getPlaylistItems(firstUser.page);
                return items.length;
            }).toBe(2);

            await expect.poll(async () => {
                const items = await getPlaylistItems(secondUser.page);
                return items.length;
            }).toBe(2);
        } finally {
            await Promise.all([firstUser.context.close(), secondUser.context.close()]);
        }
    });

    test('sync toggle state is independent per user', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);

        try {
            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });

            // Both users start with sync enabled
            const firstSyncState = await getSyncControlState(firstUser.page);
            const secondSyncState = await getSyncControlState(secondUser.page);
            expect(firstSyncState.enabled).toBe(true);
            expect(secondSyncState.enabled).toBe(true);

            // First user disables sync
            await toggleSync(firstUser.page);
            const firstAfterToggle = await getSyncControlState(firstUser.page);
            expect(firstAfterToggle.enabled).toBe(false);

            // Second user should still have sync enabled (independent toggle)
            const secondAfterToggle = await getSyncControlState(secondUser.page);
            expect(secondAfterToggle.enabled).toBe(true);

            // First user re-enables sync
            await toggleSync(firstUser.page);
            const firstReEnabled = await getSyncControlState(firstUser.page);
            expect(firstReEnabled.enabled).toBe(true);
        } finally {
            await Promise.all([firstUser.context.close(), secondUser.context.close()]);
        }
    });
});
