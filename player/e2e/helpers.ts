import { Page, expect } from '@playwright/test';
import testConfig from './test.config.json' with { type: 'json' };

/**
 * Type Definitions
 */
export interface UserInfo {
    userId: number;
    username: string;
    roomId: number;
    roomName: string;
    root: boolean;
}

export interface RoomInfo {
    roomId: number;
    roomName: string;
}

export interface PlaybackState {
    currentTime: number;
    duration: number;
    paused: boolean;
    videoUrl: string;
    videoTitle?: string;
    readyState: number;
    volume: number;
    muted: boolean;
}

export interface PlaylistItem {
    id: number;
    title: string;
    url: string;
    duration?: number;
}

export interface TestVideo {
    url: string;
    title: string;
    duration: number;
    description: string;
}

/**
 * Utility Helpers
 */

/**
 * Log message only if DEBUG env var is set
 */
export function debugLog(message: string) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}

/**
 * Generate a unique room name
 */
export function generateRoomName(): string {
    return `test-room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a unique username
 */
export function generateUsername(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Get a test video configuration
 */
export function getTestVideo(index: number = 0): TestVideo {
    return testConfig.testVideos[index] || testConfig.testVideos[0];
}

/**
 * Authentication & Login Helpers
 */

/**
 * Login and join/create a room
 */
export async function loginAndJoinRoom(page: Page, username: string, roomName: string): Promise<boolean> {
    try {
        await page.goto('/');

        // Wait for the login modal to appear
        await expect(page.locator('div.fixed.inset-0')).toBeVisible({ timeout: 10000 });

        // Fill in username
        const usernameInput = page.locator('input[type="text"]').first();
        await usernameInput.fill(username);

        // Fill in room name
        const roomNameInput = page.locator('input[type="text"]').nth(1);
        await roomNameInput.fill(roomName);

        // Click login button
        const loginButton = page.locator('button[type="submit"]');
        await loginButton.click();

        // Wait for modal to close (login successful)
        try {
            await expect(page.locator('div.fixed.inset-0')).not.toBeVisible({ timeout: 5000 });
        } catch (e) {
            // Check for error messages
            const errorMsg = await page.locator('.text-red-500').textContent().catch(() => null);
            if (errorMsg) {
                console.error(`Login failed with UI error: ${errorMsg}`);
            } else {
                console.error('Login modal did not close, but no error message found.');
            }
            throw e;
        }

        // Wait for player to be visible to confirm successful join
        await expect(page.locator('video#videojs-player, .video-js')).toBeVisible({ timeout: 10000 });

        return true;
    } catch (e) {
        console.error('Login failed:', e);
        return false;
    }
}

/**
 * Check if user is currently logged in (in a room)
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
    const modalVisible = await page.locator('div.fixed.inset-0').isVisible().catch(() => false);
    return !modalVisible;
}

/**
 * Get the current auth token from localStorage
 */
export async function getAuthToken(page: Page): Promise<string | null> {
    return await page.evaluate(() => localStorage.getItem('authToken'));
}

/**
 * Get user info from cookies
 */
export async function getUserInfo(page: Page): Promise<UserInfo | null> {
    const cookies = await page.context().cookies();
    const userInfoCookie = cookies.find(c => c.name === 'userInfo');

    if (userInfoCookie) {
        try {
            return JSON.parse(decodeURIComponent(userInfoCookie.value));
        } catch (e) {
            console.error('Failed to parse userInfo cookie:', e);
        }
    }
    return null;
}

/**
 * Logout and clear session
 */
export async function logout(page: Page): Promise<void> {
    await page.evaluate(() => {
        // Clear all cookies
        document.cookie.split(';').forEach((cookie: string) => {
            document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
        // Clear localStorage
        localStorage.clear();
    });
    await page.reload();
}

/**
 * Room Management Helpers
 */

/**
 * Get current room info
 */
export async function getRoomInfo(page: Page): Promise<RoomInfo | null> {
    const userInfo = await getUserInfo(page);
    if (userInfo) {
        return {
            roomId: userInfo.roomId,
            roomName: userInfo.roomName
        };
    }
    return null;
}

/**
 * Get list of users in the current room from Pinia store
 */
export async function getRoomUserList(page: Page): Promise<any[]> {
    return await page.evaluate(async () => {
        // Try to use the exposed userStore to fetch the latest list (available in dev mode)
        const userStore = (window as any).userStore;
        if (userStore) {
            try {
                if (typeof userStore.fetchOnlineUsers === 'function') {
                    await userStore.fetchOnlineUsers();
                }
                return userStore.userList || [];
            } catch (e) {
                console.error('Failed to fetch user list via userStore:', e);
            }
        }

        const store = (window as any).__PINIA__;
        return store?.state.value.user?.userList || [];
    });
}

/**
 * Playlist Management Helpers
 */

/**
 * Get the current playlist from API
 */
export async function getPlaylist(page: Page): Promise<PlaylistItem[]> {
    return await page.evaluate(async () => {
        // Try to use exposed stores (available in dev mode)
        const playlistStore = (window as any).playlistStore;
        const userStore = (window as any).userStore;

        if (playlistStore && userStore && userStore.roomId) {
            try {
                if (typeof playlistStore.fetchPlaylist === 'function') {
                    await playlistStore.fetchPlaylist(userStore.roomId);
                }
                // Return reactive value or plain array
                return playlistStore.playlist || [];
            } catch (e) {
                console.error('Failed to fetch playlist via playlistStore:', e);
            }
        }

        // Fallback to manual API call
        const authToken = localStorage.getItem('authToken');
        const store = (window as any).__PINIA__;
        const roomId = store?.state.value.user?.roomId;

        if (!authToken || !roomId) return [];

        try {
            const response = await fetch(`/api/playlist/query?roomId=${roomId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error('Failed to fetch playlist:', e);
        }
        return [];
    });
}

/**
 * Add a video to the playlist
 */
export async function addVideoToPlaylist(page: Page, videoUrl: string, title?: string): Promise<boolean> {
    const finalTitle = title || 'Test Video';

    return await page.evaluate(async ({ url, title }) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return false;

        try {
            const response = await fetch('/api/playlist/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    title: title,
                    sources: [{
                        url: url,
                        label: '默认'
                    }]
                })
            });
            if (!response.ok) {
                console.error(`addVideoToPlaylist failed: ${response.status} ${response.statusText}`);
            }
            return response.ok;
        } catch (e) {
            console.error('Failed to add video:', e);
            return false;
        }
    }, { url: videoUrl, title: finalTitle });
}

/**
 * Switch to a specific video in the playlist
 */
export async function switchToVideo(page: Page, playlistItemId?: number): Promise<boolean> {
    return await page.evaluate(async (itemId) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return false;

        try {
            // If no itemId provided, get the first one from playlist
            let targetId = itemId;
            if (!targetId) {
                const store = (window as any).__PINIA__;
                const roomId = store?.state.value.user?.roomId;
                if (!roomId) return false;

                const listRes = await fetch(`/api/playlist/query?roomId=${roomId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const list = await listRes.json();
                if (!list || list.length === 0) return false;
                targetId = list[0].id;
            }

            const response = await fetch('/api/playlist/switch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    playlistItemId: targetId
                })
            });
            return response.ok;
        } catch (e) {
            console.error('Failed to switch video:', e);
            return false;
        }
    }, playlistItemId);
}

/**
 * Remove a video from playlist
 */
export async function removeVideoFromPlaylist(page: Page, playlistItemId: number): Promise<boolean> {
    return await page.evaluate(async (id) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return false;

        try {
            const response = await fetch('/api/playlist/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    id: id
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`removeVideoFromPlaylist failed: ${response.status} ${response.statusText}`, errorText);
            }
            return response.ok;
        } catch (e) {
            console.error('Failed to remove video:', e);
            return false;
        }
    }, playlistItemId);
}

/**
 * Playback State Helpers
 */

/**
 * Wait for video player to be ready
 */
export async function waitForPlayerReady(page: Page, timeout: number = 15000): Promise<boolean> {
    const startTime = Date.now();

    // First, let's debug what's available
    const debugInfo = await page.evaluate(() => {
        return {
            hasPlayer: typeof (window as any).player !== 'undefined',
            hasVideojs: typeof (window as any).videojs !== 'undefined',
            hasVideoElement: !!document.querySelector('#videojs-player'),
            hasVideoJsClass: !!document.querySelector('.video-js'),
            hasVideo: !!document.querySelector('video')
        };
    });

    console.log('[waitForPlayerReady] Debug info:', debugInfo);

    // Step 1: Wait for video source to be set
    console.log('[waitForPlayerReady] Step 1: Waiting for video source...');
    let hasSrc = false;
    while (Date.now() - startTime < timeout && !hasSrc) {
        try {
            const srcCheck = await page.evaluate(() => {
                const player = (window as any).player;
                if (player) {
                    const currentSrc = player.currentSrc();
                    return !!currentSrc;
                }
                const videoElement = document.querySelector('.video-js video') as HTMLVideoElement;
                if (videoElement) {
                    return !!videoElement.currentSrc;
                }
                return false;
            });

            if (srcCheck) {
                hasSrc = true;
                console.log('[waitForPlayerReady] Video source is set!');
                break;
            }

            await page.waitForTimeout(200);
        } catch (error) {
            console.error(`Error checking video source: ${error}`);
            await page.waitForTimeout(200);
        }
    }

    if (!hasSrc) {
        console.log('[waitForPlayerReady] Timeout waiting for video source');
        return false;
    }

    // Step 2: Wait for readyState >= 1 (HAVE_METADATA)
    console.log('[waitForPlayerReady] Step 2: Waiting for readyState >= 1...');
    while (Date.now() - startTime < timeout) {
        try {
            const result = await page.evaluate(() => {
                let player = (window as any).player;

                if (!player && (window as any).videojs) {
                    try {
                        player = (window as any).videojs('videojs-player');
                    } catch (e) {
                        // videojs might not have initialized yet
                    }
                }

                if (player) {
                    const readyState = player.readyState();
                    const currentSrc = player.currentSrc();
                    return { ready: readyState >= 1, readyState, currentSrc };
                }

                const videoElement = document.querySelector('.video-js video') as HTMLVideoElement;
                if (videoElement) {
                    const readyState = videoElement.readyState;
                    const currentSrc = videoElement.currentSrc;
                    return { ready: readyState >= 1, readyState, currentSrc };
                }

                return { ready: false, readyState: -1, currentSrc: '' };
            });

            if (result.ready) {
                console.log('[waitForPlayerReady] Player is ready! readyState:', result.readyState);
                return true;
            }

            // Wait a bit before checking again
            await page.waitForTimeout(500);
        } catch (error) {
            console.error(`Error waiting for player: ${error}`);
            await page.waitForTimeout(500);
        }
    }

    console.log('[waitForPlayerReady] Timeout waiting for player readyState');
    return false;
}

/**
 * Get comprehensive playback state
 */
export async function getPlaybackState(page: Page): Promise<PlaybackState | null> {
    try {
        return await page.evaluate(() => {
            // Try to get exposed player first
            const player = (window as any).player || (window as any).videojs?.('videojs-player');
            if (!player) return null;

            return {
                currentTime: player.currentTime(),
                duration: player.duration(),
                paused: player.paused(),
                videoUrl: player.currentSrc(),
                readyState: player.readyState(),
                volume: player.volume(),
                muted: player.muted()
            };
        });
    } catch (e) {
        console.error('Error getting playback state:', e);
        return null;
    }
}

/**
 * Get current playback time
 */
export async function getCurrentTime(page: Page): Promise<number | null> {
    const state = await getPlaybackState(page);
    return state ? state.currentTime : null;
}

/**
 * Check if player is paused
 */
export async function isPaused(page: Page): Promise<boolean | null> {
    const state = await getPlaybackState(page);
    return state ? state.paused : null;
}

/**
 * Playback Control Helpers
 */

/**
 * Seek to a specific time
 */
export async function seekTo(page: Page, time: number): Promise<boolean> {
    try {
        const success = await page.evaluate((seekTime) => {
            const player = (window as any).player || (window as any).videojs?.('videojs-player');
            if (player) {
                player.currentTime(seekTime);
                return true;
            }
            return false;
        }, time);

        // Wait a bit for the seek to complete and sync to propagate
        await page.waitForTimeout(500);
        return success;
    } catch (e) {
        console.error('Seek failed:', e);
        return false;
    }
}

/**
 * Start playback
 */
export async function play(page: Page): Promise<boolean> {
    return await page.evaluate(async () => {
        const player = (window as any).player || (window as any).videojs?.('videojs-player');
        if (player) {
            try {
                await player.play();
                return true;
            } catch (e) {
                console.error('Play failed:', e);
                return false;
            }
        }
        return false;
    });
}

/**
 * Pause playback
 */
export async function pause(page: Page): Promise<boolean> {
    return await page.evaluate(async () => {
        const player = (window as any).player || (window as any).videojs?.('videojs-player');
        if (player) {
            try {
                player.pause();
                return true;
            } catch (e) {
                console.error('Pause failed:', e);
                return false;
            }
        }
        return false;
    });
}

/**
 * Synchronization Helpers
 */

/**
 * Verify two players are synchronized within threshold
 */
export async function assertSyncWithinThreshold(
    pageA: Page,
    pageB: Page,
    threshold: number = testConfig.sync.threshold || 2
): Promise<{ synced: boolean; timeA: number; timeB: number; diff: number }> {
    const timeA = await getCurrentTime(pageA);
    const timeB = await getCurrentTime(pageB);

    if (timeA === null || timeB === null) {
        throw new Error('Failed to get player times');
    }

    const diff = Math.abs(timeA - timeB);
    const synced = diff <= threshold;

    debugLog(`Player A time: ${timeA.toFixed(2)}s, Player B time: ${timeB.toFixed(2)}s, Diff: ${diff.toFixed(2)}s`);

    return { synced, timeA, timeB, diff };
}

/**
 * Wait for players to sync
 */
export async function waitForSync(
    pageA: Page,
    pageB: Page,
    timeout: number = 5000,
    threshold: number = testConfig.sync.threshold || 2
): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const result = await assertSyncWithinThreshold(pageA, pageB, threshold);
        if (result.synced) return true;
        await pageA.waitForTimeout(500);
    }
    return false;
}
