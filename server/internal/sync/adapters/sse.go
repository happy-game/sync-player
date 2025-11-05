package adapters

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	synctypes "sync-player-server/internal/sync"
	"time"

	"github.com/gin-gonic/gin"
)

// SSEClient represents an SSE client connection
type SSEClient struct {
	UserID   uint
	RoomID   uint
	Writer   gin.ResponseWriter
	Flusher  http.Flusher
	Done     chan bool
}

// SSEAdapter implements ISyncAdapter using Server-Sent Events
type SSEAdapter struct {
	connections map[uint]map[uint]*SSEClient
	mu          sync.RWMutex
}

// NewSSEAdapter creates a new SSE adapter
func NewSSEAdapter() *SSEAdapter {
	return &SSEAdapter{
		connections: make(map[uint]map[uint]*SSEClient),
	}
}

// HandleSSEConnect handles SSE connection requests
func (a *SSEAdapter) HandleSSEConnect(c *gin.Context) {
	userIDStr := c.Query("userId")
	roomIDStr := c.Query("roomId")

	var userID, roomID uint
	if _, err := fmt.Sscanf(userIDStr, "%d", &userID); err != nil {
		c.JSON(400, gin.H{"error": "Invalid userId"})
		return
	}
	if _, err := fmt.Sscanf(roomIDStr, "%d", &roomID); err != nil {
		c.JSON(400, gin.H{"error": "Invalid roomId"})
		return
	}

	// Set SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(500, gin.H{"error": "Streaming not supported"})
		return
	}

	client := &SSEClient{
		UserID:  userID,
		RoomID:  roomID,
		Writer:  c.Writer,
		Flusher: flusher,
		Done:    make(chan bool),
	}

	// Register client
	a.mu.Lock()
	if a.connections[roomID] == nil {
		a.connections[roomID] = make(map[uint]*SSEClient)
	}
	a.connections[roomID][userID] = client
	a.mu.Unlock()

	database.SetMemberOnline(roomID, userID, true)
	config.Logger.Infof("User %d connected to room %d using SSE", userID, roomID)

	// Send connected message
	a.sendEvent(client, "connected", map[string]interface{}{})

	// Start heartbeat
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	// Keep connection alive
	for {
		select {
		case <-c.Request.Context().Done():
			a.handleDisconnect(roomID, userID)
			return
		case <-client.Done:
			a.handleDisconnect(roomID, userID)
			return
		case <-ticker.C:
			// Send heartbeat
			fmt.Fprintf(client.Writer, ":\n\n")
			client.Flusher.Flush()
		}
	}
}

func (a *SSEAdapter) sendEvent(client *SSEClient, eventType string, data interface{}) {
	message := map[string]interface{}{
		"type": eventType,
		"data": data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		config.Logger.Errorf("Failed to marshal message: %v", err)
		return
	}

	fmt.Fprintf(client.Writer, "data: %s\n\n", jsonData)
	client.Flusher.Flush()
}

func (a *SSEAdapter) handleDisconnect(roomID, userID uint) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.connections[roomID] != nil {
		delete(a.connections[roomID], userID)
	}

	database.SetMemberOnline(roomID, userID, false)
	config.Logger.Infof("User %d disconnected from room %d", userID, roomID)
}

// Broadcast sends a message to all users in a room except excluded users
func (a *SSEAdapter) Broadcast(roomID uint, message synctypes.SyncMessage, excludedUserIDs []uint) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomClients := a.connections[roomID]
	if roomClients == nil {
		return
	}

	excludeMap := make(map[uint]bool)
	for _, id := range excludedUserIDs {
		excludeMap[id] = true
	}

	for userID, client := range roomClients {
		if !excludeMap[userID] {
			a.sendEvent(client, message.Type, message)
		}
	}
}

// SendToUsers sends a message to specific users
func (a *SSEAdapter) SendToUsers(roomID uint, userIDs []uint, message synctypes.SyncMessage) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomClients := a.connections[roomID]
	if roomClients == nil {
		return
	}

	for _, userID := range userIDs {
		if client, ok := roomClients[userID]; ok {
			a.sendEvent(client, message.Type, message)
		}
	}
}

// GetUserIDsInRoom returns all user IDs in a room
func (a *SSEAdapter) GetUserIDsInRoom(roomID uint) []uint {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomClients := a.connections[roomID]
	if roomClients == nil {
		return []uint{}
	}

	userIDs := make([]uint, 0, len(roomClients))
	for userID := range roomClients {
		userIDs = append(userIDs, userID)
	}
	return userIDs
}

// Start starts the adapter
func (a *SSEAdapter) Start() error {
	config.Logger.Info("SSE adapter started")
	return nil
}

// Stop stops the adapter
func (a *SSEAdapter) Stop() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	for roomID, clients := range a.connections {
		for userID, client := range clients {
			close(client.Done)
			database.SetMemberOnline(roomID, userID, false)
		}
	}
	a.connections = make(map[uint]map[uint]*SSEClient)
	config.Logger.Info("SSE adapter stopped")
	return nil
}
