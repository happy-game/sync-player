import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ISyncAdapter, SyncEventHandler, SyncMessage } from '../types';
import logger from '../../config/logger';

interface WebSocketMap {
  [roomId: number]: {
    [userId: number]: WebSocket;
  };
}

export class WebSocketAdapter implements ISyncAdapter {
  private wss: WebSocketServer;
  private connections: WebSocketMap = {};
  private messageHandler: SyncEventHandler | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New client connected');
      ws.send(JSON.stringify({ type: 'connected' }));

      ws.on('message', (message: Buffer) => {
        this.handleMessage(ws, message);
      });

      ws.on('close', () => {
        this.handleClose(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'auth') {
        const { userId, roomId } = data.payload;
        this.handleAuth(ws, userId, roomId);
      }
      if (this.messageHandler) {
        this.messageHandler(data);
      }
    } catch (error) {
      logger.error('Error parsing message:', error);
    }
  }

  private handleAuth(ws: WebSocket, userId: number, roomId: number) {
    if (!this.connections[roomId]) {
      this.connections[roomId] = {};
    }
    this.connections[roomId][userId] = ws;
    logger.info(`User ${userId} connected to room ${roomId}`);
  }

  private handleClose(ws: WebSocket) {
    for (const roomId in this.connections) {
      for (const userId in this.connections[roomId]) {
        if (this.connections[roomId][userId] === ws) {
          delete this.connections[roomId][userId];
          logger.info(`User ${userId} disconnected from room ${roomId}`);
          return;
        }
      }
    }
  }

  broadcast(roomId: number, message: SyncMessage, excludedUserIds: number[] = []): void {
    const roomConnections = this.connections[roomId] || {};
    for (const userId in roomConnections) {
      if (!excludedUserIds.includes(Number(userId))) {
        const ws = roomConnections[userId];
        ws.send(JSON.stringify(message));
      }
    }
  }

  sendToUsers(roomId: number, userIds: number[], message: SyncMessage): void {
    const roomConnections = this.connections[roomId] || {};
    for (const userId of userIds) {
      const ws = roomConnections[userId];
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  onMessage(handler: SyncEventHandler): void {
    this.messageHandler = handler;
  }

  getUserIdsInRoom(roomId: number): number[] {
    return Object.keys(this.connections[roomId] || {}).map(Number);
  }
} 