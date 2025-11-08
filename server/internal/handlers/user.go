package handlers

import (
	"net/http"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// UserLogin handles user login/registration
func UserLogin(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	existingUser, err := database.GetUserByUsername(req.Username)
	if err == nil && existingUser != nil {
		c.JSON(http.StatusOK, gin.H{
			"id":          existingUser.ID,
			"username":    existingUser.Username,
			"createdTime": existingUser.CreatedTime,
		})
		return
	}

	var password *string
	if req.Password != "" {
		password = &req.Password
	}

	user, err := database.CreateUser(req.Username, password)
	if err != nil {
		config.Logger.Errorf("Failed to create user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"username":    user.Username,
		"createdTime": user.CreatedTime,
	})
}

// UserQuery handles user query by username
func UserQuery(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username is required"})
		return
	}

	user, err := database.GetUserByUsername(username)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		config.Logger.Errorf("Failed to query user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	c.JSON(http.StatusOK, user)
}
