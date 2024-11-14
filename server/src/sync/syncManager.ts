import { Server } from 'http';
import { ISyncManager, ISyncAdapter, SyncMessage } from './types';
import { WebSocketAdapter } from './adapters/websocket';
import logger from '../config/logger';

export class SyncManager implements ISyncManager {
  private adapter: ISyncAdapter;

  constructor(server: Server, protocol: 'websocket' | 'sse' = 'websocket') {
    this.adapter = this.createAdapter(server, protocol);
    
    this.adapter.onMessage((data) => {
      logger.debug('Received message:', data);
    });
  }

  private createAdapter(server: Server, protocol: string): ISyncAdapter {
    switch (protocol) {
      case 'websocket':
        return new WebSocketAdapter(server);
      case 'sse':
        throw new Error('SSE adapter not implemented yet');
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  broadcast(roomId: number, message: SyncMessage, excludedUserIds: number[] = []): void {
    this.adapter.broadcast(roomId, message, excludedUserIds);
  }

  sendToUsers(roomId: number, userIds: number[], message: SyncMessage): void {
    this.adapter.sendToUsers(roomId, userIds, message);
  }

  getUserIdsInRoom(roomId: number): number[] {
    return this.adapter.getUserIdsInRoom(roomId);
  }
}

// 创建单例
let syncManager: SyncManager;

export function initSyncManager(server: Server): SyncManager {
  syncManager = new SyncManager(server);
  return syncManager;
}

export function getSyncManager(): SyncManager {
  if (!syncManager) {
    throw new Error('SyncManager not initialized');
  }
  return syncManager;
} 