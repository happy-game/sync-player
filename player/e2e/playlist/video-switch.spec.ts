import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    expectCurrentPlaylistItem,
    expectPlaylistTitles,
    expectSourceToContain,
    getPlaylistEntries,
    getPlaylistItems,
    login,
    play,
    playPlaylistItem,
    seekTo,
    setMuted,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Video Switch E2E', () => {
    test.describe('Manual Switch', () => {
        test('switches video when clicking play on another playlist item', async ({ browser }) => {
            const { context, page } = await createIsolatedPage(browser);

            try {
                expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(2);
                const [firstVideo, secondVideo] = TEST_VIDEOS;

                await login(page);

                await addPlaylistItem(page, firstVideo);
                await addPlaylistItem(page, secondVideo);

                // Play the first video
                await playPlaylistItem(page, firstVideo.title);
                await expectCurrentPlaylistItem(page, firstVideo.title);
                await expectSourceToContain(page, firstVideo.url);
                await setMuted(page, true);

                // Switch to the second video manually
                await playPlaylistItem(page, secondVideo.title);
                await expectCurrentPlaylistItem(page, secondVideo.title);
                await expectSourceToContain(page, secondVideo.url);

                // Verify the playlist highlights the correct item
                const entries = await getPlaylistEntries(page);
                const playingEntry = entries.find((entry) => entry.isPlaying);
                expect(playingEntry?.title).toBe(secondVideo.title);
            } finally {
                await context.close();
            }
        });

        test('manual video switch syncs across users in the same room', async ({ browser }) => {
            const firstUser = await createIsolatedPage(browser);
            const secondUser = await createIsolatedPage(browser);

            try {
                expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(2);
                const [firstVideo, secondVideo] = TEST_VIDEOS;

                const firstLogin = await login(firstUser.page);
                await login(secondUser.page, { roomName: firstLogin.roomName });

                await addPlaylistItem(firstUser.page, firstVideo);
                await addPlaylistItem(firstUser.page, secondVideo);

                // First user plays the first video
                await playPlaylistItem(firstUser.page, firstVideo.title);
                await expectCurrentPlaylistItem(firstUser.page, firstVideo.title);
                await expectCurrentPlaylistItem(secondUser.page, firstVideo.title);
                await setMuted(firstUser.page, true);
                await setMuted(secondUser.page, true);

                // First user switches to the second video
                await playPlaylistItem(firstUser.page, secondVideo.title);
                await expectCurrentPlaylistItem(firstUser.page, secondVideo.title);
                await expectSourceToContain(firstUser.page, secondVideo.url);

                // Second user should also switch to the second video
                await expectCurrentPlaylistItem(secondUser.page, secondVideo.title);
                await expectSourceToContain(secondUser.page, secondVideo.url);
            } finally {
                await Promise.all([firstUser.context.close(), secondUser.context.close()]);
            }
        });

        test('manual switch removes the previous video from playlist', async ({ browser }) => {
            const { context, page } = await createIsolatedPage(browser);

            try {
                expect(TEST_VIDEOS.length).toBeGreaterThanOrEqual(3);
                const [firstVideo, secondVideo, thirdVideo] = TEST_VIDEOS;

                await login(page);

                await addPlaylistItem(page, firstVideo);
                await addPlaylistItem(page, secondVideo);
                await addPlaylistItem(page, thirdVideo);
                await expectPlaylistTitles(page, [firstVideo.title, secondVideo.title, thirdVideo.title]);

                // Play the first video
                await playPlaylistItem(page, firstVideo.title);
                await expectCurrentPlaylistItem(page, firstVideo.title);
                await setMuted(page, true);

                // Switch to the second — first video should be removed from playlist
                await playPlaylistItem(page, secondVideo.title);
                await expectCurrentPlaylistItem(page, secondVideo.title);
                await expect.poll(async () => getPlaylistItems(page)).toEqual([secondVideo.title, thirdVideo.title]);

                // Switch to the third — second video should be removed from playlist
                await playPlaylistItem(page, thirdVideo.title);
                await expectCurrentPlaylistItem(page, thirdVideo.title);
                await expect.poll(async () => getPlaylistItems(page)).toEqual([thirdVideo.title]);
            } finally {
                await context.close();
            }
        });
    });

    test.describe('Auto Switch on Video End', () => {
        // Use short videos (10s) for auto-switch tests to avoid long waits
        const SHORT_VIDEOS = TEST_VIDEOS.filter((video) => video.duration <= 10);

        test('auto-switches to next video when current video ends', async ({ browser }) => {
            test.setTimeout(60_000);
            const { context, page } = await createIsolatedPage(browser);

            try {
                expect(SHORT_VIDEOS.length).toBeGreaterThanOrEqual(2);
                const [firstShort, secondShort] = SHORT_VIDEOS;

                await login(page);

                await addPlaylistItem(page, firstShort);
                await addPlaylistItem(page, secondShort);

                // Play the first short video
                await playPlaylistItem(page, firstShort.title);
                await expectCurrentPlaylistItem(page, firstShort.title);
                await expectSourceToContain(page, firstShort.url);
                await setMuted(page, true);

                // Seek near the end of the first video to trigger auto-switch quickly
                await seekTo(page, firstShort.duration - 2);
                await play(page);

                // Wait for the video to end and auto-switch to the next one
                await expect.poll(async () => {
                    const entries = await getPlaylistEntries(page);
                    const playing = entries.find((entry) => entry.isPlaying);
                    return playing?.title ?? null;
                }, { timeout: 15_000 }).toBe(secondShort.title);

                await expectSourceToContain(page, secondShort.url);
            } finally {
                await context.close();
            }
        });

        test('auto-switch syncs across users in the same room', async ({ browser }) => {
            test.setTimeout(60_000);
            const firstUser = await createIsolatedPage(browser);
            const secondUser = await createIsolatedPage(browser);

            try {
                expect(SHORT_VIDEOS.length).toBeGreaterThanOrEqual(2);
                const [firstShort, secondShort] = SHORT_VIDEOS;

                const firstLogin = await login(firstUser.page);
                await login(secondUser.page, { roomName: firstLogin.roomName });

                await addPlaylistItem(firstUser.page, firstShort);
                await addPlaylistItem(firstUser.page, secondShort);

                // First user plays the first short video
                await playPlaylistItem(firstUser.page, firstShort.title);
                await expectCurrentPlaylistItem(firstUser.page, firstShort.title);
                await expectCurrentPlaylistItem(secondUser.page, firstShort.title);
                await setMuted(firstUser.page, true);
                await setMuted(secondUser.page, true);

                // Seek near the end to trigger auto-switch
                await seekTo(firstUser.page, firstShort.duration - 2);
                await play(firstUser.page);

                // Both users should auto-switch to the second video
                await expect.poll(async () => {
                    const entries = await getPlaylistEntries(firstUser.page);
                    const playing = entries.find((entry) => entry.isPlaying);
                    return playing?.title ?? null;
                }, { timeout: 15_000 }).toBe(secondShort.title);

                await expectCurrentPlaylistItem(secondUser.page, secondShort.title);
                await expectSourceToContain(firstUser.page, secondShort.url);
                await expectSourceToContain(secondUser.page, secondShort.url);
            } finally {
                await Promise.all([firstUser.context.close(), secondUser.context.close()]);
            }
        });
    });
});
