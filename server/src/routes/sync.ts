import { Router, Request, Response } from 'express';
import logger from '../config/logger';
import * as Wss from '../websocket';

const router = Router();

interface PlayStatus {
    paused: boolean;    // true if the video is paused
    time: number;    // current time in seconds
    timestamp: number;  // timestamp of the last user action, in milliseconds
    videoId: number;    // the video id
}
const roomPlayStatus: { [roomId: number]: PlayStatus } = {};

router.post('/updateTime', async (req: Request, res: Response) => {
    // update playStatus in server
    const cookiesJson = JSON.parse(req.cookies.userInfo);
    const roomId = cookiesJson.roomId;
    const userId = cookiesJson.userId;  // TODO: check if the user is admin
    const { paused, time, timestamp, videoId } = req.body;
    logger.info(`sync updateTime: roomId=${roomId}, userId=${userId}, paused=${paused}, time=${time}, timestamp=${timestamp}, videoId=${videoId}`);
    if (!time || !timestamp || !videoId) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }
    try {
        roomPlayStatus[roomId] = { paused, time, timestamp, videoId };
        
        // use websocket to broadcast the play status to all users in the room
        const data = JSON.stringify({ type: 'updateTime', roomId, userId, paused, time, timestamp, videoId });
        Wss.broadcast(roomId, data, [userId]);

        res.json({ message: 'Play status updated' });
    } catch (error) {
        logger.error('Failed to update play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

router.get('/query', async (req: Request, res: Response) => {
    const cookiesJson = JSON.parse(req.cookies.userInfo);
    const roomId = cookiesJson.roomId;
    logger.info(`sync query: roomId=${roomId}`);
    if (!roomId) {
        res.status(400).json({ error: 'Invalid roomId' });
        return;
    }

    const playStatus = roomPlayStatus[roomId];
    if (!playStatus) {
        res.status(404).json({ error: 'Play status not found' });
        return;
    }
    try {
        const now = Date.now();
        const timeDiff = now - playStatus.timestamp;
        if (!playStatus.paused) {   // if the video is playing, update the time
            playStatus.time += timeDiff / 1000;
            playStatus.timestamp = now;
        }
        // console.log(playStatus);
        res.json(playStatus);
    } catch (error) {
        logger.error('Failed to query play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

router.post('/updatePause', async (req: Request, res: Response) => {
    const cookiesJson = JSON.parse(req.cookies.userInfo);
    const roomId = cookiesJson.roomId;
    const userId = cookiesJson.userId;  // TODO: check if the user is admin

    const { paused, timestamp } = req.body;
    logger.info(`sync updatePause: roomId=${roomId}, userId=${userId}, paused=${paused}, timestamp=${timestamp}`);
    if (paused === undefined || !timestamp) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }
    try {
        if (!roomPlayStatus[roomId]) {
            roomPlayStatus[roomId] = { paused, time: 0, timestamp, videoId: 0 };
        }
        roomPlayStatus[roomId].paused = paused;
        roomPlayStatus[roomId].timestamp = timestamp;

        // use websocket to broadcast the play status to all users in the room
        const data = JSON.stringify({ type: 'updatePause', roomId, userId, paused, timestamp });
        Wss.broadcast(roomId, data, [userId]);

        res.json({ message: 'Play status updated' });
    } catch (error) {
        logger.error('Failed to update play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

export default router;