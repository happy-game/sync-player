// 定义消息类型
export interface ISyncMessage {
  type: string;
  payload?: any;
}

// 定义事件处理器类型
export type SyncEventHandler = (data: any) => void;

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
  send(message: ISyncMessage): void | Promise<void>;
  
  // 事件处理器
  onMessage(handler: SyncEventHandler): void;
  onClose(handler: () => void): void;
  onError(handler: (error: any) => void): void;
}

// 定义同步管理器接口
export interface ISyncManager {
  // 连接管理
  connect(userId: number | null, roomId: number | null): void;
  disconnect(): void;
  
  // 消息订阅
  subscribe(type: string, handler: SyncEventHandler): void;
  unsubscribe(type: string, handler: SyncEventHandler): void;
  
  // 消息发送
  send(message: ISyncMessage): void;
}

// 定义同步数据类型
export interface SyncData {
  time: number;       // 当前播放时间
  timestamp: number;  // 时间戳
  paused: boolean;    // 是否暂停
  videoId: number;    // 视频ID
}

// 定义认证消息类型
export interface AuthMessage extends ISyncMessage {
  type: 'auth';
  payload: {
    userId: number;
    roomId: number;
  };
}

// 定义心跳消息类型
export interface PingMessage extends ISyncMessage {
  type: 'ping';
}

// 定义更新时间消息类型
export interface UpdateTimeMessage extends ISyncMessage {
  type: 'updateTime';
  payload: SyncData;
}

// 定义更新暂停状态消息类型
export interface UpdatePauseMessage extends ISyncMessage {
  type: 'updatePause';
  payload: {
    paused: boolean;
    timestamp: number;
  };
}

// 定义更新用户列表消息类型
export interface UpdateUserListMessage extends ISyncMessage {
  type: 'updateUserList';
  payload: {
    roomId: number;
  };
}

// 定义所有可能的消息类型联合
export type SyncMessageType = 
  | AuthMessage 
  | PingMessage 
  | UpdateTimeMessage 
  | UpdatePauseMessage 
  | UpdateUserListMessage;
