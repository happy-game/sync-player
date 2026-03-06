import { Browser, BrowserContext, Page, expect, test } from '@playwright/test';
import { expectRoomUsers, getRoomInfo, login, logout } from '../helpers.js';
import type { RoomUserInfo } from '../helpers.js';

async function createIsolatedPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
    const context = await browser.newContext();
    const page = await context.newPage();
    return { context, page };
}

test.describe('Room E2E', () => {
    test('shows correct room metadata after login', async ({ browser }) => {
        const { context, page } = await createIsolatedPage(browser);

        try {
            const { username, roomName } = await login(page);

            const roomInfo = await getRoomInfo(page);
            expect(roomInfo.roomName).toBe(roomName);
            expect(roomInfo.roomId).toBeGreaterThan(0);
            expect(roomInfo.users).toEqual([
                {
                    username,
                    online: true,
                    isCurrentUser: true,
                },
            ]);
        } finally {
            await context.close();
        }
    });

    test('reuses the same room for multiple users and syncs member lists', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const thirdUser = await createIsolatedPage(browser);

        try {
            const firstLogin = await login(firstUser.page);
            const secondLogin = await login(secondUser.page, { roomName: firstLogin.roomName });
            const thirdLogin = await login(thirdUser.page, { roomName: firstLogin.roomName });

            const expectedUsers = [firstLogin.username, secondLogin.username, thirdLogin.username];
            await expectRoomUsers(firstUser.page, expectedUsers);
            await expectRoomUsers(secondUser.page, expectedUsers);
            await expectRoomUsers(thirdUser.page, expectedUsers);

            const [firstRoomInfo, secondRoomInfo, thirdRoomInfo] = await Promise.all([
                getRoomInfo(firstUser.page),
                getRoomInfo(secondUser.page),
                getRoomInfo(thirdUser.page),
            ]);

            expect(firstRoomInfo.roomName).toBe(firstLogin.roomName);
            expect(secondRoomInfo.roomName).toBe(firstLogin.roomName);
            expect(thirdRoomInfo.roomName).toBe(firstLogin.roomName);

            expect(firstRoomInfo.roomId).toBe(secondRoomInfo.roomId);
            expect(secondRoomInfo.roomId).toBe(thirdRoomInfo.roomId);

            expect(firstRoomInfo.users.find((user: RoomUserInfo) => user.username === firstLogin.username)?.isCurrentUser).toBe(true);
            expect(secondRoomInfo.users.find((user: RoomUserInfo) => user.username === secondLogin.username)?.isCurrentUser).toBe(true);
            expect(thirdRoomInfo.users.find((user: RoomUserInfo) => user.username === thirdLogin.username)?.isCurrentUser).toBe(true);
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                thirdUser.context.close(),
            ]);
        }
    });

    test('updates existing room pages when a new user joins', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const thirdUser = await createIsolatedPage(browser);

        try {
            const firstLogin = await login(firstUser.page);
            await expectRoomUsers(firstUser.page, [firstLogin.username]);

            const secondLogin = await login(secondUser.page, { roomName: firstLogin.roomName });
            await expectRoomUsers(firstUser.page, [firstLogin.username, secondLogin.username]);
            await expectRoomUsers(secondUser.page, [firstLogin.username, secondLogin.username]);

            const thirdLogin = await login(thirdUser.page, { roomName: firstLogin.roomName });
            const expectedUsers = [firstLogin.username, secondLogin.username, thirdLogin.username];

            await expectRoomUsers(firstUser.page, expectedUsers);
            await expectRoomUsers(secondUser.page, expectedUsers);
            await expectRoomUsers(thirdUser.page, expectedUsers);
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                thirdUser.context.close(),
            ]);
        }
    });

    test('removes a user from other room member lists after logout', async ({ browser }) => {
        const firstUser = await createIsolatedPage(browser);
        const secondUser = await createIsolatedPage(browser);
        const thirdUser = await createIsolatedPage(browser);

        try {
            const firstLogin = await login(firstUser.page);
            const secondLogin = await login(secondUser.page, { roomName: firstLogin.roomName });
            const thirdLogin = await login(thirdUser.page, { roomName: firstLogin.roomName });

            const remainingUsers = [firstLogin.username, secondLogin.username];

            await expectRoomUsers(firstUser.page, [...remainingUsers, thirdLogin.username]);
            await expectRoomUsers(secondUser.page, [...remainingUsers, thirdLogin.username]);

            await logout(thirdUser.page);

            await expectRoomUsers(firstUser.page, remainingUsers);
            await expectRoomUsers(secondUser.page, remainingUsers);
            await expect(thirdUser.page.locator('h2:has-text("登录")')).toBeVisible();
        } finally {
            await Promise.all([
                firstUser.context.close(),
                secondUser.context.close(),
                thirdUser.context.close(),
            ]);
        }
    });

    test('keeps users isolated across different rooms', async ({ browser }) => {
        const roomAFirstUser = await createIsolatedPage(browser);
        const roomASecondUser = await createIsolatedPage(browser);
        const roomBUser = await createIsolatedPage(browser);

        try {
            const roomALogin = await login(roomAFirstUser.page);
            const roomASecondLogin = await login(roomASecondUser.page, { roomName: roomALogin.roomName });
            const roomBLogin = await login(roomBUser.page);

            const roomAUsers = [roomALogin.username, roomASecondLogin.username];
            const roomBUsers = [roomBLogin.username];

            await expectRoomUsers(roomAFirstUser.page, roomAUsers);
            await expectRoomUsers(roomASecondUser.page, roomAUsers);
            await expectRoomUsers(roomBUser.page, roomBUsers);

            const [roomAInfo, roomBInfo] = await Promise.all([
                getRoomInfo(roomAFirstUser.page),
                getRoomInfo(roomBUser.page),
            ]);

            expect(roomAInfo.roomName).not.toBe(roomBInfo.roomName);
            expect(roomAInfo.roomId).not.toBe(roomBInfo.roomId);
            expect(roomAInfo.users.map((user: RoomUserInfo) => user.username)).not.toContain(roomBLogin.username);
            expect(roomBInfo.users.map((user: RoomUserInfo) => user.username)).not.toContain(roomALogin.username);
            expect(roomBInfo.users.map((user: RoomUserInfo) => user.username)).not.toContain(roomASecondLogin.username);
        } finally {
            await Promise.all([
                roomAFirstUser.context.close(),
                roomASecondUser.context.close(),
                roomBUser.context.close(),
            ]);
        }
    });
});
