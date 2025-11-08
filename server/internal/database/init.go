package database

import (
	"fmt"
	"sync-player-server/internal/config"
	"sync-player-server/internal/models"
)

// InitDatabase initializes the database and runs migrations
func InitDatabase() error {
	if err := Connect(); err != nil {
		return err
	}

	if err := AutoMigrate(); err != nil {
		return err
	}

	config.Logger.Info("Database initialized successfully")
	return nil
}

// AutoMigrate runs database migrations for all models
func AutoMigrate() error {
	err := DB.AutoMigrate(
		&models.User{},
		&models.Room{},
		&models.RoomMember{},
		&models.PlaylistItem{},
		&models.VideoSource{},
		&models.RoomPlayStatus{},
	)
	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	config.Logger.Info("Database models synced")
	return nil
}
