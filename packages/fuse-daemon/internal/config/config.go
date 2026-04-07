package config

import (
	"flag"
	"fmt"
	"os"
)

type Config struct {
	MountPoint string
	SocketPath string
	LogFile    string
}
func ParseConfig() Config {
	var config Config

	flag.StringVar(&config.MountPoint, "mount", os.Getenv("INTERNXT_MOUNT"), "FUSE mount point")
	flag.StringVar(&config.SocketPath, "socket", os.Getenv("INTERNXT_SOCKET"), "Unix socket path to Electron HTTP server")
	flag.StringVar(&config.LogFile, "log-file", os.Getenv("INTERNXT_LOG_FILE"), "Log file path")
	flag.Parse()

	var missing []string
	if config.MountPoint == "" {
		missing = append(missing, "--mount / INTERNXT_MOUNT")
	}
	if config.SocketPath == "" {
		missing = append(missing, "--socket / INTERNXT_SOCKET")
	}
	if config.LogFile == "" {
		missing = append(missing, "--log-file / INTERNXT_LOG_FILE")
	}

	if len(missing) > 0 {
		for _, m := range missing {
			fmt.Fprintf(os.Stderr, "missing required config: %s\n", m)
		}
		os.Exit(1)
	}

	return config
}
