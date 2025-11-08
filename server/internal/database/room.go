package database

import (
	"sync-player-server/internal/models"

	"gorm.io/gorm"
)

// CreateRoom creates a new room
func CreateRoom(name string, password *string, tx ...*gorm.DB) (*models.Room, error) {
	db := getDB(tx...)

	room := &models.Room{
		Name:         name,
		PasswordHash: password,
	}

	if err := db.Create(room).Error; err != nil {
		return nil, err
	}

	return room, nil
}

// GetRoomByID retrieves a room by ID
func GetRoomByID(id uint) (*models.Room, error) {
	var room models.Room
	if err := DB.First(&room, id).Error; err != nil {
		return nil, err
	}
	return &room, nil
}

// GetRoomByName retrieves a room by name
func GetRoomByName(name string) (*models.Room, error) {
	var room models.Room
	if err := DB.Where("name = ?", name).First(&room).Error; err != nil {
		return nil, err
	}
	return &room, nil
}

// VerifyRoomPassword verifies if the provided password matches the room's password
func VerifyRoomPassword(room *models.Room, password string) bool {
	if room.PasswordHash == nil {
		return true
	}
	return password == *room.PasswordHash
}
