package adapters

import (
	"encoding/json"
	"net/http"
	"sync"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	synctypes "sync-player-server/internal/sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// WebSocketAdapter implements ISyncAdapter using WebSocket
type WebSocketAdapter struct {
	connections map[uint]map[uint]*websocket.Conn
	mu          sync.RWMutex
}

// NewWebSocketAdapter creates a new WebSocket adapter
func NewWebSocketAdapter() *WebSocketAdapter {
	return &WebSocketAdapter{
		connections: make(map[uint]map[uint]*websocket.Conn),
	}
}

// HandleWebSocket handles WebSocket connections
func (a *WebSocketAdapter) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		config.Logger.Errorf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	config.Logger.Info("New client connected")
	conn.WriteJSON(map[string]string{"type": "connected"})

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			a.handleClose(conn)
			break
		}

		a.handleMessage(conn, message)
	}
}

func (a *WebSocketAdapter) handleMessage(conn *websocket.Conn, message []byte) {
	var data struct {
		Type    string          `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}

	if err := json.Unmarshal(message, &data); err != nil {
		config.Logger.Errorf("Error parsing message: %v", err)
		return
	}

	if data.Type == "auth" {
		var payload struct {
			UserID uint `json:"userId"`
			RoomID uint `json:"roomId"`
		}
		if err := json.Unmarshal(data.Payload, &payload); err == nil {
			a.handleAuth(conn, payload.UserID, payload.RoomID)
		}
	}
}

func (a *WebSocketAdapter) handleAuth(conn *websocket.Conn, userID, roomID uint) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.connections[roomID] == nil {
		a.connections[roomID] = make(map[uint]*websocket.Conn)
	}
	a.connections[roomID][userID] = conn

	database.SetMemberOnline(roomID, userID, true)
	config.Logger.Infof("User %d connected to room %d", userID, roomID)
}

func (a *WebSocketAdapter) handleClose(conn *websocket.Conn) {
	a.mu.Lock()
	defer a.mu.Unlock()

	for roomID, users := range a.connections {
		for userID, c := range users {
			if c == conn {
				delete(a.connections[roomID], userID)
				database.SetMemberOnline(roomID, userID, false)
				config.Logger.Infof("User %d disconnected from room %d", userID, roomID)
				return
			}
		}
	}
}

// Broadcast sends a message to all users in a room except excluded users
func (a *WebSocketAdapter) Broadcast(roomID uint, message synctypes.SyncMessage, excludedUserIDs []uint) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomConnections := a.connections[roomID]
	if roomConnections == nil {
		return
	}

	excludeMap := make(map[uint]bool)
	for _, id := range excludedUserIDs {
		excludeMap[id] = true
	}

	for userID, conn := range roomConnections {
		if !excludeMap[userID] {
			conn.WriteJSON(message)
		}
	}
}

// SendToUsers sends a message to specific users
func (a *WebSocketAdapter) SendToUsers(roomID uint, userIDs []uint, message synctypes.SyncMessage) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomConnections := a.connections[roomID]
	if roomConnections == nil {
		return
	}

	for _, userID := range userIDs {
		if conn, ok := roomConnections[userID]; ok {
			conn.WriteJSON(message)
		}
	}
}

// GetUserIDsInRoom returns all user IDs in a room
func (a *WebSocketAdapter) GetUserIDsInRoom(roomID uint) []uint {
	a.mu.RLock()
	defer a.mu.RUnlock()

	roomConnections := a.connections[roomID]
	if roomConnections == nil {
		return []uint{}
	}

	userIDs := make([]uint, 0, len(roomConnections))
	for userID := range roomConnections {
		userIDs = append(userIDs, userID)
	}
	return userIDs
}

// Start starts the adapter
func (a *WebSocketAdapter) Start() error {
	config.Logger.Info("WebSocket adapter started")
	return nil
}

// Stop stops the adapter
func (a *WebSocketAdapter) Stop() error {
	a.mu.Lock()
	defer a.mu.Unlock()

	for roomID, users := range a.connections {
		for userID, conn := range users {
			conn.Close()
			database.SetMemberOnline(roomID, userID, false)
		}
	}
	a.connections = make(map[uint]map[uint]*websocket.Conn)
	config.Logger.Info("WebSocket adapter stopped")
	return nil
}
