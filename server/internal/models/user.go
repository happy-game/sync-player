package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID             uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Username       string         `gorm:"type:varchar(50);uniqueIndex;not null" json:"username"`
	PasswordHash   *string        `gorm:"type:varchar(255)" json:"passwordHash,omitempty"`
	CreatedTime    time.Time      `gorm:"not null;autoCreateTime:milli" json:"createdTime"`
	LastActiveTime time.Time      `gorm:"not null;autoUpdateTime:milli" json:"lastActiveTime"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for User model
func (User) TableName() string {
	return "users"
}
