# FUSE Daemon — Foundation Tasks

This is the task list for Phase 1: the foundation skeleton. The goal is a mountable FUSE filesystem that proves the full lifecycle works end to end. No file operations are implemented in this phase — all FUSE ops return `ENOSYS` by default.

---

## Go Daemon

### Project Structure
- [ ] Create `cmd/fuse-daemon/main.go` — entry point, wires deps, starts daemon
- [ ] Create `internal/fs/` — `pathfs` implementation (empty for now, all ops default to `ENOSYS`)
- [ ] Create `internal/client/` — HTTP client that will talk to Electron (stubbed for now)

### Configuration
- [ ] Parse config from env vars (`INTERNXT_MOUNT`, `INTERNXT_SOCKET`, `INTERNXT_LOG_FILE`)
- [ ] Parse CLI flags (`--mount`, `--socket`, `--log-file`) as overrides
- [ ] Validate required config on startup — exit with non-zero code if missing

### Logging
- [ ] Set up `log/slog` with JSON output writing to the configured log file path
- [ ] All logs go to stderr / log file — never to stdout (stdout is reserved for protocol use if needed in future)

### FUSE Mount
- [ ] Implement `pathfs.PathFilesystem` with all ops returning `ENOSYS` (default)
- [ ] Mount the filesystem at the configured mount point with correct mount options:
  - `AllowOther`: off
  - `DirectMount`: off
  - `MaxReadAhead`: 128KB
  - `DisableXAttrs`: off

### Readiness
- [ ] After successful FUSE mount, send `POST /daemon/ready` to Electron over the Unix socket
- [ ] If mount fails, exit with non-zero code

### Shutdown
- [ ] Listen for `SIGTERM` and `SIGINT` via `signal.Notify`
- [ ] On signal: unmount FUSE cleanly, then exit
- [ ] If unmount fails, log the error and exit anyway

---

## Electron Side

### Socket
- [ ] Create `src/apps/main/fuse-daemon/constants.ts` with:
  - Socket path: `$XDG_RUNTIME_DIR/internxt-fuse.sock`
  - Daemon binary path: `app.isPackaged ? path.join(process.resourcesPath, 'fuse-daemon') : path.join(__dirname, '../../../../dist/fuse-daemon')`
  - Log file path: `~/.config/internxt/logs/fuse-daemon.log`
- [ ] On startup: `fs.rmSync(socketPath, { force: true })` before binding
- [ ] Create HTTP server on Unix socket

### Readiness endpoint
- [ ] Implement `POST /daemon/ready` handler — resolves the readiness promise
- [ ] If daemon process exits before sending `/daemon/ready`, reject the promise with the exit code

### Spawn & lifecycle
- [ ] Spawn daemon via `child_process.spawn` with env vars set
- [ ] Await readiness promise before marking virtual drive as available
- [ ] On app quit: send SIGTERM → wait for exit → if not exited in 5s, send SIGKILL
- [ ] On clean shutdown: delete socket file

---

## Build & Integration
- [ ] Verify `npm run build:daemon` produces binary at `dist/fuse-daemon`
- [ ] Verify `prestart` npm hook builds the daemon before the app starts
- [ ] Verify VS Code `Build Daemon` task runs before `Start Main Process (Debug)`
- [ ] Verify `extraResources` bundles the binary correctly in a packaged build

---

## Definition of Done for Phase 1

- `npm run start` builds the daemon and starts the app with no manual steps
- The daemon mounts a FUSE filesystem at the configured mount point
- Electron resolves the readiness promise after receiving `POST /daemon/ready`
- `ls` on the mount point returns `ENOSYS` (or an empty directory) — no crash
- Stopping the app sends SIGTERM, daemon unmounts cleanly, no orphaned mount
