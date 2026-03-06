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

export interface PlaybackState {
    paused: boolean;
    muted: boolean;
    currentTime: number;
    duration: number | null;
    source: string | null;
    ended: boolean;
    readyState: number;
}

export interface RoomUserInfo {
    username: string;
    online: boolean;
    isCurrentUser: boolean;
}

export interface RoomInfo {
    roomName: string;
    roomId: number;
    users: RoomUserInfo[];
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

function getVideoPlayer(page: Page) {
    return page.getByTestId('video-player');
}

function getVideoElement(page: Page) {
    return getVideoPlayer(page).locator('.vjs-tech').first();
}

function getPlayToggleButton(page: Page) {
    return getVideoPlayer(page).locator('.vjs-play-control').first();
}

function getUserPanel(page: Page) {
    return page.locator('div.bg-white.rounded-lg.shadow-lg.p-4.w-80').filter({ hasText: '房间:' }).first();
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
    const userPanel = getUserPanel(page);

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

export async function getRoomInfo(page: Page): Promise<RoomInfo> {
    const userPanel = getUserPanel(page);
    await expect(userPanel).toBeVisible();

    const roomHeader = userPanel.locator('div.text-sm.font-medium').first();
    const roomHeaderText = (await roomHeader.textContent())?.trim() ?? '';
    const roomMatch = roomHeaderText.match(/^房间:\s*(.+)\((\d+)\)$/);

    if (!roomMatch) {
        throw new Error(`Failed to parse room info from text: ${roomHeaderText}`);
    }

    const [, roomName, roomIdText] = roomMatch;

    const userRows = userPanel.locator('div.space-y-2 > div');
    const rowCount = await userRows.count();
    const users: RoomUserInfo[] = [];

    for (let index = 0; index < rowCount; index += 1) {
        const row = userRows.nth(index);
        const usernameNode = row.locator('div.text-sm').last();
        const username = (await usernameNode.textContent())?.trim();

        if (!username) {
            continue;
        }

        const statusDot = row.locator('div.h-2.w-2.rounded-full').first();
        const statusClass = await statusDot.getAttribute('class');
        users.push({
            username,
            online: statusClass?.includes('bg-green-500') ?? false,
            isCurrentUser: index === 0,
        });
    }

    return {
        roomName: roomName.trim(),
        roomId: Number.parseInt(roomIdText, 10),
        users,
    };
}

export async function expectRoomUsers(page: Page, expectedUsernames: string[]): Promise<void> {
    const sortedExpectedUsernames = [...expectedUsernames].sort();

    await expect.poll(async () => {
        const roomInfo = await getRoomInfo(page);
        return roomInfo.users.map((user) => user.username).sort();
    }).toEqual(sortedExpectedUsernames);
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

export async function getPlaybackState(page: Page): Promise<PlaybackState> {
    const videoElement = getVideoElement(page);
    await expect(videoElement).toBeVisible();

    return videoElement.evaluate((element) => {
        const video = element as HTMLVideoElement;
        return {
            paused: video.paused,
            muted: video.muted,
            currentTime: video.currentTime,
            duration: Number.isFinite(video.duration) ? video.duration : null,
            source: video.currentSrc || null,
            ended: video.ended,
            readyState: video.readyState,
        };
    });
}

export async function setMuted(page: Page, muted: boolean = true): Promise<void> {
    const videoElement = getVideoElement(page);
    await expect(videoElement).toBeVisible();

    await videoElement.evaluate((element, shouldMute) => {
        const video = element as HTMLVideoElement;
        video.muted = shouldMute;
        video.defaultMuted = shouldMute;
    }, muted);

    await expect.poll(async () => (await getPlaybackState(page)).muted).toBe(muted);
}

export async function play(page: Page): Promise<void> {
    await expect(getVideoPlayer(page)).toBeVisible();
    await expect.poll(async () => (await getPlaybackState(page)).source).not.toBeNull();

    await setMuted(page, true);

    const playbackState = await getPlaybackState(page);
    if (!playbackState.paused) {
        return;
    }

    await getPlayToggleButton(page).click();
    await expect.poll(async () => (await getPlaybackState(page)).paused).toBe(false);
}

export async function pause(page: Page): Promise<void> {
    await expect(getVideoPlayer(page)).toBeVisible();
    await expect.poll(async () => (await getPlaybackState(page)).source).not.toBeNull();

    const playbackState = await getPlaybackState(page);
    if (playbackState.paused) {
        return;
    }

    await getPlayToggleButton(page).click();
    await expect.poll(async () => (await getPlaybackState(page)).paused).toBe(true);
}

export async function seekTo(page: Page, seconds: number): Promise<void> {
    const videoElement = getVideoElement(page);
    await expect(videoElement).toBeVisible();
    await expect.poll(async () => (await getPlaybackState(page)).readyState).toBeGreaterThan(0);

    await videoElement.evaluate((element, targetTime) => {
        const video = element as HTMLVideoElement;
        video.currentTime = targetTime;
    }, seconds);

    await expect.poll(async () => (await getPlaybackState(page)).currentTime).toBeCloseTo(seconds, 1);
}
