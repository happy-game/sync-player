package adapters

import (
	"fmt"
	"sync-player-server/internal/config"
	"sync-player-server/internal/sync"
)

// NewAdapter creates a new sync adapter based on the protocol
func NewAdapter(protocol string) (sync.ISyncAdapter, error) {
	config.Logger.Infof("Creating adapter for protocol: %s", protocol)

	switch protocol {
	case "websocket":
		adapter := NewWebSocketAdapter()
		if err := adapter.Start(); err != nil {
			return nil, fmt.Errorf("failed to start WebSocket adapter: %w", err)
		}
		return adapter, nil
	case "sse":
		adapter := NewSSEAdapter()
		if err := adapter.Start(); err != nil {
			return nil, fmt.Errorf("failed to start SSE adapter: %w", err)
		}
		return adapter, nil
	default:
		return nil, fmt.Errorf("unsupported sync protocol: %s", protocol)
	}
}
