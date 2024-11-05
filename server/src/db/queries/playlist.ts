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
  return playlistItemId;
}

async function createVideoSource(playlistItemId: number, url: string) {
  return VideoSource.create({ playlistItemId, url });
}

export async function queryPlaylistItems(roomId: number, playlistItemId?: number) {
  const whereClause: any = { roomId };
  if (playlistItemId) {
    whereClause.id = playlistItemId;
  }
   const items = await PlaylistItem.findAll({
    where: whereClause,
    include: [VideoSource],
    order: [['orderIndex', 'ASC']]
  });

  return items;
}
export async function deletePlaylistItem(playlistItemId: number) {
  await PlaylistItem.destroy({ where: { id: playlistItemId } });
  await VideoSource.destroy({ where: { playlistItemId } });
}

export async function clearPlaylist(roomId: number) {
  const playlistIds = (await PlaylistItem.findAll({ where: { roomId } })).map((item) => item.id);
  playlistIds.forEach(async (playlistItemId) => {
    await VideoSource.destroy({ where: { playlistItemId } });
  });
  await PlaylistItem.destroy({ where: { roomId } });
}

export async function updatePlaylistItem(playlistItemId: number, title?: string, urls?: string, orderIndex?: number) {
  if (!title && !urls && !orderIndex) {
    return;
  }
  if (orderIndex !== undefined) {
    await PlaylistItem.update({ orderIndex }, { where: { id: playlistItemId } });
  }
  if (title) {
    await PlaylistItem.update({ title }, { where: { id: playlistItemId } });
  }
  if (urls) {
    await VideoSource.destroy({ where: { playlistItemId } }); // delete old video sources
    createVideoSource(playlistItemId, urls);
  }
}