package sync

// MessageType 定义所有支持的消息类型
type MessageType string

const (
	MsgTypeAuth           MessageType = "auth"
	MsgTypePing           MessageType = "ping"
	MsgTypePong           MessageType = "pong"
	MsgTypeConnected      MessageType = "connected"
	MsgTypeUpdateTime     MessageType = "updateTime"
	MsgTypeUpdatePause    MessageType = "updatePause"
	MsgTypeUpdateUserList MessageType = "updateUserList"
	MsgTypeUpdatePlaylist MessageType = "updatePlaylist"
	MsgTypeHeartbeat      MessageType = "heartbeat"
)

// BaseMessage 包含公共字段
type BaseMessage struct {
	Type MessageType `json:"type"`
}

// Payload 结构体定义

// SyncDataPayload 同步播放状态
type SyncDataPayload struct {
	Time      float64 `json:"time"`
	Timestamp int64   `json:"timestamp"`
	Paused    bool    `json:"paused"`
	VideoID   uint    `json:"videoId"`
}

// PausePayload 暂停状态
type PausePayload struct {
	Paused    bool  `json:"paused"`
	Timestamp int64 `json:"timestamp"`
}

// UserListPayload 用户列表
type UserListPayload struct {
	RoomID uint `json:"roomId"`
}

// AuthPayload 认证信息
type AuthPayload struct {
	UserID uint   `json:"userId"`
	RoomID uint   `json:"roomId"`
	Token  string `json:"token,omitempty"`
}

// 具体消息定义 - 每个消息都是独立的强类型结构体

// UpdateTimeMessage 更新时间消息
type UpdateTimeMessage struct {
	BaseMessage
	Payload SyncDataPayload `json:"payload"`
}

// UpdatePauseMessage 更新暂停状态消息
type UpdatePauseMessage struct {
	BaseMessage
	Payload PausePayload `json:"payload"`
}

// UpdateUserListMessage 更新用户列表消息
type UpdateUserListMessage struct {
	BaseMessage
	Payload UserListPayload `json:"payload"`
}

// UpdatePlaylistMessage 更新播放列表消息
type UpdatePlaylistMessage struct {
	BaseMessage
}

// ConnectedMessage 连接成功消息
type ConnectedMessage struct {
	BaseMessage
}

// PongMessage Pong 消息
type PongMessage struct {
	BaseMessage
}

// 工厂方法 - 返回具体的结构体指针

// NewUpdateTimeMessage 创建更新时间消息
func NewUpdateTimeMessage(data SyncDataPayload) *UpdateTimeMessage {
	return &UpdateTimeMessage{
		BaseMessage: BaseMessage{Type: MsgTypeUpdateTime},
		Payload:     data,
	}
}

// NewUpdatePauseMessage 创建更新暂停状态消息
func NewUpdatePauseMessage(data PausePayload) *UpdatePauseMessage {
	return &UpdatePauseMessage{
		BaseMessage: BaseMessage{Type: MsgTypeUpdatePause},
		Payload:     data,
	}
}

// NewUpdateUserListMessage 创建更新用户列表消息
func NewUpdateUserListMessage(data UserListPayload) *UpdateUserListMessage {
	return &UpdateUserListMessage{
		BaseMessage: BaseMessage{Type: MsgTypeUpdateUserList},
		Payload:     data,
	}
}

// NewUpdatePlaylistMessage 创建更新播放列表消息
func NewUpdatePlaylistMessage() *UpdatePlaylistMessage {
	return &UpdatePlaylistMessage{
		BaseMessage: BaseMessage{Type: MsgTypeUpdatePlaylist},
	}
}

// NewConnectedMessage 创建连接成功消息
func NewConnectedMessage() *ConnectedMessage {
	return &ConnectedMessage{
		BaseMessage: BaseMessage{Type: MsgTypeConnected},
	}
}

// NewPongMessage 创建 Pong 消息
func NewPongMessage() *PongMessage {
	return &PongMessage{
		BaseMessage: BaseMessage{Type: MsgTypePong},
	}
}

// 向后兼容 - 保留旧的通用消息结构

// SyncMessage 通用消息结构 (已废弃，使用具体的消息类型)
// Deprecated: 使用具体的消息类型如 UpdateTimeMessage, UpdatePauseMessage 等
type SyncMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

// ISyncAdapter 定义同步适配器接口 (WebSocket/SSE)
type ISyncAdapter interface {
	// Broadcast 向房间内所有用户广播消息，排除指定用户
	Broadcast(roomID uint, message interface{}, excludedUserIDs []uint)

	// SendToUsers 向房间内指定用户发送消息
	SendToUsers(roomID uint, userIDs []uint, message interface{})

	// GetUserIDsInRoom 获取房间内所有用户 ID
	GetUserIDsInRoom(roomID uint) []uint

	// Start 启动适配器
	Start() error

	// Stop 停止适配器
	Stop() error
}

// ISyncManager 定义同步管理器接口
type ISyncManager interface {
	// Broadcast 向房间内所有用户广播消息，排除指定用户
	Broadcast(roomID uint, message interface{}, excludedUserIDs []uint)

	// SendToUsers 向房间内指定用户发送消息
	SendToUsers(roomID uint, userIDs []uint, message interface{})

	// GetUserIDsInRoom 获取房间内所有用户 ID
	GetUserIDsInRoom(roomID uint) []uint
}
