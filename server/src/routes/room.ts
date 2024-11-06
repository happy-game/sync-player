import { Router, Request, Response } from 'express';
import { createRoom, getRoomByName, verifyRoomPassword, getRoomById } from '../db/queries/room';
import { addMemberToRoom, removeMemberFromRoom, getRoomMember } from '../db/queries/roomMember';
import { getUserById } from '../db/queries/user';
import sequelize from '../db/connection';
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

router.get('/query', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.query;
  try {
    const room = await getRoomByName(name as string);
    if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join', async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { roomId, userId, password } = req.body;
    
    // check if user exists
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // check if room exists
    const room = await getRoomById(roomId);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // check if password is valid
    const isPasswordValid = await verifyRoomPassword(room, password || '');
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    // check if user is already in the room
    const existingMember = await getRoomMember(roomId, userId);
    if (existingMember) {
      res.status(400).json({ error: 'User is already in the room' });
      return;
    }

    // add user to room
    const member = await addMemberToRoom(roomId, userId, false, false, transaction);
    
    await transaction.commit();
    // TODO: set cookie
    res.json({
      roomId: member.roomId,
      userId: member.userId,
      isAdmin: member.isAdmin,
      canGrantAdmin: member.canGrantAdmin
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to join room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/leave', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId, userId } = req.body;

    // check if user is in the room
    const member = await getRoomMember(roomId, userId);
    if (!member) {
      res.status(404).json({ error: 'User is not in the room' });
      return;
    }

    // remove user from room
    try {
      await removeMemberFromRoom(roomId, userId);
    } catch (error) {
      logger.error('Failed to remove member from room:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
    
    res.json({ message: 'Successfully left the room' });
  } catch (error) {
    logger.error('Failed to leave room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 