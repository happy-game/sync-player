import logger from './logger';

type MessageHandler = (data: any) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;

  constructor() {
    this.setupPingInterval();
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
        }));
      }
    }, 1000 * 10) as unknown as number;
  }

  connect(userId: number | null, roomId: number | null) {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`ws://${location.host}/socket`);
    
    this.ws.onopen = () => {
      if (this.ws && userId && roomId) {
        this.ws.send(JSON.stringify({
          type: 'auth',
          userId,
          roomId
        }));
      }
      logger.info('WebSocket 连接已建立');
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      logger.debug('收到消息:', data);
      
      // 触发对应类型的所有处理函数
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    }

    this.ws.onclose = () => {
      logger.info('WebSocket 连接已关闭');
      this.ws = null;
      
      // 自动重连
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          if (userId && roomId) {
            this.connect(userId, roomId);
          }
        }, 5000) as unknown as number;
      }
    }

    this.ws.onerror = (error) => {
      logger.error('WebSocket 错误:', error);
      this.ws = null;
    }
  }

  // 订阅特定类型的消息
  subscribe(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  // 取消订阅
  unsubscribe(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // 发送消息
  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      logger.error('WebSocket未连接');
    }
  }

  // 关闭连接
  close() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }
}

// 导出单例
export const wsManager = new WebSocketManager(); 