import { Router, Request, Response } from 'express';
import { addItemToPlaylist } from '../db/queries/playlist';

const router = Router();

router.post('/add', async (req: Request, res: Response) => {
  const { roomId, title, urls } = req.body;
  // validate roomId, title, urls
  if (!roomId || !title || !urls) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  await addItemToPlaylist(roomId, title, urls);
  res.json({ message: 'Item added to playlist' });
});

export default router;