package middleware

import (
	"net/http"
	"strings"
	"sync-player-server/internal/utils"

	"github.com/gin-gonic/gin"
)

// JWTAuth middleware validates JWT token from Authorization header
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Check if it's a Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Authorization header format. Expected: Bearer <token>"})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set claims in context for use in handlers
		c.Set("userInfo", UserInfo{
			RoomID: claims.RoomID,
			UserID: claims.UserID,
		})
		c.Set("userId", claims.UserID)
		c.Set("roomId", claims.RoomID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("jwtClaims", claims)

		c.Next()
	}
}

// OptionalJWTAuth middleware attempts to validate JWT token but doesn't require it
func OptionalJWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		// Check if it's a Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.Next()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			c.Next()
			return
		}

		// Set claims in context for use in handlers
		c.Set("userInfo", UserInfo{
			RoomID: claims.RoomID,
			UserID: claims.UserID,
		})
		c.Set("userId", claims.UserID)
		c.Set("roomId", claims.RoomID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Set("jwtClaims", claims)

		c.Next()
	}
}
