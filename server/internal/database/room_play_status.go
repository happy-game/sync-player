package database

import (
	"errors"
	"sync-player-server/internal/models"
	"time"

	"gorm.io/gorm"
)

var ErrRoomPlayStatusVersionConflict = errors.New("room play status version conflict")

type RoomPlayStatusUpdate struct {
	Paused    *bool
	Time      *float64
	Timestamp *int64
	VideoID   *uint
}

func CreateRoomPlayStatus(roomID uint, paused bool, playTime float64, timestamp int64, videoID uint, tx ...*gorm.DB) error {
	db := getDB(tx...)

	status := &models.RoomPlayStatus{
		RoomID:    roomID,
		Paused:    paused,
		Time:      playTime,
		Timestamp: timestamp,
		VideoID:   videoID,
	}

	return db.Create(status).Error
}

func GetRoomPlayStatus(roomID uint) (*models.RoomPlayStatus, error) {
	var status models.RoomPlayStatus
	if err := DB.Where("room_id = ?", roomID).First(&status).Error; err != nil {
		return nil, err
	}
	return &status, nil
}

func ApplyRoomPlayStatusUpdate(roomID uint, baseVersion *uint64, update RoomPlayStatusUpdate, tx ...*gorm.DB) (*models.RoomPlayStatus, error) {
	db := getDB(tx...)

	current, err := getRoomPlayStatusWithDB(roomID, db)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if baseVersion != nil && *baseVersion != 0 {
				return roomPlayStatusZeroState(roomID), ErrRoomPlayStatusVersionConflict
			}

			status := &models.RoomPlayStatus{
				RoomID:    roomID,
				Paused:    true,
				Time:      0,
				Timestamp: time.Now().UnixMilli(),
				VideoID:   0,
				Version:   1,
			}
			if update.Paused != nil {
				status.Paused = *update.Paused
			}
			if update.Time != nil {
				status.Time = *update.Time
			}
			if update.Timestamp != nil {
				status.Timestamp = *update.Timestamp
			}
			if update.VideoID != nil {
				status.VideoID = *update.VideoID
			}

			if createErr := db.Create(status).Error; createErr != nil {
				if baseVersion != nil {
					var fetched *models.RoomPlayStatus
					if fetched, err = getRoomPlayStatusWithDB(roomID, db); err == nil {
						return fetched, ErrRoomPlayStatusVersionConflict
					}
				}
				return nil, createErr
			}

			return status, nil
		}

		return nil, err
	}

	if baseVersion != nil && current.Version != *baseVersion {
		return current, ErrRoomPlayStatusVersionConflict
	}

	updates := map[string]interface{}{
		"version": gorm.Expr("version + 1"),
	}
	if update.Paused != nil {
		updates["paused"] = *update.Paused
	}
	if update.Time != nil {
		updates["time"] = *update.Time
	}
	if update.Timestamp != nil {
		updates["timestamp"] = *update.Timestamp
	}
	if update.VideoID != nil {
		updates["video_id"] = *update.VideoID
	}

	whereClause := "room_id = ?"
	whereArgs := []interface{}{roomID}
	if baseVersion != nil {
		whereClause = "room_id = ? AND version = ?"
		whereArgs = append(whereArgs, *baseVersion)
	}

	result := db.Model(&models.RoomPlayStatus{}).
		Where(whereClause, whereArgs...).
		Updates(updates)
	if result.Error != nil {
		return nil, result.Error
	}
	if baseVersion != nil && result.RowsAffected == 0 {
		latest, latestErr := getRoomPlayStatusWithDB(roomID, db)
		if latestErr != nil {
			return nil, latestErr
		}
		return latest, ErrRoomPlayStatusVersionConflict
	}

	return getRoomPlayStatusWithDB(roomID, db)
}

func DeleteRoomPlayStatus(roomID uint, tx ...*gorm.DB) error {
	db := getDB(tx...)

	return db.Where("room_id = ?", roomID).Delete(&models.RoomPlayStatus{}).Error
}

func getRoomPlayStatusWithDB(roomID uint, db *gorm.DB) (*models.RoomPlayStatus, error) {
	var status models.RoomPlayStatus
	if err := db.Where("room_id = ?", roomID).First(&status).Error; err != nil {
		return nil, err
	}
	return &status, nil
}

func roomPlayStatusZeroState(roomID uint) *models.RoomPlayStatus {
	return &models.RoomPlayStatus{
		RoomID:    roomID,
		Paused:    true,
		Time:      0,
		Timestamp: 0,
		VideoID:   0,
		Version:   0,
	}
}
