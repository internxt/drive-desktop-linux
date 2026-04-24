package filesystem

import (
	"log/slog"

	"github.com/hanwen/go-fuse/v2/fuse"
	"github.com/hanwen/go-fuse/v2/fuse/nodefs"
)

// InternxtFile is the file handle returned by Open.
// It holds the context needed for future Read/Write implementation.
// Operations with a path-based fallback (GetAttr, Chmod, Chown, Truncate, Utimens)
// are intentionally not overridden — DefaultFile returns ENOSYS which triggers
// the fallback to InternxtFilesystem automatically.
type InternxtFile struct {
	nodefs.File
	path        string
	flag       uint32
	processName string
	logger      *slog.Logger
}

func NewInternxtFile(path string, flag uint32, processName string, logger *slog.Logger) *InternxtFile {
	return &InternxtFile{
		File:        nodefs.NewDefaultFile(),
		path:        path,
		flag:       flag,
		processName: processName,
		logger:      logger,
	}
}

func (f *InternxtFile) String() string {
	return "InternxtFile(" + f.path + ")"
}

func (f *InternxtFile) Read(dest []byte, off int64) (fuse.ReadResult, fuse.Status) {
	f.logger.Warn("not implemented", "op", "Read", "path", f.path)
	return nil, fuse.ENOSYS
}

func (f *InternxtFile) Write(data []byte, off int64) (uint32, fuse.Status) {
	f.logger.Warn("not implemented", "op", "Write", "path", f.path)
	return 0, fuse.ENOSYS
}

func (f *InternxtFile) Flush() fuse.Status {
	f.logger.Warn("not implemented", "op", "Flush", "path", f.path)
	return fuse.ENOSYS
}

func (f *InternxtFile) Release() {
	f.logger.Warn("not implemented", "op", "Release", "path", f.path)
}

func (f *InternxtFile) Fsync(flags int) fuse.Status {
	f.logger.Warn("not implemented", "op", "Fsync", "path", f.path)
	return fuse.ENOSYS
}
