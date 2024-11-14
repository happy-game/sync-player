import { Router, Request, Response } from 'express';
import logger from '../config/logger';
import { getSyncManager } from '../sync/syncManager';
import { getRoomPlayStatus, updateRoomPlayStatus, createRoomPlayStatus } from '../db/queries/roomPlayStatus';
import env from '../config/env';

const router = Router();

router.post('/updateTime', async (req: Request, res: Response) => {
    try {
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
        const playStatus = await getRoomPlayStatus(roomId);
        if (!playStatus) {
            await createRoomPlayStatus(roomId, paused, time, timestamp, videoId);
        } else {
            await updateRoomPlayStatus(roomId, { paused, time, timestamp, videoId });
        }
        
        const syncManager = getSyncManager();
        syncManager.broadcast(roomId, {
            type: 'updateTime',
            payload: { roomId, userId, paused, time, timestamp, videoId }
        }, [userId]);

        res.json({ message: 'Play status updated' });
    } catch (error) {
        logger.error('Failed to update play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

router.get('/query', async (req: Request, res: Response) => {
    try {
        const cookiesJson = JSON.parse(req.cookies.userInfo);
        const roomId = cookiesJson.roomId;
        logger.info(`sync query: roomId=${roomId}`);
        if (!roomId) {
            res.status(400).json({ error: 'Invalid roomId' });
            return;
        }
    
        const playStatus = await getRoomPlayStatus(roomId);
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
    } catch (error) {
        logger.error('Failed to query play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

router.post('/updatePause', async (req: Request, res: Response) => {
    try {
        const cookiesJson = JSON.parse(req.cookies.userInfo);
        const roomId = cookiesJson.roomId;
        const userId = cookiesJson.userId;  // TODO: check if the user is admin
    
        const { paused, timestamp } = req.body;
        logger.info(`sync updatePause: roomId=${roomId}, userId=${userId}, paused=${paused}, timestamp=${timestamp}`);
        if (paused === undefined || !timestamp) {
            res.status(400).json({ error: 'Invalid request body' });
            return;
        }
        const playStatus = await getRoomPlayStatus(roomId);
        if (!playStatus) {
            await createRoomPlayStatus(roomId, paused, 0, timestamp, 0);
        } else {
            await updateRoomPlayStatus(roomId, { paused, timestamp });
        }

        const syncManager = getSyncManager();
        syncManager.broadcast(roomId, {
            type: 'updatePause',
            payload: { roomId, userId, paused, timestamp }
        }, [userId]);

        res.json({ message: 'Play status updated' });
    } catch (error) {
        logger.error('Failed to update play status:', error);
        res.status(404).json({ error: 'Play status not found' });
    }
});

router.get('/protocol', async (req: Request, res: Response) => {
    try {
        res.json({ protocol: env.SYNC_PROTOCOL });
    }
    catch (error) {
        logger.error('Failed to get protocol:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;