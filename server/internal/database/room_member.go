package database

import (
	"sync-player-server/internal/models"

	"gorm.io/gorm"
)

// AddMemberToRoom adds a member to a room
func AddMemberToRoom(roomID, userID uint, isAdmin, canGrantAdmin bool, tx ...*gorm.DB) (*models.RoomMember, error) {
	db := getDB(tx...)

	member := &models.RoomMember{
		RoomID:        roomID,
		UserID:        userID,
		IsAdmin:       isAdmin,
		CanGrantAdmin: canGrantAdmin,
	}

	if err := db.Create(member).Error; err != nil {
		return nil, err
	}

	return member, nil
}

// RemoveMemberFromRoom removes a member from a room
func RemoveMemberFromRoom(roomID, userID uint, tx ...*gorm.DB) error {
	db := getDB(tx...)

	return db.Where("room_id = ? AND user_id = ?", roomID, userID).Delete(&models.RoomMember{}).Error
}

// GetRoomMember retrieves a room member
func GetRoomMember(roomID, userID uint) (*models.RoomMember, error) {
	var member models.RoomMember
	if err := DB.Where("room_id = ? AND user_id = ?", roomID, userID).First(&member).Error; err != nil {
		return nil, err
	}
	return &member, nil
}

// SetMemberOnline updates the online status of a member
func SetMemberOnline(roomID, userID uint, online bool) error {
	return DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Update("online", online).Error
}

// OnlineUser represents an online user with their info
type OnlineUser struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	Online   bool   `json:"online"`
	IsAdmin  bool   `json:"isAdmin"`
}

// GetOnlineUsers retrieves all online users in a room
func GetOnlineUsers(roomID uint) ([]OnlineUser, error) {
	var members []models.RoomMember
	err := DB.Where("room_id = ? AND online = ?", roomID, true).
		Preload("User").
		Find(&members).Error

	if err != nil {
		return nil, err
	}

	users := make([]OnlineUser, 0, len(members))
	for _, member := range members {
		if member.User != nil {
			users = append(users, OnlineUser{
				ID:       member.UserID,
				Username: member.User.Username,
				Online:   member.Online,
				IsAdmin:  member.IsAdmin,
			})
		}
	}

	return users, nil
}
