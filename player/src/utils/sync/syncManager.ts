import type { ISyncManager, ISyncMessage, SyncEventHandler, SyncConfig } from '@/types/sync';
import { WebSocketAdapter } from './adapters/websocket';
import { SSEAdapter } from './adapters/sse';
import logger from '@/utils/logger';

export class SyncManager implements ISyncManager {
  private adapter: WebSocketAdapter | SSEAdapter | null = null;
  private config: SyncConfig;
  private messageHandlers: Map<string, Set<SyncEventHandler>> = new Map();
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private currentUserId: number | null = null;
  private currentRoomId: number | null = null;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  setProtocol(protocol: 'websocket' | 'sse', url: string): void {
    this.config.protocol = protocol;
    this.config.url = url;
  }

  connect(userId: number | null, roomId: number | null): void {
    this.currentUserId = userId;
    this.currentRoomId = roomId;

    if (this.adapter) {
      this.adapter.disconnect();
    }

    // 根据配置创建适配器
    this.adapter = this.createAdapter();
    
    // 设置消息处理
    this.adapter.onMessage((data) => {
      logger.debug('收到消息:', data);
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });

    // 设置关闭处理
    this.adapter.onClose(() => {
      logger.info('连接已关闭');
      this.setupReconnect();
    });

    // 设置错误处理
    this.adapter.onError((error) => {
      logger.error('连接错误:', error);
    });

    // 发送认证消息
    if (userId && roomId) {
      this.adapter.connect(this.config.url, userId, roomId);
    }

    // 设置心跳
    // this.setupHeartbeat();
  }

  private createAdapter(): WebSocketAdapter | SSEAdapter {
    switch (this.config.protocol) {
      case 'websocket':
        return new WebSocketAdapter();
      case 'sse':
        return new SSEAdapter(this.config.url);
      default:
        throw new Error(`不支持的协议: ${this.config.protocol}`);
    }
  }

  private setupReconnect(): void {
    if (!this.reconnectTimer) {
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        if (this.currentUserId && this.currentRoomId) {
          this.connect(this.currentUserId, this.currentRoomId);
        }
      }, this.config.reconnectInterval || 5000);
    }
  }

  private setupHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, this.config.heartbeatInterval || 10000);
  }

  disconnect(): void {
    if (this.adapter) {
      this.adapter.disconnect();
      this.adapter = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  subscribe(type: string, handler: SyncEventHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  unsubscribe(type: string, handler: SyncEventHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  send(message: ISyncMessage): void {
    if (this.adapter) {
      this.adapter.send(message);
    } else {
      logger.error('未连接');
    }
  }
}

// 创建单例
export const syncManager = new SyncManager({
  url: import.meta.env.VITE_SYNC_URL || 'ws://localhost:3000/socket',
  protocol: 'sse' as 'websocket' | 'sse',
  reconnectInterval: 5000,
  heartbeatInterval: 10000
}); 