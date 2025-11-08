package models

import (
	"gorm.io/gorm"
)

// RoomPlayStatus represents the current playback status of a room
type RoomPlayStatus struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomID    uint           `gorm:"not null;uniqueIndex" json:"roomId"`
	Paused    bool           `gorm:"default:false" json:"paused"`
	Time      float64        `gorm:"default:0" json:"time"`
	Timestamp int64          `gorm:"default:0" json:"timestamp"`
	VideoID   uint           `gorm:"default:0" json:"videoId"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Room *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
}

// TableName specifies the table name for RoomPlayStatus model
func (RoomPlayStatus) TableName() string {
	return "room_play_status"
}
