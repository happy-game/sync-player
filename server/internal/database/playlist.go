package database

import (
	"strings"
	"sync-player-server/internal/models"

	"gorm.io/gorm"
)

// AddItemToPlaylist adds an item to the playlist
func AddItemToPlaylist(roomID uint, title string, urls string, tx ...*gorm.DB) (uint, error) {
	db := getDB(tx...)

	var maxOrderIndex *int
	db.Model(&models.PlaylistItem{}).
		Where("room_id = ?", roomID).
		Select("MAX(order_index)").
		Scan(&maxOrderIndex)

	orderIndex := 0
	if maxOrderIndex != nil {
		orderIndex = *maxOrderIndex + 1
	}

	playlistItem := &models.PlaylistItem{
		RoomID:     roomID,
		Title:      title,
		OrderIndex: orderIndex,
		PlayStatus: models.PlayStatusNew,
	}

	if err := db.Create(playlistItem).Error; err != nil {
		return 0, err
	}

	urlList := strings.Split(urls, ",")
	for _, url := range urlList {
		videoSource := &models.VideoSource{
			PlaylistItemID: playlistItem.ID,
			URL:            strings.TrimSpace(url),
		}
		if err := db.Create(videoSource).Error; err != nil {
			return 0, err
		}
	}

	return playlistItem.ID, nil
}

// QueryPlaylistItems retrieves playlist items based on filters
func QueryPlaylistItems(roomID uint, playlistItemID *uint, playStatus *models.PlayStatus) ([]models.PlaylistItem, error) {
	var items []models.PlaylistItem

	query := DB.Where("room_id = ?", roomID)

	if playlistItemID != nil {
		query = query.Where("id = ?", *playlistItemID)
	}

	if playStatus != nil {
		query = query.Where("play_status = ?", *playStatus)
	}

	err := query.Preload("VideoSources").
		Order("order_index ASC").
		Find(&items).Error

	if err != nil {
		return nil, err
	}

	return items, nil
}

// DeletePlaylistItem deletes a playlist item and its video sources
func DeletePlaylistItem(playlistItemID uint) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("playlist_item_id = ?", playlistItemID).Delete(&models.VideoSource{}).Error; err != nil {
			return err
		}

		if err := tx.Delete(&models.PlaylistItem{}, playlistItemID).Error; err != nil {
			return err
		}

		return nil
	})
}

// ClearPlaylist clears all playlist items in a room
func ClearPlaylist(roomID uint) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var playlistItemIDs []uint
		if err := tx.Model(&models.PlaylistItem{}).
			Where("room_id = ?", roomID).
			Pluck("id", &playlistItemIDs).Error; err != nil {
			return err
		}

		if len(playlistItemIDs) > 0 {
			if err := tx.Where("playlist_item_id IN ?", playlistItemIDs).Delete(&models.VideoSource{}).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("room_id = ?", roomID).Delete(&models.PlaylistItem{}).Error; err != nil {
			return err
		}

		return nil
	})
}

// UpdatePlaylistItem updates a playlist item
func UpdatePlaylistItem(playlistItemID uint, title *string, urls *string, orderIndex *int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		updates := make(map[string]interface{})

		if title != nil {
			updates["title"] = *title
		}

		if orderIndex != nil {
			updates["order_index"] = *orderIndex
		}

		if len(updates) > 0 {
			if err := tx.Model(&models.PlaylistItem{}).Where("id = ?", playlistItemID).Updates(updates).Error; err != nil {
				return err
			}
		}

		if urls != nil {
			if err := tx.Where("playlist_item_id = ?", playlistItemID).Delete(&models.VideoSource{}).Error; err != nil {
				return err
			}

			urlList := strings.Split(*urls, ",")
			for _, url := range urlList {
				videoSource := &models.VideoSource{
					PlaylistItemID: playlistItemID,
					URL:            strings.TrimSpace(url),
				}
				if err := tx.Create(videoSource).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

// UpdatePlayStatus updates the play status of a playlist item
func UpdatePlayStatus(playlistItemID uint, playStatus models.PlayStatus) error {
	return DB.Model(&models.PlaylistItem{}).
		Where("id = ?", playlistItemID).
		Update("play_status", playStatus).Error
}
