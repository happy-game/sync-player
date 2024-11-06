import { Router, Request, Response } from 'express';
import logger from '../config/logger';

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
    roomPlayStatus[roomId] = { paused, time, timestamp, videoId };
    // TODO: broadcast the updated playStatus to all users in the room using websockets
    res.json({ message: 'Play status updated' });
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
    const now = Date.now();
    const timeDiff = now - playStatus.timestamp;
    if (!playStatus.paused) {   // if the video is playing, update the time
        playStatus.time += timeDiff / 1000;
        playStatus.timestamp = now;
    }
    // console.log(playStatus);
    res.json(playStatus);
});
export default router;