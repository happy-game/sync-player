package models

import (
	"time"

	"gorm.io/gorm"
)

// PlayStatus represents the status of a playlist item
type PlayStatus string

const (
	PlayStatusNew      PlayStatus = "new"
	PlayStatusPlaying  PlayStatus = "playing"
	PlayStatusFinished PlayStatus = "finished"
)

// PlaylistItem represents an item in the playlist
type PlaylistItem struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomID      uint           `gorm:"not null;index" json:"roomId"`
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	OrderIndex  int            `gorm:"not null" json:"orderIndex"`
	PlayStatus  PlayStatus     `gorm:"type:varchar(20);not null;default:'new'" json:"playStatus"`
	CreatedTime time.Time      `gorm:"not null;autoCreateTime:milli" json:"createdTime"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	Room         *Room          `gorm:"foreignKey:RoomID" json:"room,omitempty"`
	VideoSources []VideoSource  `gorm:"foreignKey:PlaylistItemID" json:"videoSources,omitempty"`
}

// TableName specifies the table name for PlaylistItem model
func (PlaylistItem) TableName() string {
	return "playlist_items"
}
