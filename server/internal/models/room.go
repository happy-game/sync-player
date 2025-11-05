package models

import (
	"time"

	"gorm.io/gorm"
)

// Room represents a sync room
type Room struct {
	ID             uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name           string         `gorm:"type:varchar(100);not null" json:"name"`
	PasswordHash   *string        `gorm:"type:varchar(255)" json:"passwordHash,omitempty"`
	CreatedTime    time.Time      `gorm:"not null;autoCreateTime:milli" json:"createdTime"`
	LastActiveTime time.Time      `gorm:"not null;autoUpdateTime:milli" json:"lastActiveTime"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Room model
func (Room) TableName() string {
	return "rooms"
}
