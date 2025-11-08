package database

import (
	"sync-player-server/internal/models"

	"gorm.io/gorm"
)

// CreateUser creates a new user
func CreateUser(username string, password *string, tx ...*gorm.DB) (*models.User, error) {
	db := getDB(tx...)

	user := &models.User{
		Username:     username,
		PasswordHash: password,
	}

	if err := db.Create(user).Error; err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByUsername retrieves a user by username
func GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	if err := DB.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID
func GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := DB.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// getDB returns the database instance to use (transaction or default)
func getDB(tx ...*gorm.DB) *gorm.DB {
	if len(tx) > 0 && tx[0] != nil {
		return tx[0]
	}
	return DB
}
