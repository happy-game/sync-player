package sync

// SyncMessage represents a message to be synced across clients
type SyncMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

// ISyncAdapter defines the interface for sync adapters (WebSocket/SSE)
type ISyncAdapter interface {
	// Broadcast sends a message to all users in a room except excluded users
	Broadcast(roomID uint, message SyncMessage, excludedUserIDs []uint)

	// SendToUsers sends a message to specific users in a room
	SendToUsers(roomID uint, userIDs []uint, message SyncMessage)

	// GetUserIDsInRoom returns all user IDs currently connected in a room
	GetUserIDsInRoom(roomID uint) []uint

	// Start starts the adapter
	Start() error

	// Stop stops the adapter
	Stop() error
}

// ISyncManager defines the interface for the sync manager
type ISyncManager interface {
	// Broadcast sends a message to all users in a room except excluded users
	Broadcast(roomID uint, message SyncMessage, excludedUserIDs []uint)

	// SendToUsers sends a message to specific users in a room
	SendToUsers(roomID uint, userIDs []uint, message SyncMessage)

	// GetUserIDsInRoom returns all user IDs currently connected in a room
	GetUserIDsInRoom(roomID uint) []uint
}
