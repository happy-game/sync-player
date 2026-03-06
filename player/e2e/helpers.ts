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

export interface PlaylistEntryInfo {
    title: string;
    isPlaying: boolean;
    canPlay: boolean;
    canMoveTop: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
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

export interface SyncControlState {
    enabled: boolean;
    toggleLabel: string;
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

function getPlaylistItem(page: Page, title: string) {
    return getPlaylistContainer(page).locator('li').filter({ hasText: title }).first();
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

function getCurrentUserControls(page: Page) {
    return getUserPanel(page).locator('div.space-y-2 > div').first();
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
    await page.reload();
    const sortedExpectedUsernames = [...expectedUsernames].sort();

    await expect.poll(async () => {
        const roomInfo = await getRoomInfo(page);
        return roomInfo.users.map((user) => user.username).sort();
    }).toEqual(sortedExpectedUsernames);
}

export async function getSyncControlState(page: Page): Promise<SyncControlState> {
    const currentUserControls = getCurrentUserControls(page);
    const toggleButton = currentUserControls.getByRole('button', { name: /禁用同步|启用同步/ });
    await expect(toggleButton).toBeVisible();

    const toggleLabel = (await toggleButton.textContent())?.trim() ?? '';
    return {
        enabled: toggleLabel === '禁用同步',
        toggleLabel,
    };
}

export async function toggleSync(page: Page): Promise<SyncControlState> {
    const beforeState = await getSyncControlState(page);
    const currentUserControls = getCurrentUserControls(page);
    const toggleButton = currentUserControls.getByRole('button', { name: beforeState.toggleLabel });
    await toggleButton.click();

    const nextLabel = beforeState.enabled ? '启用同步' : '禁用同步';
    await expect.poll(async () => (await getSyncControlState(page)).toggleLabel).toBe(nextLabel);
    return getSyncControlState(page);
}

export async function requestSync(page: Page): Promise<void> {
    const currentUserControls = getCurrentUserControls(page);
    const requestButton = currentUserControls.getByRole('button', { name: '获取进度' });
    await expect(requestButton).toBeVisible();
    await requestButton.click();
}

export async function sendSync(page: Page): Promise<void> {
    const currentUserControls = getCurrentUserControls(page);
    const sendButton = currentUserControls.getByRole('button', { name: '发送进度' });
    await expect(sendButton).toBeVisible();
    await sendButton.click();
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
    return (await itemTitles.allTextContents()).map((title) => title.trim());
}

export async function expectPlaylistTitles(page: Page, expectedTitles: string[]): Promise<void> {
    await expect.poll(async () => getPlaylistItems(page)).toEqual(expectedTitles);
}

export async function getPlaylistEntries(page: Page): Promise<PlaylistEntryInfo[]> {
    const playlistContainer = getPlaylistContainer(page);
    await expect(playlistContainer.getByRole('heading', { name: '播放列表' })).toBeVisible();

    const items = playlistContainer.locator('li');
    const itemCount = await items.count();
    const entries: PlaylistEntryInfo[] = [];

    for (let index = 0; index < itemCount; index += 1) {
        const item = items.nth(index);
        const title = (await item.locator('span.flex-1.font-medium').textContent())?.trim();

        if (!title) {
            continue;
        }

        const className = await item.getAttribute('class');
        entries.push({
            title,
            isPlaying: className?.includes('bg-green-50') ?? false,
            canPlay: await item.getByRole('button', { name: '播放' }).isEnabled(),
            canMoveTop: await item.getByRole('button', { name: '置顶' }).isEnabled(),
            canMoveUp: await item.getByRole('button', { name: '上移' }).isEnabled(),
            canMoveDown: await item.getByRole('button', { name: '下移' }).isEnabled(),
        });
    }

    return entries;
}

export async function deletePlaylistItem(page: Page, title: string): Promise<void> {
    const playlistItem = getPlaylistItem(page, title);

    await expect(playlistItem).toBeVisible();
    await playlistItem.getByRole('button', { name: '删除' }).click();
    await expect(playlistItem).toBeHidden();
}

export async function movePlaylistItem(page: Page, title: string, direction: 'top' | 'up' | 'down'): Promise<void> {
    const playlistItem = getPlaylistItem(page, title);
    const buttonName = direction === 'top' ? '置顶' : direction === 'up' ? '上移' : '下移';

    await expect(playlistItem).toBeVisible();
    await playlistItem.getByRole('button', { name: buttonName }).click();
}

export async function clearPlaylist(page: Page): Promise<void> {
    const playlistContainer = getPlaylistContainer(page);
    const clearButton = playlistContainer.getByRole('button', { name: '清空播放列表' });

    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect.poll(async () => getPlaylistItems(page)).toEqual([]);
    await expect(clearButton).toBeHidden();
}

export async function playPlaylistItem(page: Page, title: string): Promise<void> {
    const playlistItem = getPlaylistItem(page, title);

    await expect(playlistItem).toBeVisible();
    await playlistItem.getByRole('button', { name: '播放' }).click();
    await expectCurrentPlaylistItem(page, title);
}

export async function expectCurrentPlaylistItem(page: Page, title: string): Promise<void> {
    await expect.poll(async () => {
        const entries = await getPlaylistEntries(page);
        const playingEntry = entries.find((entry) => entry.isPlaying);
        return playingEntry?.title ?? null;
    }).toBe(title);

    await expect.poll(async () => {
        const currentTitle = page.locator('input#title[disabled]').first();
        return (await currentTitle.inputValue()) || null;
    }).toBe(title);
}

export async function clickVideoSurface(page: Page): Promise<void> {
    const videoElement = getVideoElement(page);
    await expect(videoElement).toBeVisible();
    await videoElement.click({ force: true, position: { x: 16, y: 16 } });
}

export async function waitForPlaybackTime(page: Page, minSeconds: number): Promise<void> {
    await expect.poll(async () => (await getPlaybackState(page)).currentTime).toBeGreaterThan(minSeconds);
}

export async function expectPlaybackNear(page: Page, expectedSeconds: number, tolerance: number = 1.5): Promise<void> {
    await expect.poll(async () => {
        const currentTime = (await getPlaybackState(page)).currentTime;
        return Math.abs(currentTime - expectedSeconds);
    }).toBeLessThan(tolerance);
}

export async function expectSourceToContain(page: Page, sourceFragment: string): Promise<void> {
    await expect.poll(async () => (await getPlaybackState(page)).source).toContain(sourceFragment);
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
