import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    enterPlayerPage,
    expectPlaylistTitles,
    getPlaylistItems,
    login,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Error Handling & Edge Cases', () => {
    test('login with empty username does not dismiss modal', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

            // Fill room name but leave username empty, attempt to submit
            await loginModal.locator('label:has-text("房间名")').locator('..').locator('input').fill('test-room');
            await loginModal.getByRole('button', { name: '登录' }).click();

            // The form has `required` on the username input, so the modal should remain visible
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('login with empty room name does not dismiss modal', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

            // Fill username but leave room name empty, attempt to submit
            await loginModal.locator('label:has-text("用户名")').locator('..').locator('input').fill('test-user');
            await loginModal.getByRole('button', { name: '登录' }).click();

            // The form has `required` on the room name input, so the modal should remain visible
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('login with very long username and room name succeeds', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            // Username is varchar(50) and room name is varchar(100) on the server.
            // Use unique names that are long but safely within those limits.
            const suffix = `${Date.now()}`;
            const longUsername = `lng-usr-${'x'.repeat(10)}-${suffix}`.slice(0, 48);
            const longRoomName = `lng-rm-${'y'.repeat(10)}-${suffix}`.slice(0, 48);

            const result = await login(page, { username: longUsername, roomName: longRoomName });

            await expect(page.locator(`text=房间: ${result.roomName}`)).toBeVisible();
            await expect(page.locator(`text=${result.username}`)).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('adding playlist item with empty URL does not add to list', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const addCard = page.getByTestId('add-playlist-card');
            await expect(addCard).toBeVisible();

            // Fill title but leave URL empty
            await addCard.getByTestId('add-playlist-title').fill('Empty URL Video');
            // URL field left blank
            await addCard.getByTestId('add-playlist-submit').click();

            // Nothing should be added to the playlist
            await expect.poll(async () => getPlaylistItems(page)).toEqual([]);
        } finally {
            await context.close();
        }
    });

    test('adding playlist item with empty title does not add to list', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const addCard = page.getByTestId('add-playlist-card');
            await expect(addCard).toBeVisible();

            // Fill URL but leave title empty
            await addCard.getByTestId('add-playlist-url').fill(TEST_VIDEOS[0].url);
            // Title field left blank
            await addCard.getByTestId('add-playlist-submit').click();

            // Nothing should be added to the playlist
            await expect.poll(async () => getPlaylistItems(page)).toEqual([]);
        } finally {
            await context.close();
        }
    });

    test('adding duplicate playlist items adds both entries', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const video = TEST_VIDEOS[0];

            // Add the first entry using the standard helper
            await addPlaylistItem(page, { title: video.title, url: video.url });

            // Add the second entry manually to avoid the strict-mode assertion in addPlaylistItem
            // (which fails when the same title already exists in the list)
            const addCard = page.getByTestId('add-playlist-card');
            await addCard.getByTestId('add-playlist-title').fill(video.title);
            await addCard.getByTestId('add-playlist-url').fill(video.url);
            await addCard.getByTestId('add-playlist-submit').click();

            // Both entries should appear in the playlist (no automatic deduplication)
            await expect.poll(async () => getPlaylistItems(page)).toEqual([video.title, video.title]);
        } finally {
            await context.close();
        }
    });

    test('adding playlist item with invalid URL is accepted without crash', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const invalidItem = {
                title: 'Invalid Video',
                url: 'http://this-does-not-exist.invalid/video.mp4',
            };

            await addPlaylistItem(page, invalidItem);

            // The item should be in the playlist even though the URL is invalid
            await expectPlaylistTitles(page, [invalidItem.title]);
        } finally {
            await context.close();
        }
    });

    test('add playlist clear button resets title and url inputs', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const addCard = page.getByTestId('add-playlist-card');
            await expect(addCard).toBeVisible();

            await addCard.getByTestId('add-playlist-title').fill('Some Title');
            await addCard.getByTestId('add-playlist-url').fill('http://example.com/video.mp4');

            // Click the clear button (the first button in the card footer)
            await addCard.getByRole('button', { name: '清除' }).click();

            // Inputs should be cleared
            await expect(addCard.getByTestId('add-playlist-title')).toHaveValue('');
            await expect(addCard.getByTestId('add-playlist-url')).toHaveValue('');
        } finally {
            await context.close();
        }
    });
});
