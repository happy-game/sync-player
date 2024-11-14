import type { ISyncAdapter, ISyncMessage, SyncEventHandler } from '@/types/sync';
import logger from '@/utils/logger';

export class WebSocketAdapter implements ISyncAdapter {
  private ws: WebSocket | null = null;
  private messageHandler: SyncEventHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private errorHandler: ((error: any) => void) | null = null;

  connect(url: string, userId: number, roomId: number): void {
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      logger.info('WebSocket连接已建立');
      if (this.ws) {
        this.ws.send(JSON.stringify({
          type: 'auth',
          payload: {
            userId,
            roomId
          }
        }));
      }
    };

    this.ws.onmessage = (event) => {
      if (this.messageHandler) {
        try {
          let data = JSON.parse(event.data);
          // 如果是字符串，再次解析
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
          this.messageHandler(data);
        } catch (error) {
          logger.error('WebSocket消息解析失败:', error);
        }
      }
    };

    this.ws.onclose = () => {
      if (this.closeHandler) {
        this.closeHandler();
      }
    };

    this.ws.onerror = (error) => {
      if (this.errorHandler) {
        this.errorHandler(error);
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: ISyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.error('WebSocket未连接');
    }
  }

  onMessage(handler: SyncEventHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  onError(handler: (error: any) => void): void {
    this.errorHandler = handler;
  }
} 