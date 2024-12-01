import { Router, Request, Response } from 'express';
import { createUser, getUserByUsername } from '../db/queries/user';
import logger from '../config/logger';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      res.json({
        id: existingUser.id,
        username: existingUser.username,
        createdTime: existingUser.createdTime
      });
      return;
    }

    // create new user
    const user = await createUser(username, password);
    
    res.json({
      id: user.id,
      username: user.username,
      createdTime: user.createdTime
    });
  } catch (error) {
    logger.error('Failed to create user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.query;
    const user = await getUserByUsername(username as string);
    if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
    res.json(user);
  } catch (error) {
    logger.error('Failed to query user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 