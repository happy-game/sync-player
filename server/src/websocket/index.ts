import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../config/logger';

// define the interface of connected user
interface ConnectedUser {
  userId: string;
  roomId: string;
  ws: WebSocket;
}

// create a map to store all connections
const connections = new Map<string, ConnectedUser>();

export function initWebSocket(server: Server) {
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws: WebSocket) => {
        logger.info('New client connected');

        ws.on('message', (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                logger.debug('Received:', data);
                
                if (data.type === 'auth') {
                    const { userId, roomId } = data;
                    if (userId && roomId) {
                        connections.set(userId, {
                            userId,
                            roomId,
                            ws
                        });
                        logger.info(`User ${userId} authenticated in room ${roomId}`);
                        ws.send(JSON.stringify({ type: 'auth_success' }));
                    }
                }
            } catch (error) {
                logger.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {
            for (const [userId, user] of connections.entries()) {
                if (user.ws === ws) {
                    connections.delete(userId);
                    logger.info(`User ${userId} disconnected`);
                    break;
                }
            }
        });
    });

    return wss;
}


export function getUserConnection(userId: string): ConnectedUser | undefined {
    return connections.get(userId);
}

export function getRoomUsers(roomId: string): ConnectedUser[] {
    return Array.from(connections.values())
        .filter(user => user.roomId === roomId);
} 