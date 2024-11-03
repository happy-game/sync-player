import PlaylistItem, { PlayStatus } from '../../models/PlaylistItem';
import VideoSource from '../../models/VideoSource';
import { Transaction } from 'sequelize';


export async function addItemToPlaylist(roomId: number, title: string, urls: string, transaction?: Transaction) {
  const maxOrderIndex = await PlaylistItem.max('orderIndex', { where: { roomId }, transaction }) as number | null;
  const orderIndex = maxOrderIndex ? maxOrderIndex + 1 : 0;

  const playlistItem = await PlaylistItem.create({ roomId, title, orderIndex, playStatus: PlayStatus.PENDING, createdTime: new Date() }, { transaction });
  const playlistItemId = playlistItem.id;

  const urlList = urls.split(',');
  for (const url of urlList) {
    await createVideoSource(playlistItemId, url);
  }
}

async function createVideoSource(playlistItemId: number, url: string) {
  return VideoSource.create({ playlistItemId, url });
}