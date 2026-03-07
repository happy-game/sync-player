package handlers

import (
	"errors"
	"net/http"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	"sync-player-server/internal/middleware"
	"sync-player-server/internal/sync"
	"time"

	"github.com/gin-gonic/gin"
)

// SyncUpdateTime updates the playback time
func SyncUpdateTime(c *gin.Context) {
	var req struct {
		Time        float64 `json:"time" binding:"required"`
		Timestamp   int64   `json:"timestamp" binding:"required"`
		VideoID     uint    `json:"videoId" binding:"required"`
		BaseVersion uint64  `json:"baseVersion" binding:"required"`
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

	config.Logger.Infof("sync updateTime: roomId=%d, userId=%d, time=%f, timestamp=%d, videoId=%d",
		userInfo.RoomID, userInfo.UserID, req.Time, req.Timestamp, req.VideoID)

	paused := false
	playStatus, err := database.ApplyRoomPlayStatusUpdate(userInfo.RoomID, &req.BaseVersion, database.RoomPlayStatusUpdate{
		Paused:    &paused,
		Time:      &req.Time,
		Timestamp: &req.Timestamp,
		VideoID:   &req.VideoID,
	})
	if err != nil {
		if errors.Is(err, database.ErrRoomPlayStatusVersionConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Sync version conflict",
				"code":    "SYNC_VERSION_CONFLICT",
				"current": playStatus,
			})
			return
		}

		config.Logger.Errorf("Failed to update room play status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updateTime",
			Payload: map[string]interface{}{
				"roomId":    userInfo.RoomID,
				"userId":    userInfo.UserID,
				"paused":    false,
				"time":      req.Time,
				"timestamp": req.Timestamp,
				"videoId":   req.VideoID,
				"version":   playStatus.Version,
			},
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, playStatus)
}

// SyncQuery queries the playback status
func SyncQuery(c *gin.Context) {
	userInfo, ok := middleware.GetUserInfo(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	config.Logger.Infof("sync query: roomId=%d", userInfo.RoomID)

	playStatus, err := database.GetRoomPlayStatus(userInfo.RoomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Play status not found"})
		return
	}

	now := time.Now().UnixMilli()
	timeDiff := now - playStatus.Timestamp
	if !playStatus.Paused {
		playStatus.Time += float64(timeDiff) / 1000.0
		playStatus.Timestamp = now
	}

	c.JSON(http.StatusOK, playStatus)
}

// SyncUpdatePause updates the pause status
func SyncUpdatePause(c *gin.Context) {
	var req struct {
		Paused      bool   `json:"paused"`
		Timestamp   int64  `json:"timestamp" binding:"required"`
		BaseVersion uint64 `json:"baseVersion" binding:"required"`
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

	config.Logger.Infof("sync updatePause: roomId=%d, userId=%d, paused=%t, timestamp=%d",
		userInfo.RoomID, userInfo.UserID, req.Paused, req.Timestamp)

	playStatus, err := database.ApplyRoomPlayStatusUpdate(userInfo.RoomID, &req.BaseVersion, database.RoomPlayStatusUpdate{
		Paused:    &req.Paused,
		Timestamp: &req.Timestamp,
	})
	if err != nil {
		if errors.Is(err, database.ErrRoomPlayStatusVersionConflict) {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Sync version conflict",
				"code":    "SYNC_VERSION_CONFLICT",
				"current": playStatus,
			})
			return
		}

		config.Logger.Errorf("Failed to update room pause status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	syncManager := sync.GetSyncManager()
	if syncManager != nil {
		syncManager.Broadcast(userInfo.RoomID, sync.SyncMessage{
			Type: "updatePause",
			Payload: map[string]interface{}{
				"roomId":    userInfo.RoomID,
				"userId":    userInfo.UserID,
				"paused":    req.Paused,
				"timestamp": req.Timestamp,
				"version":   playStatus.Version,
			},
		}, []uint{userInfo.UserID})
	}

	c.JSON(http.StatusOK, playStatus)
}

// SyncProtocol returns the sync protocol
func SyncProtocol(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"protocol": config.Env.SyncProtocol})
}
