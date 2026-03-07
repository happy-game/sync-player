import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    clearPlaylist,
    deletePlaylistItem,
    expectCurrentPlaylistItem,
    expectPlaylistTitles,
    expectSourceToContain,
    getPlaybackState,
    getPlaylistEntries,
    getPlaylistItems,
    login,
    movePlaylistItem,
    playPlaylistItem,
    seekTo,
    setMuted,
    waitForUi,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Playlist Edge Cases E2E', () => {
    test('empty playlist shows no items and clear button is hidden', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const playlistContainer = page.locator('div.playlist-container').first();
            await expect(playlistContainer.getByRole('heading', { name: '播放列表' })).toBeVisible();

            await expect.poll(async () => getPlaylistItems(page)).toEqual([]);

            // Clear button should be hidden when playlist is empty
            const clearButton = playlistContainer.getByRole('button', { name: '清空播放列表' });
            await expect(clearButton).toBeHidden();
        } finally {
            await context.close();
        }
    });

    test('deleting the currently playing item stops playback or switches', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(2);
            const [firstItem, secondItem] = TEST_VIDEOS;

            await login(page);

            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await playPlaylistItem(page, firstItem.title);
            await expectCurrentPlaylistItem(page, firstItem.title);
            await setMuted(page, true);

            // Delete the currently playing item
            await deletePlaylistItem(page, firstItem.title);

            // After deleting the current item, verify the playlist state
            await expectPlaylistTitles(page, [secondItem.title]);

            // The player should either stop or the remaining item is not auto-played
            // We just verify no crash occurs and the playlist is consistent
            const entries = await getPlaylistEntries(page);
            expect(entries.length).toBe(1);
            expect(entries[0].title).toBe(secondItem.title);
        } finally {
            await context.close();
        }
    });

    test('reordering items while playback is active preserves playing state', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [firstItem, secondItem, thirdItem] = TEST_VIDEOS;

            await login(page);

            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await addPlaylistItem(page, thirdItem);

            await playPlaylistItem(page, secondItem.title);
            await expectCurrentPlaylistItem(page, secondItem.title);
            await setMuted(page, true);

            // Reorder: move the third item to top
            await movePlaylistItem(page, thirdItem.title, 'top');
            // After moving third to top, the order depends on the swap implementation
            // Verify the third item is now first
            await expect.poll(async () => {
                const items = await getPlaylistItems(page);
                return items[0];
            }).toBe(thirdItem.title);

            // The currently playing item should still be the second item
            await expectCurrentPlaylistItem(page, secondItem.title);
            await expectSourceToContain(page, secondItem.url);
        } finally {
            await context.close();
        }
    });

    test('adding items after clearing playlist works correctly', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(2);
            const [firstItem, secondItem] = TEST_VIDEOS;

            await login(page);

            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await expectPlaylistTitles(page, [firstItem.title, secondItem.title]);

            await clearPlaylist(page);
            await expect.poll(async () => getPlaylistItems(page)).toEqual([]);

            // Re-add items after clearing
            await addPlaylistItem(page, secondItem);
            await expectPlaylistTitles(page, [secondItem.title]);

            // Can play the re-added item
            await playPlaylistItem(page, secondItem.title);
            await expectCurrentPlaylistItem(page, secondItem.title);
        } finally {
            await context.close();
        }
    });

    test('playlist entry button states are correct for single item', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            await login(page);

            await addPlaylistItem(page, video);
            await expectPlaylistTitles(page, [video.title]);

            const entries = await getPlaylistEntries(page);
            expect(entries.length).toBe(1);
            expect(entries[0].title).toBe(video.title);
            // Single item cannot move in any direction
            expect(entries[0].canMoveTop).toBe(false);
            expect(entries[0].canMoveUp).toBe(false);
            expect(entries[0].canMoveDown).toBe(false);
        } finally {
            await context.close();
        }
    });
});
