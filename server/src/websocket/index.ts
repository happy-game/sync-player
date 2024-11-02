import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from '../config/logger';

export function initWebSocket(server: Server) {
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws: WebSocket) => {
        logger.info('New client connected');
        ws.send('Welcome to the server');
        
        ws.on('message', (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                logger.debug('Received:', data);
            } catch (error) {
                logger.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {
            logger.info('Client disconnected');
        });
    });

    return wss;
} 