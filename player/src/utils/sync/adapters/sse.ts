// use sse(Server-Sent Events) to implement the ISyncAdapter interface.
import type { ISyncAdapter, ISyncMessage, SyncEventHandler } from '@/types/sync';
import logger from '@/utils/logger';

export class SSEAdapter implements ISyncAdapter {
  private es: EventSource | null = null;
  private messageHandler: SyncEventHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private errorHandler: ((error: any) => void) | null = null;
  private url: string | null = null;
  private userId: number | null = null;
  private roomId: number | null = null;
  private reconnectInterval: number = 5000;
  private reconnectTimer: number | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(url: string, userId: number, roomId: number): void {
    if (!url) {
      throw new Error('URL is not initialized');
    }
    this.url = url;
    this.userId = userId;
    this.roomId = roomId;
    const fullUrl = `${this.url}/connect?userId=${userId}&roomId=${roomId}`;
    this.es = new EventSource(fullUrl);

    this.es.onmessage = (event) => this.handleMessage(event);
    this.es.onerror = () => this.handleError();
    this.es.onopen = () => this.handleOpen();
  }

  disconnect(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  send(message: ISyncMessage): void {
    // TODO: 实现send方法
    throw new Error('Method not implemented.');
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

  private handleOpen(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    if (this.messageHandler) {
      this.messageHandler(JSON.parse(event.data));
    }
  }

  private handleError(): void {
    this.disconnect();
    this.reconnectTimer = window.setTimeout(() => {
      this.connect(this.url!, this.userId!, this.roomId!);
    }, this.reconnectInterval);
  }
}
