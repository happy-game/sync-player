package database

import (
	"fmt"
	"os"
	"path/filepath"
	"sync-player-server/internal/config"

	"gorm.io/gorm"
)

var DB *gorm.DB

// Connect establishes database connection
func Connect() error {
	var err error

	if config.Env.DBDialect == "sqlite" {
		dataDir := filepath.Dir(config.Env.DBStorage)
		if err := os.MkdirAll(dataDir, 0755); err != nil {
			return fmt.Errorf("failed to create data directory: %w", err)
		}
	}

	dialector := config.GetDatabaseDialector()
	gormConfig := config.GetGormConfig()

	DB, err = gorm.Open(dialector, gormConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	db, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get database instance: %w", err)
	}

	db.SetMaxIdleConns(10)
	db.SetMaxOpenConns(100)

	config.Logger.Info("Successfully connected to database")
	return nil
}

// Close closes the database connection
func Close() error {
	if DB != nil {
		db, err := DB.DB()
		if err != nil {
			return err
		}
		return db.Close()
	}
	return nil
}
