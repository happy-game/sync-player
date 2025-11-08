package handlers

import (
	"fmt"
	"net/http"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	"sync-player-server/internal/middleware"
	"sync-player-server/internal/models"
	"sync-player-server/internal/sync"
	"time"

	"github.com/gin-gonic/gin"
)

// PlaylistAdd adds an item to the playlist
func PlaylistAdd(c *gin.Context) {
	var req struct {
		Title   string                        `json:"title" binding:"required"`
		Sources []database.VideoSourceInput `json:"sources" binding:"required,min=1,dive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	playlistItemID, err := database.AddItemToPlaylist(userInfo.RoomID, req.Title, req.Sources)
	if err != nil {
		config.Logger.Errorf("Failed to add playlist item: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePlaylist",
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Item added to playlist",
		"playlistItemId": playlistItemID,
	})
}

// PlaylistQuery queries playlist items
func PlaylistQuery(c *gin.Context) {
	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var playlistItemID *uint
	var playStatus *models.PlayStatus

	if idStr := c.Query("playlistItemId"); idStr != "" {
		var id uint
		if _, err := fmt.Sscanf(idStr, "%d", &id); err == nil {
			playlistItemID = &id
		}
	}

	if statusStr := c.Query("playStatus"); statusStr != "" {
		status := models.PlayStatus(statusStr)
		playStatus = &status
	}

	items, err := database.QueryPlaylistItems(userInfo.RoomID, playlistItemID, playStatus)
	if err != nil {
		config.Logger.Errorf("Failed to query playlist items: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// If no playStatus filter is specified, filter out finished items on the server side
	if playStatus == nil {
		filteredItems := make([]models.PlaylistItem, 0)
		for _, item := range items {
			if item.PlayStatus != models.PlayStatusFinished {
				filteredItems = append(filteredItems, item)
			}
		}
		c.JSON(http.StatusOK, filteredItems)
		return
	}

	c.JSON(http.StatusOK, items)
}

// PlaylistDelete deletes a playlist item
func PlaylistDelete(c *gin.Context) {
	var req struct {
		PlaylistItemID uint `json:"playlistItemId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if err := database.DeletePlaylistItem(req.PlaylistItemID); err != nil {
		config.Logger.Errorf("Failed to delete playlist item: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePlaylist",
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item deleted from playlist"})
}

// PlaylistClear clears all playlist items
func PlaylistClear(c *gin.Context) {
	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if err := database.ClearPlaylist(userInfo.RoomID); err != nil {
		config.Logger.Errorf("Failed to clear playlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePlaylist",
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Playlist cleared"})
}

// PlaylistUpdateOrder updates playlist order
func PlaylistUpdateOrder(c *gin.Context) {
	var req struct {
		OrderIndexList []database.OrderIndexUpdate `json:"orderIndexList" binding:"required,min=1,dive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	if err := database.UpdatePlaylistOrderBatch(req.OrderIndexList); err != nil {
		config.Logger.Errorf("Failed to update playlist order: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePlaylist",
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Order updated"})
}

// PlaylistSwitch switches to a playlist item
func PlaylistSwitch(c *gin.Context) {
	var req struct {
		PlaylistItemID uint `json:"playlistItemId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Mark all currently playing items as finished
	playingStatus := models.PlayStatusPlaying
	playingItems, err := database.QueryPlaylistItems(userInfo.RoomID, nil, &playingStatus)
	if err != nil {
		config.Logger.Errorf("Failed to query playing items: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	for _, item := range playingItems {
		if err := database.UpdatePlayStatus(item.ID, models.PlayStatusFinished); err != nil {
			config.Logger.Errorf("Failed to update play status: %v", err)
		}
	}

	// Set the requested item to playing
	if err := database.UpdatePlayStatus(req.PlaylistItemID, models.PlayStatusPlaying); err != nil {
		config.Logger.Errorf("Failed to update play status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Update or create room play status
	_, err = database.GetRoomPlayStatus(userInfo.RoomID)
	if err != nil {
		database.CreateRoomPlayStatus(userInfo.RoomID, false, 0, time.Now().UnixMilli(), req.PlaylistItemID)
	} else {
		database.UpdateRoomPlayStatus(userInfo.RoomID, map[string]any{
			"paused":    false,
			"time":      0.0,
			"timestamp": time.Now().UnixMilli(),
			"video_id":  req.PlaylistItemID,
		})
	}

	// Always broadcast playlist update to sync all clients
	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePlaylist",
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Playlist item switched"})
}
