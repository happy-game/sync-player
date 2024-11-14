// use sse(Server-Sent Events) to sync data
import { Router, Request, Response } from 'express';
import { ISyncAdapter, SyncEventHandler, SyncMessage } from '../types';
import logger from '../../config/logger';
import { setMemberOnline } from '../../db/queries/roomMember';

interface SSEClient {
  userId: number;
  roomId: number;
  response: Response;
}

interface SSEConnectionMap {
  [roomId: number]: {
    [userId: number]: SSEClient;
  };
}

const connections: SSEConnectionMap = {}; // FIXME: why is this not in the class?

export class SSEAdapter implements ISyncAdapter {
  // private connections: SSEConnectionMap = {};  // FIXME: can't get connections
  private messageHandler: SyncEventHandler | null = null;
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.get('/connect', (req: Request, res: Response) => {
      const userId = Number(req.query.userId);
      const roomId = Number(req.query.roomId);

      if (!userId || !roomId) {
        res.status(400).json({ error: 'Missing userId or roomId' });
        return;
      }

      // set sse headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // create heartbeat to keep connection
      const heartbeat = setInterval(() => {
        res.write(':\n\n');
      }, 1000 * 30);

      // save connection
      if (!connections[roomId]) {
        logger.debug(`create ${roomId}`)
        connections[roomId] = {};
      }
      connections[roomId][userId] = { userId, roomId, response: res };
      const keys_in_room = Object.keys(connections[roomId]);
      logger.debug(`room ${roomId} has users: ${keys_in_room}`);
      setMemberOnline(roomId, userId, true)

      // send connected message
      this.sendEventToClient(res, 'connected', {});
      logger.info(`User ${userId} connected to room ${roomId} using SSE`);

      // handle connection close
      req.on('close', () => {
        clearInterval(heartbeat);
        if (connections[roomId]?.[userId]) {
          delete connections[roomId][userId];
          logger.info(`User ${userId} disconnected from room ${roomId}`);
        }
        setMemberOnline(roomId, userId, false)
      });
    });
  }

  private sendEventToClient(res: Response, type: string, data: any) {
    const result = {
      type,
      data
    };
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  }

  private getClientsInRoom(roomId: number): SSEClient[] {
    // console.log(connections[roomId]);
    return Object.values(connections[roomId] || {});
  }

  broadcast(roomId: number, message: SyncMessage, excludedUserIds: number[] = []): void {
    const roomClients = this.getClientsInRoom(roomId);
    if (!roomClients || roomClients.length === 0) {
      logger.warn(`No clients found in room ${roomId}`);
      return;
    }
    for (const userId in roomClients) {
      if (!excludedUserIds.includes(Number(userId))) {
        logger.debug(`broadcast to ${userId}`);
        const client = roomClients[userId];
        this.sendEventToClient(client.response, message.type, message);
      }
    }
  }

  sendToUsers(roomId: number, userIds: number[], message: SyncMessage): void {
    const roomClients = connections[roomId] || {};
    for (const userId of userIds) {
      const client = roomClients[userId];
      if (client) {
        this.sendEventToClient(client.response, message.type, message);
      }
    }
  }

  onMessage(handler: SyncEventHandler): void {
    this.messageHandler = handler;
  }

  getUserIdsInRoom(roomId: number): number[] {
    return Object.keys(connections[roomId] || {}).map(Number);
  }

  getRouter(): Router {
    return this.router;
  }
}

// create and export router instance
const sseAdapter = new SSEAdapter();
export default sseAdapter.getRouter();