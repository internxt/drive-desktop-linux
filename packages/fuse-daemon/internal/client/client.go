package client

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"time"
)

// New returns an HTTP client configured to talk to Electron over the Unix socket.
func New(socketPath string) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
			},
		},
	}
}

// NotifyReady sends POST /daemon/ready to Electron to signal the daemon is up.
func NotifyReady(socketPath string, logger *slog.Logger) error {
	client := New(socketPath)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://localhost/daemon/ready", nil)
	if err != nil {
		return fmt.Errorf("creating ready request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sending ready request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status from ready endpoint: %d", resp.StatusCode)
	}

	logger.Info("notified electron of readiness")
	return nil
}
