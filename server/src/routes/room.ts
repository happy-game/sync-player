import { Router, Request, Response } from 'express';
import { createRoom, getRoomByName, verifyRoomPassword } from '../db/queries/room';
import logger from '../config/logger';

const router = Router();


router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password } = req.body;
    
    // check if room name already exists
    const existingRoom = await getRoomByName(name);
    if (existingRoom) {
      res.status(400).json({ error: 'Room name already exists' });
      return;
    }

    // create new room
    const room = await createRoom(name, password);
    
    res.json({
      id: room.id,
      name: room.name,
      createdTime: room.createdTime
    });
  } catch (error) {
    logger.error('Failed to create room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, password } = req.body;
    
    // find room by name
    const room = await getRoomByName(name);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // verify password
    const isPasswordValid = await verifyRoomPassword(room, password || '');
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    res.json({
      id: room.id,
      name: room.name,
      createdTime: room.createdTime
    });
  } catch (error) {
    logger.error('Failed to join room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 