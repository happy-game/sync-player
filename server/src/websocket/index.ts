import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export function initWebSocket(server: Server) {
    const wss = new WebSocketServer({ server });
    
    wss.on('connection', (ws: WebSocket) => {
        console.log('New client connected');
        ws.send('Welcome to the server');
        ws.on('message', (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());
                // handle message
                console.log('Received:', data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });

    return wss;
} 