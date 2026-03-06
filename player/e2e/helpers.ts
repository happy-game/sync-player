import { expect, Page } from '@playwright/test';
import testConfig from './test.config.json' with { type: 'json' };

export const PLAYER_BASE_URL = testConfig.playerBaseUrl;
export const DEFAULT_E2E_DELAY_MS = 300;
const DEFAULT_LOGIN_PREFIX = 'e2e';

export interface TestVideoConfig {
    url: string;
    title: string;
    duration: number;
    description: string;
}

export const TEST_VIDEOS = testConfig.testVideos as TestVideoConfig[];

export interface LoginOptions {
    username?: string;
    roomName?: string;
    apiBaseUrl?: string;
}

export interface PlaylistItemInput {
    title: string;
    url: string;
}

function createUniqueName(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAddPlaylistCard(page: Page) {
    return page.getByTestId('add-playlist-card');
}

function getPlaylistContainer(page: Page) {
    return page.locator('div.playlist-container').first();
}

export async function waitForUi(page: Page, delayMs: number = DEFAULT_E2E_DELAY_MS): Promise<void> {
    await page.waitForTimeout(delayMs);
}

export async function enterPlayerPage(page: Page): Promise<void> {
    await page.goto(PLAYER_BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`^${PLAYER_BASE_URL}/?$`));
}

export async function login(page: Page, options: LoginOptions = {}): Promise<{ username: string; roomName: string }> {
    const username = options.username ?? createUniqueName(`${DEFAULT_LOGIN_PREFIX}-user`);
    const roomName = options.roomName ?? createUniqueName(`${DEFAULT_LOGIN_PREFIX}-room`);

    await enterPlayerPage(page);

    const loginModal = page.locator('div:has(> h2:text("登录"))').first();
    await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();

    await loginModal.locator('label:has-text("用户名")').locator('..').locator('input').fill(username);
    await loginModal.locator('label:has-text("房间名")').locator('..').locator('input').fill(roomName);

    if (options.apiBaseUrl) {
        await loginModal.getByRole('button', { name: '高级选项' }).click();
        await loginModal.locator('label:has-text("API Base URL")').locator('..').locator('input').fill(options.apiBaseUrl);
    }

    await loginModal.getByRole('button', { name: '登录' }).click();

    await expect(loginModal).toBeHidden();
    await expect(page.locator(`text=房间: ${roomName}`)).toBeVisible();
    await expect(page.locator(`text=${username}`)).toBeVisible();

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('authToken'))).not.toBeNull();

    return { username, roomName };
}

export async function logout(page: Page): Promise<void> {
    const userPanel = page.locator('div.bg-white.rounded-lg.shadow-lg.p-4.w-80').filter({ hasText: '房间:' }).first();

    await expect(userPanel).toBeVisible();

    const logoutButton = userPanel.locator('button').nth(1);
    await Promise.all([
        page.waitForLoadState('domcontentloaded'),
        logoutButton.click(),
    ]);

    const loginModal = page.locator('div:has(> h2:text("登录"))').first();
    await expect(loginModal.getByRole('heading', { name: '登录' })).toBeVisible();
    await expect(userPanel).toBeHidden();

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('sync-player-session'))).toBeNull();
}

export async function addPlaylistItem(page: Page, item: PlaylistItemInput): Promise<void> {
    const addPlaylistCard = getAddPlaylistCard(page);
    await expect(addPlaylistCard).toBeVisible();

    await addPlaylistCard.getByTestId('add-playlist-title').fill(item.title);
    await addPlaylistCard.getByTestId('add-playlist-url').fill(item.url);
    await addPlaylistCard.getByTestId('add-playlist-submit').click();

    const playlistContainer = getPlaylistContainer(page);
    await expect(playlistContainer).toBeVisible();
    await expect(playlistContainer.locator('li').filter({ hasText: item.title })).toBeVisible();
}

export async function getPlaylistItems(page: Page): Promise<string[]> {
    const playlistContainer = getPlaylistContainer(page);
    await expect(playlistContainer.getByRole('heading', { name: '播放列表' })).toBeVisible();

    const itemTitles = playlistContainer.locator('li span.flex-1.font-medium');
    return itemTitles.allTextContents();
}

export async function deletePlaylistItem(page: Page, title: string): Promise<void> {
    const playlistContainer = getPlaylistContainer(page);
    const playlistItem = playlistContainer.locator('li').filter({ hasText: title }).first();

    await expect(playlistItem).toBeVisible();
    await playlistItem.getByRole('button', { name: '删除' }).click();
    await expect(playlistItem).toBeHidden();
}
