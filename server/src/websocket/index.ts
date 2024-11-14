import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../config/logger';
import { getRoomPlayStatus, deleteRoomPlayStatus } from '../db/queries/roomPlayStatus';
import { setMemberOnline } from '../db/queries/roomMember';

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

        ws.send(JSON.stringify({ type: 'connected' }));
        ws.on('message', (message: Buffer) => {
            logger.debug('Received message:', message.toString());
            try {
                const data = JSON.parse(message.toString());
                
                if (data.type === 'auth') { // TODO: Implement real authentication
                    const { userId, roomId } = data.payload;
                    if (userId && roomId) {
                        if (!connections[roomId]) { // Create a new room
                            connections[roomId] = {};
                        }
                        connections[roomId][userId] = ws;
                        
                        // 广播用户列表更新
                        setMemberOnline(parseInt(roomId), parseInt(userId), true)
                        const data = {
                            type: 'updateUserList',
                            roomId: parseInt(roomId),
                        }
                        broadcast(parseInt(roomId), data);
                    }
                    logger.info(`User ${userId} connected to room ${roomId} using websocket`);
                }
                else if (data.type === 'ping') {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
            } catch (error) {
                logger.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {  // FIXME: a better way to handle this instead searching through all connections
            for (const roomId in connections) {
                for (const userId in connections[roomId]) {
                    if (connections[roomId][userId] === ws) {
                        delete connections[roomId][userId];
                        logger.info(`User ${userId} disconnected`);
                        // if the room is empty, delete the room and the play status
                        // if (Object.keys(connections[roomId]).length === 0) {
                        //     delete connections[roomId];
                        //     deleteRoomPlayStatus(Number(roomId))
                        //     .then(() => {
                        //         logger.info(`Room ${roomId} deleted`);
                        //     })
                        //     .catch((error) => {
                        //         logger.error(`Failed to delete room ${roomId}:`, error);
                        //     });
                        // }
                        
                        // 广播用户列表更新
                        setMemberOnline(parseInt(roomId), parseInt(userId), false)
                        const data = {
                            type: 'updateUserList',
                            roomId: parseInt(roomId),
                        }
                        broadcast(parseInt(roomId), data);
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

// Broadcast data to all users in a room, except the excluded users
export function broadcast(roomId: number, data: any, excludedUserIds: number[] = []) {
    const roomConnections = connections[roomId] || {};
    for (const userId in roomConnections) {
        if (!excludedUserIds.includes(Number(userId))) {
            const ws = roomConnections[userId];
            ws.send(JSON.stringify(data));
        }
    }
}

// Send data to include users in a room
export function sendToUsers(roomId: number, userIds: number[], data: any) {
    const roomConnections = connections[roomId] || {};
    for (const userId of userIds) {
        const ws = roomConnections[userId];
        if (ws) {
            ws.send(JSON.stringify(data));
        }
    }
}