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
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Playlist E2E', () => {
    test('can add reorder switch and delete playlist items', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [firstItem, secondItem, thirdItem] = TEST_VIDEOS;

            await login(page);

            await addPlaylistItem(page, firstItem);
            await addPlaylistItem(page, secondItem);
            await addPlaylistItem(page, thirdItem);

            await expectPlaylistTitles(page, [firstItem.title, secondItem.title, thirdItem.title]);

            await expect.poll(async () => {
                const entries = await getPlaylistEntries(page);
                return {
                    firstCanMoveTop: entries[0]?.canMoveTop ?? null,
                    firstCanMoveUp: entries[0]?.canMoveUp ?? null,
                    lastCanMoveDown: entries.at(-1)?.canMoveDown ?? null,
                };
            }).toEqual({
                firstCanMoveTop: false,
                firstCanMoveUp: false,
                lastCanMoveDown: false,
            });

            await movePlaylistItem(page, thirdItem.title, 'top');
            await expectPlaylistTitles(page, [thirdItem.title, secondItem.title, firstItem.title]);

            await movePlaylistItem(page, secondItem.title, 'up');
            await expectPlaylistTitles(page, [secondItem.title, thirdItem.title, firstItem.title]);

            await playPlaylistItem(page, secondItem.title);
            await expectCurrentPlaylistItem(page, secondItem.title);

            await deletePlaylistItem(page, firstItem.title);
            await expectPlaylistTitles(page, [secondItem.title, thirdItem.title]);
        } finally {
            await context.close();
        }
    });

    test('can clear the playlist', async ({ browser }) => {
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
        } finally {
            await context.close();
        }
    });

    test('syncs playlist changes across pages in the same room', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [firstItem, secondItem, thirdItem] = TEST_VIDEOS;

            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });

            await addPlaylistItem(firstUser.page, firstItem);
            await addPlaylistItem(firstUser.page, secondItem);
            await expectPlaylistTitles(firstUser.page, [firstItem.title, secondItem.title]);
            await expectPlaylistTitles(secondUser.page, [firstItem.title, secondItem.title]);

            await movePlaylistItem(firstUser.page, secondItem.title, 'top');
            await expectPlaylistTitles(firstUser.page, [secondItem.title, firstItem.title]);
            await expectPlaylistTitles(secondUser.page, [secondItem.title, firstItem.title]);

            await addPlaylistItem(secondUser.page, thirdItem);
            await expectPlaylistTitles(firstUser.page, [secondItem.title, firstItem.title, thirdItem.title]);
            await expectPlaylistTitles(secondUser.page, [secondItem.title, firstItem.title, thirdItem.title]);

            await deletePlaylistItem(secondUser.page, firstItem.title);
            await expectPlaylistTitles(firstUser.page, [secondItem.title, thirdItem.title]);
            await expectPlaylistTitles(secondUser.page, [secondItem.title, thirdItem.title]);
        } finally {
            await Promise.all([firstUser.context.close(), secondUser.context.close()]);
        }
    });

    test('keeps playlists isolated across different rooms', async ({ browser }) => {
        const roomAFirstUser = await createIsolatedPage(browser);
        const roomASecondUser = await createIsolatedPage(browser);
        const roomBUser = await createIsolatedPage(browser);

        try {
            expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
            const [roomAFirstItem, roomASecondItem, roomBUniqueItem] = TEST_VIDEOS;

            const roomALogin = await login(roomAFirstUser.page);
            await login(roomASecondUser.page, { roomName: roomALogin.roomName });
            await login(roomBUser.page);

            await addPlaylistItem(roomAFirstUser.page, roomAFirstItem);
            await addPlaylistItem(roomASecondUser.page, roomASecondItem);

            await expectPlaylistTitles(roomAFirstUser.page, [roomAFirstItem.title, roomASecondItem.title]);
            await expectPlaylistTitles(roomASecondUser.page, [roomAFirstItem.title, roomASecondItem.title]);
            await expectPlaylistTitles(roomBUser.page, []);

            await addPlaylistItem(roomBUser.page, roomBUniqueItem);
            await expectPlaylistTitles(roomBUser.page, [roomBUniqueItem.title]);

            await expect.poll(async () => await getPlaylistItems(roomAFirstUser.page)).toEqual([roomAFirstItem.title, roomASecondItem.title]);
            await expect.poll(async () => await getPlaylistItems(roomASecondUser.page)).toEqual([roomAFirstItem.title, roomASecondItem.title]);
        } finally {
            await Promise.all([
                roomAFirstUser.context.close(),
                roomASecondUser.context.close(),
                roomBUser.context.close(),
            ]);
        }
    });
});
