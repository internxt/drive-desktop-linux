package filesystem

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"syscall"
	"testing"
	"time"

	"internxt/drive-desktop-linux/fuse-daemon/internal/client"
)

func TestGetAttr(t *testing.T) {
	t.Run("returns file attributes", func(t *testing.T) {
		now := time.Now().Truncate(time.Second)

		sharedMount.mockServer.setHandler(client.OperationGetAttr, func(response http.ResponseWriter, request *http.Request) {
			respondJSON(response, GetAttributesCallbackData{
				Mode:  0o100644,
				Size:  1234,
				Mtime: now,
				Ctime: now,
				Uid:   uint32(os.Getuid()),
				Gid:   uint32(os.Getgid()),
				Nlink: 1,
			})
		})

		info, err := os.Stat(filepath.Join(sharedMount.mountPoint, fmt.Sprintf("file-%d.txt", time.Now().UnixNano())))
		if err != nil {
			t.Fatalf("stat: %v", err)
		}

		if info.Size() != 1234 {
			t.Errorf("size: got %d, want 1234", info.Size())
		}

		if info.Mode().Perm() != 0o644 {
			t.Errorf("mode: got %v, want 0644", info.Mode().Perm())
		}

		if info.ModTime().Unix() != now.Unix() {
			t.Errorf("mtime: got %v, want %v", info.ModTime().Unix(), now.Unix())
		}
	})

	t.Run("returns directory attributes", func(t *testing.T) {
		sharedMount.mockServer.setHandler(client.OperationGetAttr, func(response http.ResponseWriter, request *http.Request) {
			respondJSON(response, GetAttributesCallbackData{
				Mode:  0o040755,
				Size:  4096,
				Mtime: time.Now(),
				Ctime: time.Now(),
				Uid:   uint32(os.Getuid()),
				Gid:   uint32(os.Getgid()),
				Nlink: 2,
			})
		})

		info, err := os.Stat(filepath.Join(sharedMount.mountPoint, fmt.Sprintf("mydir-%d", time.Now().UnixNano())))
		if err != nil {
			t.Fatalf("stat: %v", err)
		}

		if !info.IsDir() {
			t.Errorf("expected directory, got mode %v", info.Mode())
		}
	})

	t.Run("returns EIO when the server returns an error", func(t *testing.T) {
		sharedMount.mockServer.setHandler(client.OperationGetAttr, func(response http.ResponseWriter, request *http.Request) {
			response.WriteHeader(http.StatusInternalServerError)
		})

		_, err := os.Stat(filepath.Join(sharedMount.mountPoint, fmt.Sprintf("broken-%d.txt", time.Now().UnixNano())))
		if err == nil {
			t.Fatal("expected error, got nil")
		}

		pathErr, ok := err.(*os.PathError)
		if !ok {
			t.Fatalf("expected *os.PathError, got %T", err)
		}

		if pathErr.Err != syscall.EIO {
			t.Errorf("expected EIO, got %v", pathErr.Err)
		}
	})
}
