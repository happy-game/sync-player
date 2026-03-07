import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import {
    TEST_VIDEOS,
    PLAYER_BASE_URL,
    addPlaylistItem,
    enterPlayerPage,
    getSyncControlState,
    login,
    playPlaylistItem,
} from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('UI State Verification', () => {
    test('login page renders with all required elements', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();

            // Heading
            await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

            // Username field
            const usernameInput = loginModal.locator('label:has-text("用户名")').locator('..').locator('input');
            await expect(usernameInput).toBeVisible();
            await expect(usernameInput).toBeEnabled();

            // Room name field
            const roomNameInput = loginModal.locator('label:has-text("房间名")').locator('..').locator('input');
            await expect(roomNameInput).toBeVisible();
            await expect(roomNameInput).toBeEnabled();

            // Submit button
            const loginButton = loginModal.getByRole('button', { name: '登录' });
            await expect(loginButton).toBeVisible();
            await expect(loginButton).toBeEnabled();

            // Advanced options toggle
            const advancedButton = loginModal.getByRole('button', { name: '高级选项' });
            await expect(advancedButton).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('advanced options panel toggles on click', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await enterPlayerPage(page);

            const loginModal = page.locator('div:has(> h2:text("登录"))').first();
            const advancedButton = loginModal.getByRole('button', { name: '高级选项' });
            const apiBaseUrlInput = loginModal.locator('label:has-text("API Base URL")').locator('..').locator('input');

            // API Base URL input should be hidden initially
            await expect(apiBaseUrlInput).toBeHidden();

            // Click advanced options to reveal
            await advancedButton.click();
            await expect(apiBaseUrlInput).toBeVisible();

            // Click again to collapse
            await advancedButton.click();
            await expect(apiBaseUrlInput).toBeHidden();
        } finally {
            await context.close();
        }
    });

    test('player layout is visible after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            // Video player element should be present
            await expect(page.getByTestId('video-player')).toBeVisible();

            // Add-playlist card should be present
            await expect(page.getByTestId('add-playlist-card')).toBeVisible();

            // Playlist container should be visible
            await expect(page.locator('div.playlist-container').first()).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('user panel shows room info and control buttons after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const { username, roomName } = await login(page);

            // Room name and username should appear in the user panel
            await expect(page.locator(`text=房间: ${roomName}`)).toBeVisible();
            await expect(page.locator(`text=${username}`)).toBeVisible();

            // Sync control should be visible
            const syncState = await getSyncControlState(page);
            expect(['启用同步', '禁用同步']).toContain(syncState.toggleLabel);

            // Send sync and request sync buttons should be present
            const userPanel = page.locator('div.bg-white.rounded-lg.shadow-lg.p-4.w-80')
                .filter({ hasText: '房间:' })
                .first();
            await expect(userPanel.getByRole('button', { name: '获取进度' })).toBeVisible();
            await expect(userPanel.getByRole('button', { name: '发送进度' })).toBeVisible();
        } finally {
            await context.close();
        }
    });

    test('sync toggle button reflects current sync state', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            // Default state: sync is enabled
            const initialState = await getSyncControlState(page);
            expect(initialState.enabled).toBe(true);
            expect(initialState.toggleLabel).toBe('禁用同步');

            // Disable sync
            const userPanel = page.locator('div.bg-white.rounded-lg.shadow-lg.p-4.w-80')
                .filter({ hasText: '房间:' })
                .first();
            const controls = userPanel.locator('div.space-y-2 > div').first();
            await controls.getByRole('button', { name: '禁用同步' }).click();

            await expect.poll(async () => (await getSyncControlState(page)).enabled).toBe(false);
            await expect.poll(async () => (await getSyncControlState(page)).toggleLabel).toBe('启用同步');

            // Re-enable sync
            await controls.getByRole('button', { name: '启用同步' }).click();
            await expect.poll(async () => (await getSyncControlState(page)).enabled).toBe(true);
        } finally {
            await context.close();
        }
    });

    test('playlist heading is visible and add form is interactive', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            const playlistContainer = page.locator('div.playlist-container').first();
            await expect(playlistContainer.getByRole('heading', { name: '播放列表' })).toBeVisible();

            const addCard = page.getByTestId('add-playlist-card');
            const titleInput = addCard.getByTestId('add-playlist-title');
            const urlInput = addCard.getByTestId('add-playlist-url');
            const submitButton = addCard.getByTestId('add-playlist-submit');

            await expect(titleInput).toBeVisible();
            await expect(titleInput).toBeEnabled();
            await expect(urlInput).toBeVisible();
            await expect(urlInput).toBeEnabled();
            await expect(submitButton).toBeVisible();
            await expect(submitButton).toBeEnabled();
        } finally {
            await context.close();
        }
    });

    test('video player controls are present in DOM after a playlist item is selected', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);

            await addPlaylistItem(page, TEST_VIDEOS[0]);
            await playPlaylistItem(page, TEST_VIDEOS[0].title);

            const videoPlayer = page.getByTestId('video-player');
            await expect(videoPlayer).toBeVisible();

            // Video.js control bar is present in the DOM
            // (controls may be hidden by CSS until the user hovers; check for attachment)
            await expect(videoPlayer.locator('.vjs-control-bar').first()).toBeAttached();

            // Hover over the video to reveal the controls
            await videoPlayer.hover();

            // Video.js play/pause control button should now be visible
            const playControl = videoPlayer.locator('.vjs-play-control').first();
            await expect(playControl).toBeAttached();

            // Video.js progress bar should be in DOM
            const progressBar = videoPlayer.locator('.vjs-progress-control').first();
            await expect(progressBar).toBeAttached();
        } finally {
            await context.close();
        }
    });

    test('page URL stays at player base URL after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            await login(page);
            await expect(page).toHaveURL(new RegExp(`^${PLAYER_BASE_URL}/?$`));
        } finally {
            await context.close();
        }
    });
});
