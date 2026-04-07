# FUSE Daemon — Architecture & Design Decisions
## Architecture

```
┌────────┐       FUSE        ┌──────────────┐   HTTP over Unix socket   ┌──────────────┐
│ Kernel │◄──── callbacks ──►│  Go Daemon   │◄──── POST /op/xxx ──────►│  Electron    │
│        │                   │              │                           │              │
│        │                   │  - Mounts    │   Go is the HTTP client   │  - HTTP      │
│        │                   │    FUSE      │   Electron is the server  │    server on │
│        │                   │  - Forwards  │                           │    Unix sock │
│        │                   │    ops as    │                           │  - Business  │
│        │                   │    HTTP reqs │                           │    logic     │
│        │                   │  - Returns   │                           │  - Hydration │
│        │                   │    response  │                           │  - Caching   │
│        │                   │    to kernel │                           │  - File tree │
└────────┘                   └──────────────┘                           └──────────────┘
```

## Transport: HTTP over Unix domain socket

**Decision**: Use HTTP over a Unix domain socket, not raw length-prefixed frames.

**Why HTTP over raw frames:**
- Request/response semantics built in — no need to implement our own correlation by request ID
- Standard tooling for debugging (curl supports `--unix-socket`)
- Go's `net/http` and Node's `http` module both natively support Unix sockets
- Error codes map naturally to HTTP status codes
- Easier to extend with new endpoints without changing a frame protocol

**Why Electron is the server, Go is the client:**
- Go receives a FUSE op from the kernel and needs an answer from Electron
- The natural flow is: Go makes an HTTP request, Electron responds
- Go goroutines make blocking HTTP calls trivially concurrent
- The alternative (Go as server, Electron polls for pending ops) adds latency and complexity for no benefit

**Socket path**: `$XDG_RUNTIME_DIR/internxt-fuse.sock` (e.g. `/run/user/1000/internxt-fuse.sock`)

**Who creates the socket**: Electron (it is the HTTP server). The daemon connects as a client.

**Cleanup**: Electron deletes the socket file before binding on every startup to handle leftover files from crashes:

```typescript
fs.rmSync(socketPath, { force: true });
server.listen(socketPath);
```

Electron also deletes it on clean shutdown. The `{ force: true }` flag makes the delete a no-op if the file doesn't exist.

### Protocol

Each FUSE operation maps to an HTTP endpoint:

```
POST /op/getattr   {"path": "/foo.txt"}              → {"mode": 33188, "size": 1024, ...}
POST /op/readdir   {"path": "/"}                     → {"entries": ["file.txt", "dir/"]}
POST /op/open      {"path": "/foo.txt", "flags": 0}  → {"fd": 3}
POST /op/read      {"path": "/foo.txt", "offset": 0, "length": 4096} → base64 encoded body
POST /op/release   {"path": "/foo.txt", "fd": 3}     → {}
```

Errors return HTTP 4xx/5xx with a JSON body containing the FUSE errno:
```json
{"errno": 2, "message": "ENOENT"}
```

### Debugging

You can hit the daemon's backend directly:
```bash
curl --unix-socket /run/user/1000/internxt-fuse.sock \
  -X POST http://localhost/op/getattr \
  -d '{"path": "/foo.txt"}'
```

## Lifecycle

1. Electron creates HTTP server on Unix socket
2. Electron spawns Go daemon as child process (`child_process.spawn`)
3. Go daemon mounts FUSE
4. Go daemon sends `POST /daemon/ready` to Electron — Electron resolves a promise, drive is now usable
5. On stop: Electron sends SIGTERM → daemon unmounts FUSE → process exits. If daemon does not exit within 5 seconds, Electron sends SIGKILL.

## Daemon Configuration

**Decision**: Environment variables as primary config, CLI flags as override.

- Environment variables are the natural fit when Electron controls the spawn environment completely — no user ever sets these manually
- CLI flags allow running the daemon manually for debugging without touching the environment
- CLI flags take precedence over env vars when both are set

| Config | Env var | CLI flag | Example |
|--------|---------|----------|---------|
| Mount point | `INTERNXT_MOUNT` | `--mount` | `/home/user/Internxt` |
| Socket path | `INTERNXT_SOCKET` | `--socket` | `/run/user/1000/internxt-fuse.sock` |

**Readiness signal**: The daemon sends `POST /daemon/ready` to Electron over the Unix socket once FUSE is successfully mounted. Electron resolves a promise when that request arrives.

This is consistent with the existing architecture — Go is already the HTTP client, Electron is already the HTTP server. Readiness is just another HTTP request, no stdout protocol, no polling, no side files.

```typescript
const ready = new Promise<void>((resolve) => {
  app.post('/daemon/ready', (req, res) => {
    res.sendStatus(200);
    resolve();
  });
});

spawnDaemon();
await ready;
// virtual drive is now safe to use
```

If FUSE mounting fails, the daemon exits with a non-zero code. Electron catches this via the process `exit` event — no error path needed on `/daemon/ready` itself.

## Skeleton Scope

The foundation skeleton has one goal: prove the full lifecycle works.

1. Binary starts, reads config (env vars / CLI flags)
2. Connects to Electron's Unix socket
3. Mounts FUSE with `pathfs`
4. Sends `POST /daemon/ready` to Electron
5. All FUSE ops return `ENOSYS` (not implemented) — this is the default in `hanwen/go-fuse`, no explicit implementation needed
6. Handles `SIGTERM`/`SIGINT` → unmounts FUSE → exits cleanly

No file operations are implemented in the skeleton. Each op gets implemented incrementally on top of this foundation.

## FUSE API Layer Choice

**Decision**: Use `pathfs` (`github.com/hanwen/go-fuse/v2/fuse/pathfs`) over the newer `fs` API.

**Why not the `fs` API:**
- The `fs` API is inode-based — you manage node objects and inode numbers yourself. For a cloud drive where the protocol is already path-based (HTTP `POST /op/getattr {"path": "/foo.txt"}`), this adds inode↔path bookkeeping with no user-visible benefit.
- The performance gains of the `fs` API (e.g. `readdirplus`) are irrelevant here — every FUSE op is an HTTP round-trip to Electron, so the bottleneck is always the network, not the FUSE layer.
- The rename race condition in `pathfs` is a microsecond window; cloud drive operations are milliseconds. Near-zero real-world impact.

**Why `pathfs` is safe long-term:**
- `pathfs` is not deprecated — no removal timeline, no warning in the library. It is "legacy" only in the sense that the maintainer recommends new code use the `fs` API.
- This is categorically different from the `@gcas/fuse` pin: that was a native C++ addon bound to Electron's ABI. `pathfs` is a pure Go API layer — migrating off it later is an internal refactor, not a rewrite.
- Migrating from `pathfs` to the `fs` API is a few days of Go work with no external compatibility walls.

**When to revisit**: If rename-race bugs appear in production, or if `pathfs` is formally deprecated with a removal date.

## glibc Compatibility

Go with CGO (required by go-fuse) links against glibc at runtime. A binary compiled against glibc X will run on any system with glibc ≥ X, but not older. This means **compile on the oldest supported target**.

**Target floor: Ubuntu 22.04 LTS (glibc 2.35)**. This covers all actively maintained Linux desktop distros (as of 2026):

| Distro | glibc | Status |
|--------|-------|--------|
| Ubuntu 20.04 LTS | 2.31 | EOL April 2025 (standard) — do not target |
| Debian 11 (Bullseye) | 2.31 | EOL — do not target |
| Linux Mint 21.x | 2.35 | Active (based on Ubuntu 22.04) |
| Ubuntu 22.04 LTS | 2.35 | Active until April 2027 ← floor |
| Ubuntu 24.04 LTS | 2.39 | Active |

**How to enforce this in CI**: Run the Go build step inside a Docker container pinned to `ubuntu:22.04`, regardless of what OS the CI runner uses. This guarantees the glibc floor is always 2.35.

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y golang libfuse-dev
WORKDIR /build
COPY . .
RUN go build -ldflags="-s -w" -o dist/fuse-daemon ./cmd/fuse-daemon
```

**When to revisit**: When Ubuntu 22.04 reaches end-of-life (April 2027), bump the floor to Ubuntu 24.04 (glibc 2.39).

## Mount Options

Options passed to `Mount()` when starting the FUSE server:

| Option | Value | Reason |
|--------|-------|--------|
| `AllowOther` | off | Personal cloud drive — no need for other users to access the mount |
| `DirectMount` | off | Requires `CAP_SYS_ADMIN` — not appropriate for a user-space desktop app |
| `MaxReadAhead` | 128KB | Prevent speculative downloads — we only want to fetch bytes the user actually requested |
| `DisableXAttrs` | off | Xattrs are used to expose `on_local`/`on_remote` file availability status to the desktop environment (e.g. Nautilus badge overlays) |
| `MaxBackground` | default | Pairs with the no-concurrency-limit decision — let the kernel and Go's HTTP client manage this naturally |

## Error Handling: Electron Unreachable

**Decision**: Return `EIO` (errno 5) to the kernel on any HTTP timeout or connection failure.

`EIO` is the correct semantic — it's what network filesystems (NFS, SSHFS) return when the backend is unreachable. `ENOENT` would be wrong (the file exists, the backend is just down). Hanging indefinitely would freeze the calling process.

**Per-operation timeouts**: Different operations have different latency profiles, so timeouts are set per operation type. Values are constants — tune in production based on observed behavior, do not hardcode magic numbers.

| Operation | Timeout | Reason |
|-----------|---------|--------|
| `getattr`, `readdir`, `open`, `release` | 10s | Metadata ops, should always be fast |
| `read` | 60s | Data op — hydration of large files can take time |
| `write`, `create`, `mkdir`, `rename` | 30s | Mutating ops, network-bound |

**On timeout or connection failure**: return `EIO` immediately. Do not retry — retrying FUSE ops is the kernel's responsibility, not the daemon's.

## Logging

**Library**: `log/slog` (Go stdlib, available since Go 1.21). Zero dependencies, structured JSON output, log levels built in. Migrate to `zap` if performance or features demand it.

**Output**: All logs written to stderr, redirected by Electron to `~/.config/internxt/logs/fuse-daemon.log`. This keeps all application logs in one place — same directory as Electron and other daemon logs.

**Log file path passed via config**: `INTERNXT_LOG_FILE` env var / `--log-file` flag. Electron constructs the path and passes it to the daemon at spawn time.

**When to revisit**: If log volume grows enough to warrant rotation or splitting (e.g. separate access log), introduce a `fuse-daemon/` subfolder under `logs/`.

## Shutdown

**Decision**: SIGTERM with a 5-second timeout fallback to SIGKILL.

SIGTERM gives the daemon a chance to unmount FUSE cleanly — critical, as an orphaned FUSE mount requires manual `fusermount -u` to recover. SIGKILL is the safety net if something hangs.

**Daemon side** — standard Go signal handling:

```go
stop := make(chan os.Signal, 1)
signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

<-stop // blocks until signal received

if err := server.Unmount(); err != nil {
    log.Fprintf(os.Stderr, "unmount error: %v\n", err)
}
```

`SIGINT` is included so the daemon can be killed cleanly with `Ctrl+C` during local development without Electron.

**Electron side** — SIGTERM + timeout:

```typescript
daemon.kill('SIGTERM');

const timeout = setTimeout(() => {
  daemon.kill('SIGKILL');
}, 5_000);

daemon.on('exit', () => clearTimeout(timeout));
```

## Build & Distribution

**Approach**: Build from source in CI (Approach 1).

- CI has Go installed, runs `go build` → produces a single static binary
- Electron Builder bundles the binary via `extraResources`
- End users install one .deb/AppImage — the Go binary is inside, no Go needed
- Developers need Go installed to build locally
