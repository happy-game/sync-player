import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    clickVideoSurface,
    expectCurrentPlaylistItem,
    expectPlaybackNear,
    expectSourceToContain,
    getPlaybackState,
    getSyncControlState,
    login,
    playPlaylistItem,
    requestSync,
    seekTo,
    setMuted,
    toggleSync,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

async function setupSharedPlayback(browser: Browser, video = TEST_VIDEOS[0]): Promise<{
    firstUser: { context: BrowserContext; page: Page };
    secondUser: { context: BrowserContext; page: Page };
    firstLogin: { username: string; roomName: string };
    video: typeof TEST_VIDEOS[number];
}> {
    const firstUser = await createIsolatedPage(browser);
    const secondUser = await createIsolatedPage(browser);

    const firstLogin = await login(firstUser.page);
    await login(secondUser.page, { roomName: firstLogin.roomName });

    await addPlaylistItem(firstUser.page, video);
    await playPlaylistItem(firstUser.page, video.title);

    await expectCurrentPlaylistItem(firstUser.page, video.title);
    await expectCurrentPlaylistItem(secondUser.page, video.title);
    await expectSourceToContain(firstUser.page, video.url);
    await expectSourceToContain(secondUser.page, video.url);

    await setMuted(firstUser.page, true);
    await setMuted(secondUser.page, true);

    return { firstUser, secondUser, firstLogin, video };
}

test.describe('Playback Sync E2E', () => {
    test('syncs selected playlist item across pages in the same room', async ({ browser }) => {
        const setup = await setupSharedPlayback(browser);

        try {
            const secondPlaybackState = await getPlaybackState(setup.secondUser.page);
            expect(secondPlaybackState.source).toContain(setup.video.url);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).readyState).toBeGreaterThan(0);
        } finally {
            await Promise.all([setup.firstUser.context.close(), setup.secondUser.context.close()]);
        }
    });

    test('syncs seek time across pages when difference exceeds threshold', async ({ browser }) => {
        const setup = await setupSharedPlayback(browser);

        try {
            await seekTo(setup.firstUser.page, 8);
            await expectPlaybackNear(setup.secondUser.page, 8, 1.5);
            await expectSourceToContain(setup.secondUser.page, setup.video.url);
        } finally {
            await Promise.all([setup.firstUser.context.close(), setup.secondUser.context.close()]);
        }
    });

    test('syncs pause and resume across pages', async ({ browser }) => {
        const setup = await setupSharedPlayback(browser);

        try {
            let firstPlaybackState = await getPlaybackState(setup.firstUser.page);
            if (firstPlaybackState.paused) {
                await clickVideoSurface(setup.firstUser.page);
                await expect.poll(async () => (await getPlaybackState(setup.firstUser.page)).paused).toBe(false);
            }

            await clickVideoSurface(setup.firstUser.page);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).paused).toBe(true);

            await clickVideoSurface(setup.firstUser.page);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).paused).toBe(false);
        } finally {
            await Promise.all([setup.firstUser.context.close(), setup.secondUser.context.close()]);
        }
    });

    test('supports manual requestSync after local drift', async ({ browser }) => {
        const setup = await setupSharedPlayback(browser);

        try {
            await toggleSync(setup.secondUser.page);

            await seekTo(setup.secondUser.page, 2);
            await expectPlaybackNear(setup.secondUser.page, 2, 1);

            await seekTo(setup.firstUser.page, 10);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).currentTime < 6).toBe(true);

            await toggleSync(setup.secondUser.page);
            await requestSync(setup.secondUser.page);
            await expect.poll(async () => {
                const firstPlaybackState = await getPlaybackState(setup.firstUser.page);
                const secondPlaybackState = await getPlaybackState(setup.secondUser.page);
                return Math.abs(firstPlaybackState.currentTime - secondPlaybackState.currentTime);
            }).toBeLessThan(1.5);
        } finally {
            await Promise.all([setup.firstUser.context.close(), setup.secondUser.context.close()]);
        }
    });

    test('does not follow sync events when sync is disabled', async ({ browser }) => {
        const setup = await setupSharedPlayback(browser);

        try {
            const syncState = await getSyncControlState(setup.secondUser.page);
            expect(syncState.enabled).toBe(true);

            await toggleSync(setup.secondUser.page);
            await expect.poll(async () => (await getSyncControlState(setup.secondUser.page)).enabled).toBe(false);

            await seekTo(setup.firstUser.page, 8);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).currentTime < 5).toBe(true);

            await requestSync(setup.secondUser.page);
            await expect.poll(async () => (await getPlaybackState(setup.secondUser.page)).currentTime < 5).toBe(true);

            await toggleSync(setup.secondUser.page);
            await requestSync(setup.secondUser.page);
            await expect.poll(async () => {
                const firstPlaybackState = await getPlaybackState(setup.firstUser.page);
                const secondPlaybackState = await getPlaybackState(setup.secondUser.page);
                return Math.abs(firstPlaybackState.currentTime - secondPlaybackState.currentTime);
            }).toBeLessThan(1.5);
        } finally {
            await Promise.all([setup.firstUser.context.close(), setup.secondUser.context.close()]);
        }
    });

    test('keeps playback sync isolated across different rooms', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const thirdUser = await createIsolatedPage(browser);
        const video = TEST_VIDEOS[0];

        try {
            const firstLogin = await login(firstUser.page);
            await login(secondUser.page, { roomName: firstLogin.roomName });
            await login(thirdUser.page);

            await addPlaylistItem(firstUser.page, video);
            await playPlaylistItem(firstUser.page, video.title);
            await expectSourceToContain(secondUser.page, video.url);

            await seekTo(firstUser.page, 8);
            await expectPlaybackNear(secondUser.page, 8, 1.5);

            const thirdPlaybackState = await getPlaybackState(thirdUser.page);
            expect(thirdPlaybackState.source).toBeNull();
            expect(thirdPlaybackState.currentTime).toBe(0);
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                thirdUser.context.close(),
            ]);
        }
    });
});
