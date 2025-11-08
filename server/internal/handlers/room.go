package handlers

import (
	"fmt"
	"net/http"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	"sync-player-server/internal/middleware"
	"sync-player-server/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RoomCreate handles room creation
func RoomCreate(c *gin.Context) {
	var req struct {
		Name     string `json:"name" binding:"required"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	existingRoom, err := database.GetRoomByName(req.Name)
	if err == nil && existingRoom != nil {
		c.JSON(http.StatusOK, gin.H{
			"id":          existingRoom.ID,
			"name":        existingRoom.Name,
			"createdTime": existingRoom.CreatedTime,
		})
		return
	}

	var password *string
	if req.Password != "" {
		password = &req.Password
	}

	room, err := database.CreateRoom(req.Name, password)
	if err != nil {
		config.Logger.Errorf("Failed to create room: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          room.ID,
		"name":        room.Name,
		"createdTime": room.CreatedTime,
	})
}

// RoomQuery handles room query by name
func RoomQuery(c *gin.Context) {
	name := c.Query("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room name is required"})
		return
	}

	room, err := database.GetRoomByName(name)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return
		}
		config.Logger.Errorf("Failed to query room: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, room)
}

// RoomJoin handles user joining a room
func RoomJoin(c *gin.Context) {
	var req struct {
		RoomID   uint   `json:"roomId" binding:"required"`
		UserID   uint   `json:"userId" binding:"required"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		user, err := database.GetUserByID(req.UserID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return err
		}

		room, err := database.GetRoomByID(req.RoomID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
			return err
		}

		if !database.VerifyRoomPassword(room, req.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
			return gorm.ErrInvalidData
		}

		existingMember, _ := database.GetRoomMember(req.RoomID, req.UserID)
		if existingMember != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User is already in the room"})
			return gorm.ErrDuplicatedKey
		}

		newMember, err := database.AddMemberToRoom(req.RoomID, req.UserID, false, false, tx)
		if err != nil {
			config.Logger.Errorf("Failed to add member to room: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return err
		}

		// Generate JWT token
		token, err := utils.GenerateJWT(user.ID, user.Username, req.RoomID, newMember.IsAdmin)
		if err != nil {
			config.Logger.Errorf("Failed to generate JWT token: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate authentication token"})
			return err
		}

		// Also set cookie for backward compatibility
		middleware.SetUserInfoCookie(c, req.RoomID, user.ID)

		c.JSON(http.StatusOK, gin.H{
			"token":         token,
			"roomId":        newMember.RoomID,
			"userId":        newMember.UserID,
			"isAdmin":       newMember.IsAdmin,
			"canGrantAdmin": newMember.CanGrantAdmin,
		})

		return nil
	})

	if err != nil {
		return
	}
}

// RoomLeave handles user leaving a room
func RoomLeave(c *gin.Context) {
	var req struct {
		RoomID uint `json:"roomId" binding:"required"`
		UserID uint `json:"userId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	_, err := database.GetRoomMember(req.RoomID, req.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User is not in the room"})
		return
	}

	if err := database.RemoveMemberFromRoom(req.RoomID, req.UserID); err != nil {
		config.Logger.Errorf("Failed to remove member from room: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully left the room"})
}

// RoomQueryOnlineUsers handles querying online users in a room
func RoomQueryOnlineUsers(c *gin.Context) {
	roomIDStr := c.Query("roomId")
	if roomIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required"})
		return
	}

	var roomID uint
	if _, err := fmt.Sscanf(roomIDStr, "%d", &roomID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid room ID"})
		return
	}

	users, err := database.GetOnlineUsers(roomID)
	if err != nil {
		config.Logger.Errorf("Failed to query online users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, users)
}
