package routes

import (
	"sync-player-server/internal/handlers"
	"sync-player-server/internal/middleware"
	"sync-player-server/internal/sync/adapters"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all routes
func SetupRoutes(r *gin.Engine, wsAdapter *adapters.WebSocketAdapter, sseAdapter *adapters.SSEAdapter) {
	// Try JWT first, then fall back to cookie for backward compatibility
	r.Use(middleware.OptionalJWTAuth())
	r.Use(middleware.ParseUserInfo())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok!"})
	})

	// API routes group
	apiGroup := r.Group("/api")
	{
		userGroup := apiGroup.Group("/user")
		{
			userGroup.POST("/login", handlers.UserLogin)
			userGroup.GET("/query", handlers.UserQuery)
		}

		roomGroup := apiGroup.Group("/room")
		{
			roomGroup.POST("/create", handlers.RoomCreate)
			roomGroup.GET("/query", handlers.RoomQuery)
			roomGroup.POST("/join", handlers.RoomJoin)
			roomGroup.POST("/leave", handlers.RoomLeave)
			roomGroup.GET("/queryOnlineUsers", handlers.RoomQueryOnlineUsers)
		}

		playlistGroup := apiGroup.Group("/playlist")
		playlistGroup.Use(middleware.RequireAuth())
		{
			playlistGroup.POST("/add", handlers.PlaylistAdd)
			playlistGroup.GET("/query", handlers.PlaylistQuery)
			playlistGroup.DELETE("/delete", handlers.PlaylistDelete)
			playlistGroup.DELETE("/clear", handlers.PlaylistClear)
			playlistGroup.POST("/updateOrder", handlers.PlaylistUpdateOrder)
			playlistGroup.POST("/switch", handlers.PlaylistSwitch)
		}

		syncGroup := apiGroup.Group("/sync")
		syncGroup.Use(middleware.RequireAuth())
		{
			syncGroup.POST("/updateTime", handlers.SyncUpdateTime)
			syncGroup.GET("/query", handlers.SyncQuery)
			syncGroup.POST("/updatePause", handlers.SyncUpdatePause)
			syncGroup.GET("/protocol", handlers.SyncProtocol)
		}
	}

	// WebSocket and SSE endpoints remain at root level
	if wsAdapter != nil {
		r.GET("/ws", wsAdapter.HandleWebSocket)
	}

	if sseAdapter != nil {
		r.GET("/sse/connect", sseAdapter.HandleSSEConnect)
	}
}
