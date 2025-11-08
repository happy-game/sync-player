package main

import (
	"fmt"
	"os"
	"os/signal"
	"strings"
	"sync-player-server/internal/config"
	"sync-player-server/internal/database"
	"sync-player-server/internal/routes"
	"sync-player-server/internal/sync"
	"sync-player-server/internal/sync/adapters"
	"syscall"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	if err := config.LoadEnv(); err != nil {
		fmt.Printf("Failed to load environment: %v\n", err)
		os.Exit(1)
	}

	if err := config.SetupLogger(); err != nil {
		fmt.Printf("Failed to setup logger: %v\n", err)
		os.Exit(1)
	}

	config.Logger.Info("Starting Sync Player Server...")

	if err := database.InitDatabase(); err != nil {
		config.Logger.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	if config.Env.NodeEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	allowOrigins := strings.Split(config.Env.CorsAllowOrigins, ",")
	for i, origin := range allowOrigins {
		allowOrigins[i] = strings.TrimSpace(origin)
	}
	corsConfig.AllowOrigins = allowOrigins
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "Cookie"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	r.Use(cors.New(corsConfig))

	adapter, err := adapters.NewAdapter(config.Env.SyncProtocol)
	if err != nil {
		config.Logger.Fatalf("Failed to create sync adapter: %v", err)
	}

	sync.InitSyncManager(adapter)

	var wsAdapter *adapters.WebSocketAdapter
	var sseAdapter *adapters.SSEAdapter

	if config.Env.SyncProtocol == "websocket" {
		wsAdapter, _ = adapter.(*adapters.WebSocketAdapter)
		config.Logger.Info("Using WebSocket for sync")
	} else if config.Env.SyncProtocol == "sse" {
		sseAdapter, _ = adapter.(*adapters.SSEAdapter)
		config.Logger.Info("Using SSE for sync")
	}

	routes.SetupRoutes(r, wsAdapter, sseAdapter)

	addr := fmt.Sprintf(":%d", config.Env.Port)
	config.Logger.Infof("Server listening on %s", addr)
	config.Logger.Infof("Environment: %s", config.Env.NodeEnv)
	config.Logger.Infof("Database: %s", config.Env.DBDialect)
	config.Logger.Infof("Sync Protocol: %s", config.Env.SyncProtocol)

	go func() {
		if err := r.Run(addr); err != nil {
			config.Logger.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	config.Logger.Info("Shutting down server...")

	if adapter != nil {
		if err := adapter.Stop(); err != nil {
			config.Logger.Errorf("Error stopping sync adapter: %v", err)
		}
	}

	config.Logger.Info("Server stopped")
}
