package filesystem

import (
	"context"
	"log/slog"

	"internxt/drive-desktop-linux/fuse-daemon/internal/client"

	"github.com/hanwen/go-fuse/v2/fuse"
	"github.com/hanwen/go-fuse/v2/fuse/nodefs"
)

type WriteCallbackData struct {
	Written uint32 `json:"written"`
}

// InternxtFile is the file handle returned by Open.
// It holds the context needed for future Read/Write implementation.
// Operations with a path-based fallback (GetAttr, Chmod, Chown, Truncate, Utimens)
// are intentionally not overridden — DefaultFile returns ENOSYS which triggers
// the fallback to InternxtFilesystem automatically.
type InternxtFile struct {
	nodefs.File
	path        string
	flag        uint32
	processName string
	logger      *slog.Logger
	client      *client.Client
}

func NewInternxtFile(path string, flag uint32, processName string, logger *slog.Logger, c *client.Client) *InternxtFile {
	return &InternxtFile{
		File:        nodefs.NewDefaultFile(),
		path:        path,
		flag:        flag,
		processName: processName,
		logger:      logger,
		client:      c,
	}
}

func (f *InternxtFile) String() string {
	return "InternxtFile(" + f.path + ")"
}

func (f *InternxtFile) Read(dest []byte, off int64) (fuse.ReadResult, fuse.Status) {
	f.logger.Debug("Received Read call", "path", f.path, "offset", off, "length", len(dest))
	body := struct {
		Path        string `json:"path"`
		Offset      int64  `json:"offset"`
		Length      int    `json:"length"`
		ProcessName string `json:"processName"`
	}{Path: f.path, Offset: off, Length: len(dest), ProcessName: f.processName}

	bytesRead, status := f.client.PostBinary(context.Background(), client.OperationRead, body, dest)
	if status != fuse.OK {
		f.logger.Error("Error occurred while reading file", "status", status)
		return nil, status
	}
	return fuse.ReadResultData(dest[:bytesRead]), fuse.OK
}

func (f *InternxtFile) Write(data []byte, off int64) (uint32, fuse.Status) {
	f.logger.Debug("Received Write call", "path", f.path, "offset", off, "length", len(data))
	body := struct {
		Path   string `json:"path"`
		Offset int64  `json:"offset"`
		Data   []byte `json:"data"`
	}{Path: f.path, Offset: off, Data: data}

	response := WriteCallbackData{}
	if status := f.client.Post(context.Background(), client.OperationWrite, body, &response); status != fuse.OK {
		f.logger.Error("Error occurred while writing file", "status", status)
		return 0, status
	}

	if response.Written == 0 && len(data) > 0 {
		return uint32(len(data)), fuse.OK
	}

	if response.Written > uint32(len(data)) {
		f.logger.Error("Invalid bytes written from write callback", "written", response.Written, "requested", len(data))
		return 0, fuse.EIO
	}

	return response.Written, fuse.OK
}

// Flush is called on each close(2) of the file descriptor.
// Multiple flushes may occur if the file descriptor was duplicated.
// Data is already persisted to the temporal file via Write, so no action is needed here.
func (f *InternxtFile) Flush() fuse.Status {
	return fuse.OK
}

func (f *InternxtFile) Release() {
	f.logger.Debug("Received Release call:", "path", f.path)
	body := struct {
		Path        string `json:"path"`
		ProcessName string `json:"processName"`
	}{Path: f.path, ProcessName: f.processName}
	if status := f.client.Post(context.Background(), client.OperationRelease, body, nil); status != fuse.OK {
		f.logger.Warn("Release call failed", "path", f.path, "status", status)
	}
}

func (f *InternxtFile) Fsync(flags int) fuse.Status {
	f.logger.Warn("not implemented", "op", "Fsync", "path", f.path)
	return fuse.ENOSYS
}
