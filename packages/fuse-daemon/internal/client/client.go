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

type Client struct {
    http *http.Client
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

// Post sends a JSON body to the given operation path and unmarshals the 200 response into out.
// Returns the HTTP status code alongside any error so callers can map non-200 codes to fuse statuses.
// status is http.StatusInternalServerError when an error occurs before a response is received.
func (client *Client) Post(context context.Context, path OperationPath, in any, out any) (int, error) {
	body, err := json.Marshal(in)
	if err != nil {
		return http.StatusInternalServerError, fmt.Errorf("failed to marshal request: %w", err)
	}
	url := serverURL + string(path)
	req, err := http.NewRequestWithContext(context, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return http.StatusInternalServerError, fmt.Errorf("error creating Post request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.http.Do(req)
	if err != nil {
		return http.StatusInternalServerError, fmt.Errorf("sending Post request: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return resp.StatusCode, fmt.Errorf("unexpected status from Post endpoint: %d", resp.StatusCode)
	}
	if out == nil {
		return resp.StatusCode, nil
	}
	resBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, fmt.Errorf("failed to read response body: %w", err)
	}
	if err = json.Unmarshal(resBody, out); err != nil {
		return resp.StatusCode, fmt.Errorf("failed to unmarshal response: %w", err)
	}
	return resp.StatusCode, nil
}
