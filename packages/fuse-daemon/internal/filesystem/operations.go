package filesystem

import (
	"log/slog"

	"github.com/hanwen/go-fuse/v2/fuse"
	"github.com/hanwen/go-fuse/v2/fuse/nodefs"
	"github.com/hanwen/go-fuse/v2/fuse/pathfs"
	"internxt/drive-desktop-linux/fuse-daemon/internal/client"
)

// InternxtFilesystem is the FUSE filesystem implementation.
// Each method corresponds to a FUSE operation forwarded to Electron over HTTP.
//
// To implement an operation:
//  1. Add the method below with its correct signature
//  2. Remove the log line and ENOSYS return
//  3. Call the corresponding endpoint via the HTTP client: fs.client.Post("/op/<name>", ...)
//  4. Map the HTTP response back to the correct fuse.Status
type InternxtFilesystem struct {
	pathfs.FileSystem
	logger *slog.Logger
	client *client.Client
}

func NewInternxtFilesystem(logger *slog.Logger, client *client.Client) *InternxtFilesystem {
	return &InternxtFilesystem{
		FileSystem: pathfs.NewDefaultFileSystem(),
		logger:     logger,
		client:     client,
	}
}
func (fs *InternxtFilesystem) GetAttr(name string, context *fuse.Context) (*fuse.Attr, fuse.Status) {
	fs.logger.Warn("not implemented", "op", "GetAttr", "path", name)
	return nil, fuse.ENOSYS
}

func (fs *InternxtFilesystem) OpenDir(name string, context *fuse.Context) ([]fuse.DirEntry, fuse.Status) {
	fs.logger.Warn("not implemented", "op", "OpenDir", "path", name)
	return nil, fuse.ENOSYS
}
// Open returns a file handle for the given path.
// When implementing: return a nodefs.File handle that implements Read, Write, Release, and Flush.
// File-level operations (Read, Write, Release) belong on that nodefs.File struct, not here.
// TODO: create internal/filesystem/file.go for the file handle implementation.
func (fs *InternxtFilesystem) Open(name string, flags uint32, context *fuse.Context) (nodefs.File, fuse.Status) {
	fs.logger.Warn("not implemented", "op", "Open", "path", name)
	return nil, fuse.ENOSYS
}

// Create creates a new file and returns a file handle.
// When implementing: return a nodefs.File handle for the new file.
func (fs *InternxtFilesystem) Create(name string, flags uint32, mode uint32, context *fuse.Context) (nodefs.File, fuse.Status) {
	fs.logger.Warn("not implemented", "op", "Create", "path", name)
	return nil, fuse.ENOSYS
}

func (fs *InternxtFilesystem) Mkdir(name string, mode uint32, context *fuse.Context) fuse.Status {
	fs.logger.Warn("not implemented", "op", "Mkdir", "path", name)
	return fuse.ENOSYS
}

func (fs *InternxtFilesystem) Rename(oldName string, newName string, context *fuse.Context) fuse.Status {
	fs.logger.Warn("not implemented", "op", "Rename", "oldPath", oldName, "newPath", newName)
	return fuse.ENOSYS
}

func (fs *InternxtFilesystem) Unlink(name string, context *fuse.Context) fuse.Status {
	fs.logger.Warn("not implemented", "op", "Unlink", "path", name)
	return fuse.ENOSYS
}

func (fs *InternxtFilesystem) Rmdir(name string, context *fuse.Context) fuse.Status {
	fs.logger.Warn("not implemented", "op", "Rmdir", "path", name)
	return fuse.ENOSYS
}

func (fs *InternxtFilesystem) GetXAttr(name string, attr string, context *fuse.Context) ([]byte, fuse.Status) {
	fs.logger.Warn("not implemented", "op", "GetXAttr", "path", name, "attr", attr)
	return nil, fuse.ENOSYS
}
