package models

import (
	"time"

	"gorm.io/gorm"
)

// VideoSource represents a video source URL for a playlist item
type VideoSource struct {
	ID             uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	PlaylistItemID uint           `gorm:"not null;index" json:"playlistItemId"`
	URL            string         `gorm:"type:varchar(255);not null" json:"url"`
	Label          string         `gorm:"type:varchar(100)" json:"label"`
	CreatedTime    time.Time      `gorm:"not null;autoCreateTime:milli" json:"createdTime"`
	LastActiveTime time.Time      `gorm:"not null;autoUpdateTime:milli" json:"lastActiveTime"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	PlaylistItem *PlaylistItem `gorm:"foreignKey:PlaylistItemID" json:"playlistItem,omitempty"`
}

// TableName specifies the table name for VideoSource model
func (VideoSource) TableName() string {
	return "video_sources"
}
