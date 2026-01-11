// 定义 Payload 类型

// 同步播放状态 Payload
export interface SyncDataPayload {
  time: number;       // 当前播放时间
  timestamp: number;  // 时间戳
  paused: boolean;    // 是否暂停
  videoId: number;    // 视频ID
}

// 暂停状态 Payload
export interface PausePayload {
  paused: boolean;
  timestamp: number;
}

// 用户列表 Payload
export interface UserListPayload {
  roomId: number;
}

// 认证 Payload
export interface AuthPayload {
  userId: number;
  roomId: number;
  token?: string;
}

// 认证消息
export type AuthMessage = { type: 'auth'; payload: AuthPayload };

// Ping 消息
export type PingMessage = { type: 'ping' };

// Pong 消息
export type PongMessage = { type: 'pong' };

// 连接成功消息
export type ConnectedMessage = { type: 'connected' };

// 更新时间消息
export type UpdateTimeMessage = { type: 'updateTime'; payload: SyncDataPayload };

// 更新暂停状态消息
export type UpdatePauseMessage = { type: 'updatePause'; payload: PausePayload };

// 更新用户列表消息
export type UpdateUserListMessage = { type: 'updateUserList'; payload?: UserListPayload };

// 更新播放列表消息
export type UpdatePlaylistMessage = { type: 'updatePlaylist' };

// 心跳消息
export type HeartbeatMessage = { type: 'heartbeat' };

// 定义所有可能的消息类型
export type SyncMessage =
  | AuthMessage
  | PingMessage
  | PongMessage
  | ConnectedMessage
  | UpdateTimeMessage
  | UpdatePauseMessage
  | UpdateUserListMessage
  | UpdatePlaylistMessage
  | HeartbeatMessage;

// 客户端发送的消息类型
export type ClientMessage = Extract<SyncMessage, { type: 'auth' | 'ping' | 'updateTime' | 'updatePause' }>;

// 服务端发送的消息类型
export type ServerMessage = Extract<SyncMessage, { type: 'pong' | 'connected' | 'updateTime' | 'updatePause' | 'updateUserList' | 'updatePlaylist' | 'heartbeat' }>;

// 向后兼容 - 保留旧的接口命名
// @deprecated 使用 SyncMessage 代替
export type ISyncMessage = SyncMessage;

// @deprecated 使用 SyncDataPayload 代替
export type SyncData = SyncDataPayload;

// @deprecated 使用联合类型 SyncMessage 代替
export type SyncMessageType = SyncMessage;

// 定义事件处理器类型
export type SyncEventHandler = (data: SyncMessage) => void;

// 定义连接配置
export interface SyncConfig {
  url: string;
  protocol: 'websocket' | 'sse';
  reconnectInterval?: number;  // 重连间隔，单位毫秒
  heartbeatInterval?: number;  // 心跳间隔，单位毫秒
}

// 定义适配器接口
export interface ISyncAdapter {
  // 连接管理
  connect(url: string, userId: number, roomId: number): void;
  disconnect(): void;

  // 消息发送
  send(message: SyncMessage): void | Promise<void>;

  // 事件处理器
  onMessage(handler: SyncEventHandler): void;
  onClose(handler: () => void): void;
  onError(handler: (error: unknown) => void): void;
}

// 定义同步管理器接口
export interface ISyncManager {
  // 连接管理
  connect(userId: number | null, roomId: number | null): void;
  disconnect(): void;

  // 消息订阅
  subscribe(type: SyncMessage['type'], handler: SyncEventHandler): void;
  unsubscribe(type: SyncMessage['type'], handler: SyncEventHandler): void;

  // 消息发送
  send(message: SyncMessage): void;
}
