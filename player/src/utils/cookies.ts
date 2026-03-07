import logger from './logger';

// Cookie 管理工具类
export class CookieManager {
    static get(name: string): string | null {
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`));

        if (!cookie) return null;

        try {
            return decodeURIComponent(cookie.split('=')[1]);
        } catch (error) {
            logger.error(`Failed to decode cookie ${name}:`, error);
            return null;
        }
    }

    static getJSON<T>(name: string): T | null {
        const value = this.get(name);
        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error(`Failed to parse cookie ${name}:`, error);
            return null;
        }
    }

    static set(name: string, value: string, options?: {
        path?: string;
        maxAge?: number;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    }): void {
        const encodedValue = encodeURIComponent(value);
        const parts = [`${name}=${encodedValue}`];

        parts.push(`path=${options?.path ?? '/'}`);

        if (options?.maxAge !== undefined) {
            parts.push(`max-age=${options.maxAge}`);
        }

        if (options?.secure) {
            parts.push('secure');
        }

        if (options?.sameSite) {
            parts.push(`samesite=${options.sameSite}`);
        }

        document.cookie = parts.join('; ');
    }

    static setJSON<T>(name: string, value: T, options?: {
        path?: string;
        maxAge?: number;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    }): void {
        try {
            this.set(name, JSON.stringify(value), options);
        } catch (error) {
            logger.error(`Failed to stringify value for cookie ${name}:`, error);
        }
    }

    static remove(name: string, path: string = '/'): void {
        document.cookie = `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    static clear(): void {
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim();
            this.remove(name);
        });
    }
}

// Cookie 名称常量
export const COOKIE_NAMES = {
    USER_INFO: 'userInfo',
    URL_CONFIG: 'urlConfig',
} as const;

// Cookie 数据类型
export interface UserInfoCookie {
    userId: number;
    roomId: number;
    username: string;
    roomName: string;
}

export interface UrlConfigCookie {
    apiBaseUrl: string;
}
