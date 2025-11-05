package routes

import (
	"sync-player-server/internal/handlers"
	"sync-player-server/internal/middleware"
	"sync-player-server/internal/sync/adapters"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all routes
func SetupRoutes(r *gin.Engine, wsAdapter *adapters.WebSocketAdapter, sseAdapter *adapters.SSEAdapter) {
	r.Use(middleware.ParseUserInfo())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok!"})
	})

	userGroup := r.Group("/user")
	{
		userGroup.POST("/login", handlers.UserLogin)
		userGroup.GET("/query", handlers.UserQuery)
	}

	roomGroup := r.Group("/room")
	{
		roomGroup.POST("/create", handlers.RoomCreate)
		roomGroup.GET("/query", handlers.RoomQuery)
		roomGroup.POST("/join", handlers.RoomJoin)
		roomGroup.POST("/leave", handlers.RoomLeave)
		roomGroup.GET("/queryOnlineUsers", handlers.RoomQueryOnlineUsers)
	}

	playlistGroup := r.Group("/playlist")
	playlistGroup.Use(middleware.RequireAuth())
	{
		playlistGroup.POST("/add", handlers.PlaylistAdd)
		playlistGroup.GET("/query", handlers.PlaylistQuery)
		playlistGroup.DELETE("/delete", handlers.PlaylistDelete)
		playlistGroup.DELETE("/clear", handlers.PlaylistClear)
		playlistGroup.POST("/updateOrder", handlers.PlaylistUpdateOrder)
		playlistGroup.POST("/switch", handlers.PlaylistSwitch)
	}

	syncGroup := r.Group("/sync")
	syncGroup.Use(middleware.RequireAuth())
	{
		syncGroup.POST("/updateTime", handlers.SyncUpdateTime)
		syncGroup.GET("/query", handlers.SyncQuery)
		syncGroup.POST("/updatePause", handlers.SyncUpdatePause)
		syncGroup.GET("/protocol", handlers.SyncProtocol)
	}

	if wsAdapter != nil {
		r.GET("/ws", wsAdapter.HandleWebSocket)
	}

	if sseAdapter != nil {
		r.GET("/sse/connect", sseAdapter.HandleSSEConnect)
	}
}
