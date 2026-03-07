import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    PLAYER_BASE_URL,
    TEST_VIDEOS,
    addPlaylistItem,
    enterPlayerPage,
    expectCurrentPlaylistItem,
    expectSourceToContain,
    getPlaybackState,
    login,
    playPlaylistItem,
    setMuted,
    waitForUi,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('UI State Verification E2E', () => {
    test('login page renders correctly with interactive fields', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

            const usernameInput = loginModal.locator('label:has-text("用户名")').locator('..').locator('input');
            const roomNameInput = loginModal.locator('label:has-text("房间名")').locator('..').locator('input');
            await expect(usernameInput).toBeVisible();
            await expect(roomNameInput).toBeVisible();

            await usernameInput.fill('test-user');
            await expect(usernameInput).toHaveValue('test-user');

            await roomNameInput.fill('test-room');
            await expect(roomNameInput).toHaveValue('test-room');

            const loginButton = loginModal.getByRole('button', { name: '登录' });
            await expect(loginButton).toBeVisible();
            await expect(loginButton).toBeEnabled();

            const advancedButton = loginModal.getByRole('button', { name: '高级选项' });
            await expect(advancedButton).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('advanced options toggle shows API Base URL field', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

            const apiUrlInput = loginModal.locator('label:has-text("API Base URL")').locator('..').locator('input');
            await expect(apiUrlInput).toBeHidden();

            await loginModal.getByRole('button', { name: '高级选项' }).click();
            await expect(apiUrlInput).toBeVisible();

            await loginModal.getByRole('button', { name: '高级选项' }).click();
            await expect(apiUrlInput).toBeHidden();
        } finally {
            await context.close();
        }
    });

    test('player controls visibility after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const videoPlayer = page.getByTestId('video-player');
            await expect(videoPlayer).toBeVisible();

            const addPlaylistCard = page.getByTestId('add-playlist-card');
            await expect(addPlaylistCard).toBeVisible();
            await expect(addPlaylistCard.getByTestId('add-playlist-title')).toBeVisible();
            await expect(addPlaylistCard.getByTestId('add-playlist-url')).toBeVisible();
            await expect(addPlaylistCard.getByTestId('add-playlist-submit')).toBeVisible();

            const playlistContainer = page.locator('div.playlist-container').first();
            await expect(playlistContainer.getByRole('heading', { name: '播放列表' })).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('room panel shows user info and sync controls after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const { username, roomName } = await login(page);

            const userPanel = page.locator('div.bg-white.rounded-lg.shadow-lg.p-4.w-80').filter({ hasText: '房间:' }).first();
            await expect(userPanel).toBeVisible();

            await expect(userPanel.locator(`text=房间: ${roomName}`)).toBeVisible();
            await expect(userPanel.locator(`text=${username}`)).toBeVisible();

            const requestSyncButton = userPanel.getByRole('button', { name: '获取进度' });
            const sendSyncButton = userPanel.getByRole('button', { name: '发送进度' });
            const toggleSyncButton = userPanel.getByRole('button', { name: /禁用同步|启用同步/ });

            await expect(requestSyncButton).toBeVisible();
            await expect(sendSyncButton).toBeVisible();
            await expect(toggleSyncButton).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('play/pause button reflects actual playback state', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const video = TEST_VIDEOS[0];
            await login(page);
            await addPlaylistItem(page, video);
            await playPlaylistItem(page, video.title);
            await expectSourceToContain(page, video.url);
            await setMuted(page, true);

            // The play control button exists in the DOM but may be hidden when controls auto-hide
            const playToggle = page.getByTestId('video-player').locator('.vjs-play-control').first();
            await expect(playToggle).toBeAttached();

            const playbackState = await getPlaybackState(page);
            if (playbackState.paused) {
                await expect(playToggle).toHaveClass(/vjs-paused/);
            } else {
                await expect(playToggle).toHaveClass(/vjs-playing/);
            }
        } finally {
            await context.close();
        }
    });
});
