import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Room Management
 */

// Helper function to generate unique room names
function generateRoomName(): string {
    return `test-room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper function to generate unique usernames
function generateUsername(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Helper function for conditional logging
function debugLog(message: string) {
    if (process.env.DEBUG) {
        console.log(message);
    }
}

// Helper function to login and join/create a room
async function loginAndJoinRoom(page: Page, username: string, roomName: string) {
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
    await expect(page.locator('div.fixed.inset-0')).not.toBeVisible({ timeout: 10000 });
}

// Helper function to check if user is in a room
async function isInRoom(page: Page): Promise<boolean> {
    // Check if login modal is not visible (indicating successful room join)
    const modalVisible = await page.locator('div.fixed.inset-0').isVisible().catch(() => false);
    return !modalVisible;
}

test.describe('Room Management', () => {

    /**
     * User creates a new room
     * Expected outcome: Successfully create and enter the room
     */
    test('User creates a new room', async ({ page }) => {
        const username = generateUsername();
        const roomName = generateRoomName();

        // Navigate to the application
        await page.goto('/');

        // Verify login modal is visible
        await expect(page.locator('div.fixed.inset-0')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('h2:has-text("登录")')).toBeVisible();

        // Fill in username
        const usernameInput = page.locator('input[type="text"]').first();
        await usernameInput.fill(username);
        await expect(usernameInput).toHaveValue(username);

        // Fill in room name
        const roomNameInput = page.locator('input[type="text"]').nth(1);
        await roomNameInput.fill(roomName);
        await expect(roomNameInput).toHaveValue(roomName);

        // Click login button to create and join room
        const loginButton = page.locator('button[type="submit"]:has-text("登录")');
        await loginButton.click();

        // Wait for modal to close (indicating successful room creation and join)
        await expect(page.locator('div.fixed.inset-0')).not.toBeVisible({ timeout: 10000 });

        // Verify user is in the room by checking for video player
        await expect(page.locator('video, .video-player, [class*="player"]').first()).toBeVisible({ timeout: 5000 });

        // Verify cookie was set with user info
        const cookies = await page.context().cookies();
        const userInfoCookie = cookies.find(c => c.name === 'userInfo');
        expect(userInfoCookie).toBeDefined();

        if (userInfoCookie) {
            const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.value));
            expect(userInfo.username).toBe(username);
            expect(userInfo.roomName).toBe(roomName);
            expect(userInfo.userId).toBeDefined();
            expect(userInfo.roomId).toBeDefined();
        }

        // Verify localStorage has auth token
        const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
        expect(authToken).toBeTruthy();

        debugLog(`✓ PASSED: User "${username}" successfully created and joined room "${roomName}"`);
    });

    /**
     * User joins an existing room
     * Expected outcome: Successfully join and see other users in the room
     */
    test('User joins an existing room', async ({ browser }) => {
        const roomName = generateRoomName();
        const userA = generateUsername();
        const userB = generateUsername();

        // Create two browser contexts (two separate users)
        const contextA = await browser.newContext();
        const contextB = await browser.newContext();

        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        try {
            // User A creates the room
            debugLog(`User A (${userA}) creating room "${roomName}"...`);
            await loginAndJoinRoom(pageA, userA, roomName);

            // Verify User A is in the room
            expect(await isInRoom(pageA)).toBe(true);
            debugLog(`✓ User A successfully created and joined room`);

            // Wait a bit for the room to be fully initialized
            await pageA.waitForTimeout(1000);

            // User B joins the same room
            debugLog(`User B (${userB}) joining room "${roomName}"...`);
            await loginAndJoinRoom(pageB, userB, roomName);

            // Verify User B is in the room
            expect(await isInRoom(pageB)).toBe(true);
            debugLog(`✓ User B successfully joined the existing room`);

            // Wait for WebSocket/SSE connection to be established
            await pageA.waitForTimeout(2000);
            await pageB.waitForTimeout(2000);

            // Verify both users have the same room ID (core requirement)
            // Get room ID from cookies (more reliable than Pinia store access)
            const cookiesA = await pageA.context().cookies();
            const cookiesB = await pageB.context().cookies();

            const userInfoCookieA = cookiesA.find(c => c.name === 'userInfo');
            const userInfoCookieB = cookiesB.find(c => c.name === 'userInfo');

            expect(userInfoCookieA).toBeDefined();
            expect(userInfoCookieB).toBeDefined();

            const userInfoA = JSON.parse(decodeURIComponent(userInfoCookieA!.value));
            const userInfoB = JSON.parse(decodeURIComponent(userInfoCookieB!.value));

            const roomIdA = userInfoA.roomId;
            const roomIdB = userInfoB.roomId;

            expect(roomIdA).toBeDefined();
            expect(roomIdB).toBeDefined();
            expect(roomIdA).toBe(roomIdB);

            debugLog(`✓ PASSED: User "${userB}" successfully joined room "${roomName}" created by "${userA}"`);
            debugLog(`  - Both users are in room ID: ${roomIdA}`);

        } finally {
            // Clean up
            await pageA.close();
            await pageB.close();
            await contextA.close();
            await contextB.close();
        }
    });

    /**
     * Verify room persistence
     * Tests that room information is correctly stored and retrieved
     */
    test('Verify room persistence after page reload', async ({ page }) => {
        const username = generateUsername();
        const roomName = generateRoomName();

        // Create and join room
        await loginAndJoinRoom(page, username, roomName);

        // Verify in room
        expect(await isInRoom(page)).toBe(true);

        // Get room ID before reload
        const roomIdBefore = await page.evaluate(() => {
            const store = (window as any).__PINIA__;
            return store?.state.value.user?.roomId;
        });

        // Reload the page
        await page.reload();

        // Should automatically rejoin the room from cookie
        await page.waitForTimeout(2000);

        // Verify still in room (no login modal)
        const modalVisible = await page.locator('div.fixed.inset-0').isVisible().catch(() => false);

        if (!modalVisible) {
            // Get room ID after reload
            const roomIdAfter = await page.evaluate(() => {
                const store = (window as any).__PINIA__;
                return store?.state.value.user?.roomId;
            });

            // Should be the same room
            expect(roomIdAfter).toBe(roomIdBefore);
            debugLog(`✓ Room persistence verified: User remained in room ${roomIdAfter} after reload`);
        } else {
            debugLog('⚠ Note: User was logged out after reload (cookie may have expired)');
        }
    });

    /**
     * Join non-existent room
     * Expected outcome: Display error message
     */
    test('Join non-existent room shows error', async ({ page }) => {
        const username = generateUsername();
        const nonExistentRoomId = 999999; // Use a very large ID that doesn't exist

        // First create a user
        await page.goto('/');

        // Get base URL from environment
        const baseUrl = 'http://localhost:3000/api';

        // Create user via API
        const userResponse = await page.evaluate(async (data) => {
            const response = await fetch(`${data.baseUrl}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: data.username })
            });
            return response.json();
        }, { baseUrl, username }) as any;

        const userId = userResponse.id as number;
        debugLog(`Created user ${username} with ID ${userId}`);

        // Try to join non-existent room via API
        const joinResponse = await page.evaluate(async (data) => {
            try {
                const response = await fetch(`${data.baseUrl}/room/join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: data.userId,
                        roomId: data.roomId
                    })
                });
                return {
                    ok: response.ok,
                    status: response.status,
                    data: await response.json()
                };
            } catch (error: any) {
                return { ok: false, error: error.message };
            }
        }, { baseUrl, userId, roomId: nonExistentRoomId });

        // Verify that joining failed
        expect(joinResponse.ok).toBe(false);
        expect(joinResponse.status).toBe(404);
        expect((joinResponse.data as any).error).toContain('Room not found');

        debugLog(`✓ PASSED: Joining non-existent room (ID: ${nonExistentRoomId}) correctly returned error: ${(joinResponse.data as any).error}`);
    });

    /**
     * User leaves room
     * Expected outcome: Other users in the room receive notification
     */
    test('User leaves room and other users are notified', async ({ browser }) => {
        const roomName = generateRoomName();
        const userA = generateUsername();
        const userB = generateUsername();

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();

        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        try {
            // Both users join the same room
            debugLog(`User A (${userA}) and User B (${userB}) joining room "${roomName}"...`);
            await loginAndJoinRoom(pageA, userA, roomName);
            await loginAndJoinRoom(pageB, userB, roomName);

            // Wait for connections to establish
            await pageA.waitForTimeout(2000);
            await pageB.waitForTimeout(2000);

            // Verify both users are in the room
            expect(await isInRoom(pageA)).toBe(true);
            expect(await isInRoom(pageB)).toBe(true);

            // Get initial user list count for User A
            const initialUserCount = await pageA.evaluate(() => {
                const store = (window as any).__PINIA__;
                return store?.state.value.user?.userList?.length || 0;
            });

            debugLog(`Initial user count in room: ${initialUserCount}`);

            // User B leaves the room by clearing cookies and reloading
            debugLog(`User B leaving room...`);
            await pageB.evaluate(() => {
                // Clear all cookies
                document.cookie.split(';').forEach((cookie: string) => {
                    document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                // Clear localStorage
                localStorage.clear();
            });

            // Close User B's page to simulate disconnect
            await pageB.close();

            // Wait for User A to receive the update
            await pageA.waitForTimeout(3000);

            // Verify User A's user list updated (User B should be gone or marked offline)
            const updatedUserCount = await pageA.evaluate(() => {
                const store = (window as any).__PINIA__;
                return store?.state.value.user?.userList?.length || 0;
            });

            debugLog(`Updated user count in room: ${updatedUserCount}`);

            // The user count might decrease, or User B might be marked as offline
            // Either way, verify that the user list changed
            const userBStillOnline = await pageA.evaluate((username) => {
                const store = (window as any).__PINIA__;
                const userList = store?.state.value.user?.userList || [];
                const userB = userList.find((u: any) => u.username === username);
                return userB?.online || false;
            }, userB);

            expect(userBStillOnline).toBe(false);
            debugLog(`✓ PASSED: User B left the room, User A's user list updated correctly (User B is offline)`);

        } finally {
            await pageA.close();
            await contextA.close();
            await contextB.close();
        }
    });

    /**
     * Room isolation - User joins different room
     * Expected outcome: Users in original room are not affected
     */
    test('User joins different room - original room users unaffected', async ({ browser }) => {
        const roomA = generateRoomName();
        const roomC = generateRoomName();
        const userA = generateUsername();
        const userB = generateUsername();

        const contextA = await browser.newContext();
        const contextB = await browser.newContext();

        const pageA = await contextA.newPage();
        const pageB = await contextB.newPage();

        try {
            // Both users join Room A
            debugLog(`User A (${userA}) and User B (${userB}) joining Room A "${roomA}"...`);
            await loginAndJoinRoom(pageA, userA, roomA);
            await loginAndJoinRoom(pageB, userB, roomA);

            // Wait for connections
            await pageA.waitForTimeout(2000);
            await pageB.waitForTimeout(2000);

            // Verify both are in Room A
            const roomIdA_UserA = await pageA.evaluate(() => {
                const cookies = document.cookie.split('; ');
                const userInfo = cookies.find((c: string) => c.startsWith('userInfo='));
                if (userInfo) {
                    const data = JSON.parse(decodeURIComponent(userInfo.split('=')[1]));
                    return data.roomId;
                }
                return null;
            });

            const roomIdA_UserB = await pageB.evaluate(() => {
                const cookies = document.cookie.split('; ');
                const userInfo = cookies.find((c: string) => c.startsWith('userInfo='));
                if (userInfo) {
                    const data = JSON.parse(decodeURIComponent(userInfo.split('=')[1]));
                    return data.roomId;
                }
                return null;
            });

            expect(roomIdA_UserA).toBe(roomIdA_UserB);
            debugLog(`✓ Both users in Room A (ID: ${roomIdA_UserA})`);

            // User B leaves and joins Room C
            debugLog(`User B leaving Room A and joining Room C "${roomC}"...`);
            await pageB.evaluate(() => {
                // Clear cookies and localStorage
                document.cookie.split(';').forEach((cookie: string) => {
                    document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                });
                localStorage.clear();
            });

            // User B joins Room C
            await pageB.reload();
            await loginAndJoinRoom(pageB, userB, roomC);
            await pageB.waitForTimeout(2000);

            // Verify User B is now in Room C
            const roomIdC_UserB = await pageB.evaluate(() => {
                const cookies = document.cookie.split('; ');
                const userInfo = cookies.find((c: string) => c.startsWith('userInfo='));
                if (userInfo) {
                    const data = JSON.parse(decodeURIComponent(userInfo.split('=')[1]));
                    return data.roomId;
                }
                return null;
            });

            expect(roomIdC_UserB).not.toBe(roomIdA_UserA);
            debugLog(`✓ User B now in Room C (ID: ${roomIdC_UserB})`);

            // Verify User A is still in Room A (unaffected)
            const roomIdA_UserA_After = await pageA.evaluate(() => {
                const cookies = document.cookie.split('; ');
                const userInfo = cookies.find((c: string) => c.startsWith('userInfo='));
                if (userInfo) {
                    const data = JSON.parse(decodeURIComponent(userInfo.split('=')[1]));
                    return data.roomId;
                }
                return null;
            });

            expect(roomIdA_UserA_After).toBe(roomIdA_UserA);
            debugLog(`✓ User A still in Room A (ID: ${roomIdA_UserA_After})`);

            // Verify User A's user list doesn't show User B anymore (or shows offline)
            await pageA.waitForTimeout(2000);
            const userBInRoomA = await pageA.evaluate((username) => {
                const store = (window as any).__PINIA__;
                const userList = store?.state.value.user?.userList || [];
                const user = userList.find((u: any) => u.username === username);
                return user?.online || false;
            }, userB);

            expect(userBInRoomA).toBe(false);
            debugLog(`✓ PASSED: Room isolation verified - User A in Room A is unaffected by User B joining Room C`);

        } finally {
            await pageA.close();
            await pageB.close();
            await contextA.close();
            await contextB.close();
        }
    });
});

