export interface UpdateTimeMessage {
  type: 'updateTime';
  paused: boolean;
  time: number;
  timestamp: number;
  videoId: number;
}

export interface PongMessage {
  type: 'pong';
}

export type WebSocketMessage = UpdateTimeMessage | PongMessage; 