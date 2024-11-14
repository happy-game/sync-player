// use sse(Server-Sent Events) to implement the ISyncAdapter interface.
import type { ISyncAdapter, ISyncMessage, SyncEventHandler } from '@/types/sync';
import logger from '@/utils/logger';

export class SSEAdapter implements ISyncAdapter {
  private es: EventSource | null = null;
  private messageHandler: SyncEventHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private errorHandler: ((error: any) => void) | null = null;
  private url: string | null = null;    

  constructor(url: string) {
    this.url = url;
  }

  connect(url: string, userId: number, roomId: number): void {
    if (!url) {
        throw new Error('URL is not initialized');
    }
    this.url = url + `/connect?userId=${userId}&roomId=${roomId}`;
    this.es = new EventSource(this.url);

    this.es.onmessage = (event) => this.handleMessage(event);
    // this.es.onerror = (event) => this.handleError(event);
    // this.es.close = () => this.handleClose();
  }

  disconnect(): void {
    if (this.es) {
      this.es.close();
      this.es = null;
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

  private handleMessage(event: MessageEvent): void {
    if (this.messageHandler) {
      this.messageHandler(JSON.parse(event.data));
    }
  }

  private handleError(event: MessageEvent): void {
    if (this.errorHandler) {
      this.errorHandler(event);
    }
  }
}
