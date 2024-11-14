export interface SyncMessage {
  type: string;
  payload?: any;
}

export type SyncEventHandler = (data: any) => void;

export interface ISyncAdapter {
  broadcast(roomId: number, message: SyncMessage, excludedUserIds?: number[]): void;
  sendToUsers(roomId: number, userIds: number[], message: SyncMessage): void;
  onMessage(handler: SyncEventHandler): void;
  getUserIdsInRoom(roomId: number): number[];
}

export interface ISyncManager {
  broadcast(roomId: number, message: SyncMessage, excludedUserIds?: number[]): void;
  sendToUsers(roomId: number, userIds: number[], message: SyncMessage): void;
  getUserIdsInRoom(roomId: number): number[];
} 