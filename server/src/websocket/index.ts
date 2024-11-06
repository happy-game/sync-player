import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../config/logger';

interface WebSocketMap {
    [roomId: number]: {
        [userId: number]: WebSocket;
    };
}

let wss: WebSocketServer;
const connections: WebSocketMap = {};

export function initWebSocket(server: Server) {
    wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws: WebSocket) => {
        logger.info('New client connected');

        ws.send("Hello, client!");
        ws.on('message', (message: Buffer) => {
            logger.debug('Received message:', message.toString());
            try {
                const data = JSON.parse(message.toString());
                
                if (data.type === 'auth') { // TODO: Implement real authentication
                    const { userId, roomId } = data;
                    if (userId && roomId) {
                        if (!connections[roomId]) { // Create a new room
                            connections[roomId] = {};
                        }
                        connections[roomId][userId] = ws;
                    }
                    logger.info(`User ${userId} connected to room ${roomId} using websocket`);
                }
            } catch (error) {
                logger.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {
            for (const roomId in connections) {
                for (const userId in connections[roomId]) {
                    if (connections[roomId][userId] === ws) {
                        delete connections[roomId][userId];
                        logger.info(`User ${userId} disconnected`);
                        break;
                    }
                }
            }
        });
    });

    return wss;
}


export function getWebSocketServer(): WebSocketServer {
    return wss;
}

export function getUserIdsInRoom(roomId: number): number[] {
    return Object.keys(connections[roomId] || {}).map(Number);
}
