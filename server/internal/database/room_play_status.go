package database

import (
	"sync-player-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// CreateRoomPlayStatus creates a new room play status
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

// GetRoomPlayStatus retrieves the play status of a room
func GetRoomPlayStatus(roomID uint) (*models.RoomPlayStatus, error) {
	var status models.RoomPlayStatus
	if err := DB.Where("room_id = ?", roomID).First(&status).Error; err != nil {
		return nil, err
	}
	return &status, nil
}

// UpdateRoomPlayStatus updates the play status of a room
func UpdateRoomPlayStatus(roomID uint, data map[string]interface{}, tx ...*gorm.DB) error {
	db := getDB(tx...)

	status, err := GetRoomPlayStatus(roomID)
	if err != nil {
		paused := true
		playTime := 0.0
		timestamp := time.Now().UnixMilli()
		videoID := uint(0)

		if v, ok := data["paused"].(bool); ok {
			paused = v
		}
		if v, ok := data["time"].(float64); ok {
			playTime = v
		}
		if v, ok := data["timestamp"].(int64); ok {
			timestamp = v
		}
		if v, ok := data["videoId"].(uint); ok {
			videoID = v
		}

		return CreateRoomPlayStatus(roomID, paused, playTime, timestamp, videoID, db)
	}

	return db.Model(status).Updates(data).Error
}

// DeleteRoomPlayStatus deletes the play status of a room
func DeleteRoomPlayStatus(roomID uint, tx ...*gorm.DB) error {
	db := getDB(tx...)

	return db.Where("room_id = ?", roomID).Delete(&models.RoomPlayStatus{}).Error
}
