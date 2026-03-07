import logger from './logger';

// 会话数据结构
export interface Session {
    user: { id: number; username: string };
    room: { id: number; name: string };
    token: string;
    timestamp: number;
}

const STORAGE_KEY = 'sync-player-session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7天

// 会话管理器 - 统一管理用户会话数据
export const SessionManager = {
    save(session: Session): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            logger.error('Failed to save session:', error);
        }
    },

    load(): Session | null {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return null;

            const session = JSON.parse(data) as Session;

            // 检查会话是否过期
            if (Date.now() - session.timestamp > MAX_AGE_MS) {
                this.clear();
                return null;
            }

            return session;
        } catch (error) {
            logger.error('Failed to load session:', error);
            return null;
        }
    },

    clear(): void {
        localStorage.removeItem(STORAGE_KEY);
    },

    getToken(): string | null {
        const session = this.load();
        return session?.token ?? null;
    },

    getUserId(): number | null {
        const session = this.load();
        return session?.user.id ?? null;
    },

    getRoomId(): number | null {
        const session = this.load();
        return session?.room.id ?? null;
    },

    isValid(): boolean {
        return this.load() !== null;
    }
};
