package config

import (
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// GetDatabaseDialector returns the appropriate GORM dialector based on DB_DIALECT
func GetDatabaseDialector() gorm.Dialector {
	switch Env.DBDialect {
	case "sqlite":
		return sqlite.Open(Env.DBStorage)

	case "mysql":
		dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
			Env.MySQLUsername,
			Env.MySQLPassword,
			Env.MySQLHost,
			Env.MySQLPort,
			Env.MySQLDatabase,
		)
		if Env.DBEnableSSL {
			dsn += "&tls=true"
		}
		return mysql.Open(dsn)

	case "postgres":
		dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s",
			Env.PostgresHost,
			Env.PostgresPort,
			Env.PostgresUsername,
			Env.PostgresPassword,
			Env.PostgresDatabase,
		)
		if Env.DBEnableSSL {
			dsn += " sslmode=require"
		} else {
			dsn += " sslmode=disable"
		}
		return postgres.Open(dsn)

	default:
		panic(fmt.Sprintf("unsupported database dialect: %s", Env.DBDialect))
	}
}

// GetGormConfig returns GORM configuration
func GetGormConfig() *gorm.Config {
	var logLevel logger.LogLevel
	if Env.DBLogging {
		logLevel = logger.Info
	} else {
		logLevel = logger.Silent
	}

	return &gorm.Config{
		Logger:         logger.Default.LogMode(logLevel),
		NamingStrategy: nil,
	}
}
