package sync

// SyncManager implements ISyncManager
type SyncManager struct {
	adapter ISyncAdapter
}

var globalSyncManager *SyncManager

// NewSyncManager creates a new sync manager with the given adapter
func NewSyncManager(adapter ISyncAdapter) *SyncManager {
	return &SyncManager{
		adapter: adapter,
	}
}

// Broadcast sends a message to all users in a room except excluded users
func (m *SyncManager) Broadcast(roomID uint, message SyncMessage, excludedUserIDs []uint) {
	if m.adapter != nil {
		m.adapter.Broadcast(roomID, message, excludedUserIDs)
	}
}

// SendToUsers sends a message to specific users
func (m *SyncManager) SendToUsers(roomID uint, userIDs []uint, message SyncMessage) {
	if m.adapter != nil {
		m.adapter.SendToUsers(roomID, userIDs, message)
	}
}

// GetUserIDsInRoom returns all user IDs in a room
func (m *SyncManager) GetUserIDsInRoom(roomID uint) []uint {
	if m.adapter != nil {
		return m.adapter.GetUserIDsInRoom(roomID)
	}
	return []uint{}
}

// GetAdapter returns the underlying adapter (for registering routes)
func (m *SyncManager) GetAdapter() ISyncAdapter {
	return m.adapter
}

// InitSyncManager initializes the global sync manager with the given adapter
func InitSyncManager(adapter ISyncAdapter) {
	globalSyncManager = NewSyncManager(adapter)
}

// GetSyncManager returns the global sync manager
func GetSyncManager() *SyncManager {
	return globalSyncManager
}

// SetAdapter sets the adapter for the sync manager
func (m *SyncManager) SetAdapter(adapter ISyncAdapter) {
	m.adapter = adapter
}
