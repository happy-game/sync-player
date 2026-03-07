import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    clearPlaylist,
    deletePlaylistItem,
    expectCurrentPlaylistItem,
    expectPlaylistTitles,
    getPlaylistEntries,
    getPlaylistItems,
    login,
    movePlaylistItem,
    playPlaylistItem,
    seekTo,
    setMuted,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Playlist Edge Cases', () => {
    test('clear playlist button is hidden when playlist is empty', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const playlistContainer = page.locator('div.playlist-container').first();
            const clearButton = playlistContainer.getByRole('button', { name: '清空播放列表' });

            // Empty playlist — clear button should not be visible
            await expect(clearButton).toBeHidden();
        } finally {
            await context.close();
        }
    });

    test('clear playlist button appears when items are added and hides after clearing', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const playlistContainer = page.locator('div.playlist-container').first();
            const clearButton = playlistContainer.getByRole('button', { name: '清空播放列表' });

            await addPlaylistItem(page, TEST_VIDEOS[0]);
            await expect(clearButton).toBeVisible();

            await clearPlaylist(page);
            await expect(clearButton).toBeHidden();
        } finally {
            await context.close();
        }
    });

    test('play button is disabled for the currently playing item', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const [firstItem, secondItem] = TEST_VIDEOS;
            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await playPlaylistItem(page, firstItem.title);

            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                return {
                    firstIsPlaying: entries[0]?.isPlaying ?? null,
                    firstCanPlay: entries[0]?.canPlay ?? null,
                    secondCanPlay: entries[1]?.canPlay ?? null,
                };
            }).toEqual({
                firstIsPlaying: true,
                firstCanPlay: false,
                secondCanPlay: true,
            });
        } finally {
            await context.close();
        }
    });

    test('deleting the currently playing item removes it from the playlist', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const [firstItem, secondItem] = TEST_VIDEOS;
            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await playPlaylistItem(page, firstItem.title);
            await expectCurrentPlaylistItem(page, firstItem.title);

            // Delete the currently playing item
            await deletePlaylistItem(page, firstItem.title);

            // Only the second item should remain
            await expectPlaylistTitles(page, [secondItem.title]);
        } finally {
            await context.close();
        }
    });

    test('reordering while an item is playing preserves the playing state', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const [firstItem, secondItem, thirdItem] = TEST_VIDEOS;
            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await addPlaylistItem(page, thirdItem);

            // Start playing the second item
            await playPlaylistItem(page, secondItem.title);
            await expectCurrentPlaylistItem(page, secondItem.title);

            // Reorder: move the third item to the top.
            // The server implementation reverses the order of remaining items (verified by existing playlist tests).
            await movePlaylistItem(page, thirdItem.title, 'top');
            await expectPlaylistTitles(page, [thirdItem.title, secondItem.title, firstItem.title]);

            // The second item should still be marked as playing after the reorder
            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                const playing = entries.find((e) => e.isPlaying);
                return playing?.title ?? null;
            }).toBe(secondItem.title);
        } finally {
            await context.close();
        }
    });

    test('reorder buttons are disabled at playlist boundaries', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const [firstItem, secondItem] = TEST_VIDEOS;
            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);

            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                return {
                    firstCanMoveTop: entries[0]?.canMoveTop,
                    firstCanMoveUp: entries[0]?.canMoveUp,
                    lastCanMoveDown: entries.at(-1)?.canMoveDown,
                };
            }).toEqual({
                firstCanMoveTop: false,
                firstCanMoveUp: false,
                lastCanMoveDown: false,
            });
        } finally {
            await context.close();
        }
    });

    test('switching to a different item while one is playing updates the playing marker', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const [firstItem, secondItem] = TEST_VIDEOS;
            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);

            await playPlaylistItem(page, firstItem.title);
            await expectCurrentPlaylistItem(page, firstItem.title);

            await playPlaylistItem(page, secondItem.title);
            await expectCurrentPlaylistItem(page, secondItem.title);

            // The first item should no longer be marked as playing
            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                return entries.find((e) => e.isPlaying)?.title ?? null;
            }).toBe(secondItem.title);
        } finally {
            await context.close();
        }
    });

    // TODO: This test requires the external video URL to be accessible so the browser can load the
    // video and report readyState > 0. In environments without outbound network access the seekTo
    // helper times out. Skip until a local test-video fixture is available.
    test.skip('seeking while playback is active does not disrupt playlist state', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const video = TEST_VIDEOS[0];
            await addPlaylistItem(page, video);
            await playPlaylistItem(page, video.title);
            await setMuted(page, true);

            await seekTo(page, 5);

            // The playlist item should still be marked as playing
            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                return entries.find((e) => e.isPlaying)?.title ?? null;
            }).toBe(video.title);
        } finally {
            await context.close();
        }
    });

    test('playlist is isolated — deleting in one room does not affect another room', async ({ browser }) => {
        const roomAUser = await createIsolatedPage(browser);
        const roomBUser = await createIsolatedPage(browser);

        try {
            const roomALogin = await login(roomAUser.page);
            await login(roomBUser.page);

            // Add items to each room independently
            await addPlaylistItem(roomAUser.page, TEST_VIDEOS[0]);
            await addPlaylistItem(roomBUser.page, TEST_VIDEOS[1]);

            await expectPlaylistTitles(roomAUser.page, [TEST_VIDEOS[0].title]);
            await expectPlaylistTitles(roomBUser.page, [TEST_VIDEOS[1].title]);

            // Delete from room A
            await deletePlaylistItem(roomAUser.page, TEST_VIDEOS[0].title);
            await expectPlaylistTitles(roomAUser.page, []);

            // Room B's playlist should be untouched
            await expect.poll(async () => getPlaylistItems(roomBUser.page)).toEqual([TEST_VIDEOS[1].title]);
        } finally {
            await Promise.all([roomAUser.context.close(), roomBUser.context.close()]);
        }
    });
});
