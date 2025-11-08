package config

import (
	"io"
	"os"
	"path/filepath"

	"github.com/sirupsen/logrus"
)

var Logger *logrus.Logger

// SetupLogger initializes the logger with configuration
func SetupLogger() error {
	Logger = logrus.New()

	level, err := logrus.ParseLevel(Env.LogLevel)
	if err != nil {
		level = logrus.InfoLevel
	}
	Logger.SetLevel(level)

	Logger.SetFormatter(&logrus.TextFormatter{
		FullTimestamp:   true,
		TimestampFormat: "2006-01-02 15:04:05.000",
	})

	logsDir := "logs"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return err
	}

	allLogFile, err := os.OpenFile(
		filepath.Join(logsDir, "all.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0666,
	)
	if err != nil {
		return err
	}

	errorLogFile, err := os.OpenFile(
		filepath.Join(logsDir, "error.log"),
		os.O_CREATE|os.O_WRONLY|os.O_APPEND,
		0666,
	)
	if err != nil {
		return err
	}

	Logger.SetOutput(io.MultiWriter(os.Stdout, allLogFile))

	Logger.AddHook(&ErrorFileHook{
		Writer:    errorLogFile,
		LogLevels: []logrus.Level{logrus.ErrorLevel, logrus.FatalLevel, logrus.PanicLevel},
	})

	return nil
}

// ErrorFileHook is a hook that writes error logs to a separate file
type ErrorFileHook struct {
	Writer    io.Writer
	LogLevels []logrus.Level
}

// Levels returns the log levels that this hook should fire for
func (hook *ErrorFileHook) Levels() []logrus.Level {
	return hook.LogLevels
}

// Fire writes the log entry to the error log file
func (hook *ErrorFileHook) Fire(entry *logrus.Entry) error {
	line, err := entry.String()
	if err != nil {
		return err
	}
	_, err = hook.Writer.Write([]byte(line))
	return err
}
