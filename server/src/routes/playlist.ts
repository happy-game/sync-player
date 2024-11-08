import { Router, Request, Response } from 'express';
import { addItemToPlaylist, queryPlaylistItems, deletePlaylistItem, clearPlaylist, updatePlaylistItem, updatePlayStatus } from '../db/queries/playlist';
import { getRoomPlayStatus, updateRoomPlayStatus, createRoomPlayStatus } from '../db/queries/roomPlayStatus';
import { PlayStatus } from '../models/PlaylistItem';
import logger from '../config/logger';

const router = Router();

router.post('/add', async (req: Request, res: Response) => {
  const { title, urls } = req.body;

  const cookiesJson = JSON.parse(req.cookies.userInfo);
  const roomId = cookiesJson.roomId;
  // validate roomId, title, urls
  if (!roomId || !title || !urls) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  try {
    const playlistItemId = await addItemToPlaylist(roomId, title, urls);
    res.json({ 
      message: 'Item added to playlist',
      playlistItemId
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/query', async (req: Request, res: Response) => {
  // const roomId = parseInt(req.query.roomId as string);
  const cookiesJson = JSON.parse(req.cookies.userInfo);
  const roomId = cookiesJson.roomId;
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }

  let playlistItemId: number | undefined;
  let playStatus: PlayStatus | undefined;
  if (req.query.playlistItemId) {
    playlistItemId = parseInt(req.query.playlistItemId as string);
    if (isNaN(playlistItemId)) {
      res.status(400).json({ error: 'Invalid playlistItemId' });
      return;
    }
  }
  if (req.query.playStatus) {
    playStatus = req.query.playStatus as PlayStatus;
    if (!Object.values(PlayStatus).includes(playStatus)) {
      res.status(400).json({ error: 'Invalid playStatus' });
      return;
    }
  }

  try {
    // if didn't specify  playStatus, query PLAYING items and NEW items
    if (!playStatus) {
      const playingItems = await queryPlaylistItems(roomId, undefined, PlayStatus.PLAYING);
      const newItems = await queryPlaylistItems(roomId, undefined, PlayStatus.NEW);
      const items = playingItems.concat(newItems);
      res.json(items);
    }
    else {
      const items = await queryPlaylistItems(roomId, playlistItemId, playStatus);
      res.json(items);
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/delete', async (req: Request, res: Response) => {
  const { playlistItemId } = req.body;
  if (!playlistItemId) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    // delete playlist item and its video sources
    await deletePlaylistItem(playlistItemId);
    res.json({ message: 'Item deleted from playlist' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/clear', async (req: Request, res: Response) => {
  // const { roomId } = req.body;
  const cookiesJson = JSON.parse(req.cookies.userInfo);
  const roomId = cookiesJson.roomId;
  if (isNaN(roomId)) {
    res.status(400).json({ error: 'Invalid roomId' });
    return;
  }

  try {
    // clear playlist items and their video sources
    await clearPlaylist(roomId);
    res.json({ message: 'Playlist cleared' });
  } catch (error) {
    logger.error('Failed to clear playlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/updateOrder', async (req: Request, res: Response) => {
  const { orderIndexList } = req.body;  // array of { playlistItemId: number, orderIndex: number }
  if (!Array.isArray(orderIndexList)) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }
  try {
    orderIndexList.forEach((item: any) => {
      if (typeof item.playlistItemId !== 'number' || typeof item.orderIndex !== 'number') {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      updatePlaylistItem(item.playlistItemId, undefined, undefined, item.orderIndex); // update orderIndex only
    });
    res.json({ message: 'Order updated' });
  }
  catch (error) {
    logger.error('Failed to update order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/switch', async (req: Request, res: Response) => {
  const cookiesJson = JSON.parse(req.cookies.userInfo);
  const roomId = cookiesJson.roomId;
  const { playlistItemId } = req.body;
  if (!playlistItemId) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try { 
    // set all playing items to finished and the new item to playing
    const playingItems = await queryPlaylistItems(roomId, undefined, PlayStatus.PLAYING);
    playingItems.forEach(async (item) => {
      await updatePlayStatus(item.id, PlayStatus.FINISHED);
    });
    await updatePlayStatus(playlistItemId, PlayStatus.PLAYING);

    // update room play status
    const playStatus = await getRoomPlayStatus(roomId);
    if (playStatus) {
      await updateRoomPlayStatus(roomId, { paused: false, time: 0, timestamp: Date.now(), videoId: playlistItemId });
    }
    else {
      await createRoomPlayStatus(roomId, false, 0, Date.now(), playlistItemId);
    }
    // TODO: broadcast the play status to all clients
    res.json({ message: 'Playlist item switched' });
  } catch (error) {
    logger.error('Failed to switch playlist item:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;