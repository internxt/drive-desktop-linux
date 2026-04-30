package logger

import (
	"fmt"
	"log/slog"
	"os"
)
func New(logFilePath string) *slog.Logger {
	f, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to open log file %s: %v\n", logFilePath, err)
		os.Exit(1)
	}

	return slog.New(slog.NewJSONHandler(f, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
}
