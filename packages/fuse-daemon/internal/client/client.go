package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"time"
)

type HTTPStatusError struct {
	StatusCode int
}

func (err *HTTPStatusError) Error() string {
	return fmt.Sprintf("unexpected status from Post endpoint: %d", err.StatusCode)
}

type Client struct {
	http       *http.Client
	socketPath string
}

func NewClient(socketPath string) *Client {
	return &Client{
		http:       NewUnixSocketClient(socketPath),
		socketPath: socketPath,
	}
}

func NewUnixSocketClient(socketPath string) *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
				return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
			},
		},
	}
}

// NotifyReady sends POST /daemon/ready to Electron to signal the daemon is up.
func (client *Client) NotifyReady(logger *slog.Logger) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://localhost/daemon/ready", nil)
	if err != nil {
		return fmt.Errorf("creating ready request: %w", err)
	}

	resp, err := client.http.Do(req)
	if err != nil {
		return fmt.Errorf("sending ready request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status from ready endpoint: %d", resp.StatusCode)
	}

	logger.Info("notified electron of readiness")
	return nil
}

func (client *Client) Post(context context.Context, path OperationPath, in any, out any) error {
	body, err := json.Marshal(in)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}
	url := serverURL + string(path)
	req, err := http.NewRequestWithContext(context, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("error creating Post request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := client.http.Do(req)
	if err != nil {
		return fmt.Errorf("sending Post request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return &HTTPStatusError{StatusCode: resp.StatusCode}
	}
	resBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response body: %w", err)
	}
	err = json.Unmarshal(resBody, out)
	if err != nil {
		return fmt.Errorf("failed to unmarshal response: %w", err)
	}
	return nil
}
