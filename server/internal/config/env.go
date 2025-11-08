package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

// EnvConfig holds all environment configuration
type EnvConfig struct {
	NodeEnv    string
	Port       int
	DBDialect  string
	DBStorage  string
	DBLogging  bool
	LogLevel   string

	MySQLHost     string
	MySQLPort     int
	MySQLDatabase string
	MySQLUsername string
	MySQLPassword string

	PostgresHost     string
	PostgresPort     int
	PostgresDatabase string
	PostgresUsername string
	PostgresPassword string

	DBEnableSSL  bool
	SyncProtocol     string
	CorsAllowOrigins string
	JWTSecret        string
	JWTExpiryHours   int
}

var Env *EnvConfig

// getEnvValue gets environment variable with default value
func getEnvValue(key string, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvInt gets environment variable as integer
func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	intValue, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return intValue
}

// getEnvBool gets environment variable as boolean
func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value == "true"
}

// LoadEnv loads environment variables from .env file
func LoadEnv() error {
	// Load .env file (ignore error if file doesn't exist)
	_ = godotenv.Load()

	Env = &EnvConfig{
		NodeEnv:   getEnvValue("NODE_ENV", "development"),
		Port:      getEnvInt("PORT", 3000),
		DBDialect: getEnvValue("DB_DIALECT", "sqlite"),
		DBStorage: getEnvValue("DB_STORAGE", "./data/sync-player.sqlite"),
		DBLogging: getEnvBool("DB_LOGGING", false),
		LogLevel:  getEnvValue("LOG_LEVEL", "info"),

		MySQLHost:     getEnvValue("MYSQL_HOST", "localhost"),
		MySQLPort:     getEnvInt("MYSQL_PORT", 3306),
		MySQLDatabase: getEnvValue("MYSQL_DATABASE", "sync_player"),
		MySQLUsername: getEnvValue("MYSQL_USERNAME", "root"),
		MySQLPassword: getEnvValue("MYSQL_PASSWORD", "password"),

		PostgresHost:     getEnvValue("POSTGRES_HOST", "localhost"),
		PostgresPort:     getEnvInt("POSTGRES_PORT", 5432),
		PostgresDatabase: getEnvValue("POSTGRES_DATABASE", "sync_player"),
		PostgresUsername: getEnvValue("POSTGRES_USERNAME", "postgres"),
		PostgresPassword: getEnvValue("POSTGRES_PASSWORD", "password"),

		DBEnableSSL:      getEnvBool("DB_ENABLE_SSL", false),
		SyncProtocol:     getEnvValue("SYNC_PROTOCOL", "websocket"),
		CorsAllowOrigins: getEnvValue("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8080"),
		JWTSecret:        getEnvValue("JWT_SECRET", "your-default-secret-key-change-this"),
		JWTExpiryHours:   getEnvInt("JWT_EXPIRY_HOURS", 24),
	}

	return validateEnv()
}

// validateEnv validates required environment variables
func validateEnv() error {
	logger := logrus.New()
	logger.SetLevel(logrus.InfoLevel)

	// Validate DB_DIALECT
	if Env.DBDialect != "sqlite" && Env.DBDialect != "mysql" && Env.DBDialect != "postgres" {
		logger.Errorf("Unsupported DB_DIALECT: %s", Env.DBDialect)
		return fmt.Errorf("unsupported DB_DIALECT: %s", Env.DBDialect)
	}

	// Validate based on dialect
	if Env.DBDialect == "mysql" {
		requiredEnvs := map[string]string{
			"MYSQL_HOST":     Env.MySQLHost,
			"MYSQL_DATABASE": Env.MySQLDatabase,
			"MYSQL_USERNAME": Env.MySQLUsername,
		}
		for key, value := range requiredEnvs {
			if value == "" {
				logger.Errorf("Missing required environment variable: %s", key)
				return fmt.Errorf("missing required environment variable: %s", key)
			}
		}
	} else if Env.DBDialect == "postgres" {
		requiredEnvs := map[string]string{
			"POSTGRES_HOST":     Env.PostgresHost,
			"POSTGRES_DATABASE": Env.PostgresDatabase,
			"POSTGRES_USERNAME": Env.PostgresUsername,
		}
		for key, value := range requiredEnvs {
			if value == "" {
				logger.Errorf("Missing required environment variable: %s", key)
				return fmt.Errorf("missing required environment variable: %s", key)
			}
		}
	} else if Env.DBDialect == "sqlite" {
		if Env.DBStorage == "" {
			logger.Error("Missing required environment variable: DB_STORAGE")
			return fmt.Errorf("missing required environment variable: DB_STORAGE")
		}
	}

	// Validate SYNC_PROTOCOL
	if Env.SyncProtocol != "websocket" && Env.SyncProtocol != "sse" {
		logger.Warnf("Invalid SYNC_PROTOCOL: %s, defaulting to websocket", Env.SyncProtocol)
		Env.SyncProtocol = "websocket"
	}

	return nil
}
