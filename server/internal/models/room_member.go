package models

import (
	"gorm.io/gorm"
)

// RoomMember represents the relationship between users and rooms
type RoomMember struct {
	ID             uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomID         uint           `gorm:"not null;index" json:"roomId"`
	UserID         uint           `gorm:"not null;index" json:"userId"`
	IsAdmin        bool           `gorm:"default:false" json:"isAdmin"`
	CanGrantAdmin  bool           `gorm:"default:false" json:"canGrantAdmin"`
	Online         bool           `gorm:"default:false" json:"online"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Associations
	User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Room *Room `gorm:"foreignKey:RoomID" json:"room,omitempty"`
}

// TableName specifies the table name for RoomMember model
func (RoomMember) TableName() string {
	return "room_members"
}
