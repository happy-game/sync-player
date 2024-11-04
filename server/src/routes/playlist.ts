import { Router, Request, Response } from 'express';
import { addItemToPlaylist, queryPlaylistItems } from '../db/queries/playlist';

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

router.get('/query', async (req: Request, res: Response) => {
  const roomId = parseInt(req.query.roomId as string);
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }

  let playlistItemId: number | undefined;
  if (req.query.playlistItemId) {
    playlistItemId = parseInt(req.query.playlistItemId as string);
    if (isNaN(playlistItemId)) {
      res.status(400).json({ error: 'Invalid playlistItemId' });
      return;
    }
  }

  try {
    const items = await queryPlaylistItems(roomId, playlistItemId);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;