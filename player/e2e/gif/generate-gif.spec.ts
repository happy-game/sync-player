/**
 * Playwright script for recording sync-player demo videos.
 *
 * This script opens two browser windows side-by-side, simulating two users
 * in the same room, and records several synchronization scenarios.
 *
 * The resulting .webm files are later merged by convert-to-gif.sh.
 *
 * Usage:
 *   npx playwright test e2e/gif/generate-gif.ts --project=chromium
 */

import { existsSync, mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Browser, BrowserContext, Page, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    addPlaylistItem,
    clickVideoSurface,
    expectCurrentPlaylistItem,
    expectPlaybackNear,
    expectSourceToContain,
    getPlaybackState,
    login,
    pause,
    play,
    playPlaylistItem,
    seekTo,
    setMuted,
} from '../helpers.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Viewport for each recorded window */
const VP = { width: 960, height: 720 };

/** Directory to store the final named videos */
const OUTPUT_DIR = path.resolve(__dirname, '../../../docs/gifs');

/** Pause between operations so the GIF is easy to follow */
const VISUAL_DELAY = 1500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inject a floating label ("User A" / "User B") on the page corner */
async function injectUserLabel(page: Page, label: string, color: string) {
    await page.evaluate(
        ({ label, color }) => {
            const el = document.createElement('div');
            el.id = 'gif-user-label';
            el.textContent = label;
            Object.assign(el.style, {
                position: 'fixed',
                top: '12px',
                left: '12px',
                zIndex: '99999',
                background: color,
                color: '#fff',
                padding: '6px 16px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                pointerEvents: 'none',
            });
            document.body.appendChild(el);
        },
        { label, color },
    );
}

/** Inject a floating action hint at page bottom */
async function injectActionHint(page: Page, text: string) {
    await page.evaluate((hint) => {
        let el = document.getElementById('gif-action-hint');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gif-action-hint';
            Object.assign(el.style, {
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: '99999',
                background: 'rgba(0,0,0,0.75)',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: '500',
                fontFamily: 'sans-serif',
                pointerEvents: 'none',
                transition: 'opacity 0.3s',
                whiteSpace: 'nowrap',
            });
            document.body.appendChild(el);
        }
        el.textContent = hint;
        el.style.opacity = '1';
    }, text);
}

async function clearActionHint(page: Page) {
    await page.evaluate(() => {
        const el = document.getElementById('gif-action-hint');
        if (el) el.style.opacity = '0';
    });
}

/** Create a browser context with video recording enabled */
async function createRecordingContext(
    browser: Browser,
    videoDir: string,
): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext({
        viewport: VP,
        recordVideo: { dir: videoDir, size: VP },
    });
    const page = await context.newPage();
    return { context, page };
}

/** Shared setup: two users login to the same room, add & play a video */
async function setupSharedRoom(
    browser: Browser,
    videoDirA: string,
    videoDirB: string,
) {
    const userA = await createRecordingContext(browser, videoDirA);
    const userB = await createRecordingContext(browser, videoDirB);

    const loginA = await login(userA.page, { username: 'Alice' });
    await injectUserLabel(userA.page, 'User A (Alice)', '#2563eb');

    await login(userB.page, { username: 'Bob', roomName: loginA.roomName });
    await injectUserLabel(userB.page, 'User B (Bob)', '#16a34a');

    const video = TEST_VIDEOS[0];
    await addPlaylistItem(userA.page, video);
    await playPlaylistItem(userA.page, video.title);

    await expectCurrentPlaylistItem(userA.page, video.title);
    await expectCurrentPlaylistItem(userB.page, video.title);
    await expectSourceToContain(userA.page, video.url);
    await expectSourceToContain(userB.page, video.url);

    await setMuted(userA.page, true);
    await setMuted(userB.page, true);

    // Let playback start and stabilise
    await userA.page.waitForTimeout(VISUAL_DELAY);

    return { userA, userB, video };
}

/** Close contexts and return video paths */
async function teardownAndGetVideos(
    contextA: BrowserContext,
    contextB: BrowserContext,
    pageA: Page,
    pageB: Page,
): Promise<{ videoPathA: string; videoPathB: string }> {
    const videoPathA = (await pageA.video()?.path()) ?? '';
    const videoPathB = (await pageB.video()?.path()) ?? '';

    await contextA.close();
    await contextB.close();

    return { videoPathA, videoPathB };
}

function ensureDir(dir: string) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/** Move videos to output dir with proper names */
function moveVideos(
    videoPathA: string,
    videoPathB: string,
    scenarioName: string,
) {
    ensureDir(OUTPUT_DIR);
    const destA = path.join(OUTPUT_DIR, `${scenarioName}-user-a.webm`);
    const destB = path.join(OUTPUT_DIR, `${scenarioName}-user-b.webm`);
    if (videoPathA) renameSync(videoPathA, destA);
    if (videoPathB) renameSync(videoPathB, destB);
    console.log(`  ✅ Videos saved: ${destA}, ${destB}`);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

test.describe('Generate sync demo videos', () => {
    test.setTimeout(120_000);

    test('seek-sync', async ({ browser }) => {
        const tmpA = path.join(OUTPUT_DIR, '_tmp_seek_a');
        const tmpB = path.join(OUTPUT_DIR, '_tmp_seek_b');
        ensureDir(tmpA);
        ensureDir(tmpB);

        const { userA, userB } = await setupSharedRoom(browser, tmpA, tmpB);

        try {
            // Ensure playback is running
            await play(userA.page);
            await userA.page.waitForTimeout(VISUAL_DELAY);

            // Show the seek action
            await injectActionHint(userA.page, '⏩ User A 跳转到 8s');
            await injectActionHint(userB.page, '⏳ 等待同步...');
            await userA.page.waitForTimeout(800);

            await seekTo(userA.page, 8);

            await injectActionHint(userB.page, '✅ User B 自动同步到 8s');
            await expectPlaybackNear(userB.page, 8, 2);

            await userA.page.waitForTimeout(VISUAL_DELAY);
            await clearActionHint(userA.page);
            await clearActionHint(userB.page);
            await userA.page.waitForTimeout(500);
        } finally {
            const { videoPathA, videoPathB } = await teardownAndGetVideos(
                userA.context,
                userB.context,
                userA.page,
                userB.page,
            );
            moveVideos(videoPathA, videoPathB, 'seek-sync');
        }
    });

    test('pause-resume-sync', async ({ browser }) => {
        const tmpA = path.join(OUTPUT_DIR, '_tmp_pause_a');
        const tmpB = path.join(OUTPUT_DIR, '_tmp_pause_b');
        ensureDir(tmpA);
        ensureDir(tmpB);

        const { userA, userB } = await setupSharedRoom(browser, tmpA, tmpB);

        try {
            // Ensure playing
            await play(userA.page);
            await userA.page.waitForTimeout(VISUAL_DELAY);

            // --- Pause ---
            await injectActionHint(userA.page, '⏸ User A 暂停');
            await injectActionHint(userB.page, '⏳ 等待同步...');
            await userA.page.waitForTimeout(800);

            await clickVideoSurface(userA.page);

            // Wait for pause to propagate
            let attempts = 0;
            while (attempts < 20) {
                const stateB = await getPlaybackState(userB.page);
                if (stateB.paused) break;
                await userB.page.waitForTimeout(200);
                attempts++;
            }

            await injectActionHint(userB.page, '✅ User B 已暂停');
            await userA.page.waitForTimeout(VISUAL_DELAY);

            // --- Resume ---
            await injectActionHint(userA.page, '▶️ User A 继续播放');
            await injectActionHint(userB.page, '⏳ 等待同步...');
            await userA.page.waitForTimeout(800);

            await clickVideoSurface(userA.page);

            attempts = 0;
            while (attempts < 20) {
                const stateB = await getPlaybackState(userB.page);
                if (!stateB.paused) break;
                await userB.page.waitForTimeout(200);
                attempts++;
            }

            await injectActionHint(userB.page, '✅ User B 已恢复播放');
            await userA.page.waitForTimeout(VISUAL_DELAY);

            await clearActionHint(userA.page);
            await clearActionHint(userB.page);
            await userA.page.waitForTimeout(500);
        } finally {
            const { videoPathA, videoPathB } = await teardownAndGetVideos(
                userA.context,
                userB.context,
                userA.page,
                userB.page,
            );
            moveVideos(videoPathA, videoPathB, 'pause-resume-sync');
        }
    });

    test('playlist-sync', async ({ browser }) => {
        const tmpA = path.join(OUTPUT_DIR, '_tmp_playlist_a');
        const tmpB = path.join(OUTPUT_DIR, '_tmp_playlist_b');
        ensureDir(tmpA);
        ensureDir(tmpB);

        const { userA, userB, video: firstVideo } = await setupSharedRoom(browser, tmpA, tmpB);
        const secondVideo = TEST_VIDEOS[1];

        try {
            await play(userA.page);
            await userA.page.waitForTimeout(VISUAL_DELAY);

            // Add second video
            await addPlaylistItem(userA.page, secondVideo);
            await userA.page.waitForTimeout(800);

            // Switch to second video
            await injectActionHint(userA.page, `🔄 User A 切换到「${secondVideo.title}」`);
            await injectActionHint(userB.page, '⏳ 等待同步...');
            await userA.page.waitForTimeout(800);

            await playPlaylistItem(userA.page, secondVideo.title);

            await expectCurrentPlaylistItem(userB.page, secondVideo.title);
            await expectSourceToContain(userB.page, secondVideo.url);

            await injectActionHint(userB.page, `✅ User B 自动切换到「${secondVideo.title}」`);
            await userA.page.waitForTimeout(VISUAL_DELAY);

            await clearActionHint(userA.page);
            await clearActionHint(userB.page);
            await userA.page.waitForTimeout(500);
        } finally {
            const { videoPathA, videoPathB } = await teardownAndGetVideos(
                userA.context,
                userB.context,
                userA.page,
                userB.page,
            );
            moveVideos(videoPathA, videoPathB, 'playlist-sync');
        }
    });
});
