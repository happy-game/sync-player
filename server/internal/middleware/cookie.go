package middleware

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UserInfo represents the user information stored in cookie
type UserInfo struct {
	RoomID uint `json:"roomId"`
	UserID uint `json:"userId"`
}

// ParseUserInfo middleware parses userInfo from cookie and sets it in context
func ParseUserInfo() gin.HandlerFunc {
	return func(c *gin.Context) {
		cookie, err := c.Cookie("userInfo")
		if err != nil {
			c.Next()
			return
		}

		var userInfo UserInfo
		if err := json.Unmarshal([]byte(cookie), &userInfo); err != nil {
			c.Next()
			return
		}

		c.Set("userInfo", userInfo)
		c.Set("roomId", userInfo.RoomID)
		c.Set("userId", userInfo.UserID)
		c.Next()
	}
}

// RequireAuth middleware requires user to be authenticated
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		_, exists := c.Get("userInfo")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// SetUserInfoCookie sets the userInfo cookie
func SetUserInfoCookie(c *gin.Context, roomID, userID uint) {
	userInfo := UserInfo{
		RoomID: roomID,
		UserID: userID,
	}

	jsonData, _ := json.Marshal(userInfo)
	c.SetCookie("userInfo", string(jsonData), 3600*24*7, "/", "", false, false)
}

// GetUserInfo retrieves user info from context
func GetUserInfo(c *gin.Context) (*UserInfo, bool) {
	value, exists := c.Get("userInfo")
	if !exists {
		return nil, false
	}

	userInfo, ok := value.(UserInfo)
	if !ok {
		return nil, false
	}

	return &userInfo, true
}
