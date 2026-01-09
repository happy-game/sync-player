import { test, expect } from '@playwright/test';
import * as helpers from './helpers';

test.describe('E2E Helper Functions Verification', () => {

    test('Verify login and room helpers', async ({ page }) => {
        const roomName = helpers.generateRoomName();
        const username = helpers.generateUsername();

        console.log(`[VERIFY] Starting test with User: ${username}, Room: ${roomName}`);

        // 1. Verify Login Helpers
        console.log('[VERIFY] Testing login helpers...');
        const joined = await helpers.loginAndJoinRoom(page, username, roomName);
        console.log(`[VERIFY] loginAndJoinRoom returned: ${joined}`);
        expect(joined).toBe(true);

        const loggedIn = await helpers.isLoggedIn(page);
        console.log(`[VERIFY] isLoggedIn returned: ${loggedIn}`);
        expect(loggedIn).toBe(true);

        const userInfo = await helpers.getUserInfo(page);
        console.log(`[VERIFY] getUserInfo returned:`, userInfo);
        expect(userInfo).not.toBeNull();
        expect(userInfo?.username).toBe(username);

        // 2. Verify Room Management Helpers
        console.log('[VERIFY] Testing room management helpers...');
        const roomInfo = await helpers.getRoomInfo(page);
        console.log(`[VERIFY] getRoomInfo returned:`, roomInfo);
        expect(roomInfo).not.toBeNull();
        expect(roomInfo?.roomName).toBe(roomName);

        // Wait for connection to establish and user list to populate
        console.log('[VERIFY] Waiting for user list...');
        await page.waitForTimeout(3000);

        const userList = await helpers.getRoomUserList(page);
        console.log(`[VERIFY] getRoomUserList returned ${userList.length} users`);
        expect(userList.length).toBeGreaterThan(0);

        const currentUser = userList.find((u: any) => u.username === username);
        expect(currentUser).toBeDefined();

        console.log('[VERIFY] Login and Room helpers VERIFIED');
    });

    test('Verify playlist and playback helpers', async ({ page }) => {
        const roomName = helpers.generateRoomName();
        const username = helpers.generateUsername();
        const testVideo = helpers.getTestVideo(0);

        await helpers.loginAndJoinRoom(page, username, roomName);

        // 3. Verify Playlist Helpers
        console.log('[VERIFY] Testing playlist helpers...');
        const emptyPlaylist = await helpers.getPlaylist(page);
        console.log(`[VERIFY] Initial playlist length: ${emptyPlaylist.length}`);

        const added = await helpers.addVideoToPlaylist(page, testVideo.url, testVideo.title);
        console.log(`[VERIFY] addVideoToPlaylist returned: ${added}`);
        expect(added).toBe(true);

        // Wait for playlist update
        await page.waitForTimeout(2000);
        const playlist = await helpers.getPlaylist(page);
        console.log(`[VERIFY] Updated playlist length: ${playlist.length}`);
        expect(playlist.length).toBeGreaterThan(0);
        expect(playlist[0].title).toBe(testVideo.title);

        const videoId = playlist[0].id;
        const switched = await helpers.switchToVideo(page, videoId);
        console.log(`[VERIFY] switchToVideo returned: ${switched}`);
        expect(switched).toBe(true);

        // Wait for WebSocket message to propagate and store to update
        console.log('[VERIFY] Waiting for video switch to propagate...');
        await page.waitForTimeout(2000);

        // Manually refresh playlist to ensure currentVideoId is updated
        await page.evaluate(async () => {
            const playlistStore = (window as any).playlistStore;
            const userStore = (window as any).userStore;
            if (playlistStore && userStore?.roomId) {
                await playlistStore.fetchPlaylist(userStore.roomId);
            }
        });
        await page.waitForTimeout(1000);

        // Debug: Check if store was updated
        const storeState = await page.evaluate(() => {
            const playlistStore = (window as any).playlistStore;
            const pinia = (window as any).__PINIA__;
            return {
                hasPlaylistStore: !!playlistStore,
                currentVideoId: playlistStore?.currentVideoId || pinia?.state.value.playlist?.currentVideoId,
                playlist: playlistStore?.playlist || pinia?.state.value.playlist?.playlist
            };
        });
        console.log('[VERIFY] Store state after switch:', storeState);

        // 4. Verify Playback State Helpers
        console.log('[VERIFY] Testing playback state helpers...');
        const isReady = await helpers.waitForPlayerReady(page);
        console.log(`[VERIFY] waitForPlayerReady returned: ${isReady}`);
        expect(isReady).toBe(true);

        const state = await helpers.getPlaybackState(page);
        console.log(`[VERIFY] getPlaybackState returned:`, state);
        expect(state).not.toBeNull();

        // 5. Verify Playback Control Helpers
        console.log('[VERIFY] Testing seek...');
        await helpers.seekTo(page, 10);
        const currentTime = await helpers.getCurrentTime(page);
        console.log(`[VERIFY] Current time after seek: ${currentTime}`);
        expect(Math.abs((currentTime || 0) - 10)).toBeLessThan(5);

        // 6. Verify Play/Pause Helpers
        console.log('[VERIFY] Testing play/pause helpers...');

        // Test Play
        const played = await helpers.play(page);
        console.log(`[VERIFY] play returned: ${played}`);
        expect(played).toBe(true);
        await page.waitForTimeout(1000); // Wait for playback
        const isPausedAfterPlay = await helpers.isPaused(page);
        console.log(`[VERIFY] isPaused after play: ${isPausedAfterPlay}`);
        expect(isPausedAfterPlay).toBe(false);

        // Test Pause
        const paused = await helpers.pause(page);
        console.log(`[VERIFY] pause returned: ${paused}`);
        expect(paused).toBe(true);
        await page.waitForTimeout(1000); // Wait for pause
        const isPausedAfterPause = await helpers.isPaused(page);
        console.log(`[VERIFY] isPaused after pause: ${isPausedAfterPause}`);
        expect(isPausedAfterPause).toBe(true);

        // 7. Verify Playlist Removal
        console.log('[VERIFY] Testing removeVideoFromPlaylist...');
        const itemToRemove = playlist[0].id;
        const removed = await helpers.removeVideoFromPlaylist(page, itemToRemove);
        console.log(`[VERIFY] removeVideoFromPlaylist returned: ${removed}`);
        expect(removed).toBe(true);

        // Wait for playlist update
        await page.waitForTimeout(1000);
        const finalPlaylist = await helpers.getPlaylist(page);
        console.log(`[VERIFY] Final playlist length: ${finalPlaylist.length}`);
        expect(finalPlaylist.length).toBe(0); // Should be empty as we added 1 and removed 1

        // 8. Verify Logout
        console.log('[VERIFY] Testing logout...');
        await helpers.logout(page);
        const loggedInAfterLogout = await helpers.isLoggedIn(page);
        console.log(`[VERIFY] isLoggedIn after logout: ${loggedInAfterLogout}`);
        expect(loggedInAfterLogout).toBe(false);

        console.log('[VERIFY] All helpers VERIFIED');
    });
});
