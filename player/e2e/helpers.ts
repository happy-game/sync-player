import { expect, Page } from '@playwright/test';
import testConfig from './test.config.json' with { type: 'json' };

export const PLAYER_BASE_URL = testConfig.playerBaseUrl;
export const DEFAULT_E2E_DELAY_MS = 300;

export async function waitForUi(page: Page, delayMs: number = DEFAULT_E2E_DELAY_MS): Promise<void> {
    await page.waitForTimeout(delayMs);
}

export async function enterPlayerPage(page: Page): Promise<void> {
    await page.goto(PLAYER_BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(`^${PLAYER_BASE_URL}/?$`));
}
