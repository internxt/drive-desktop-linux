# FUSE Daemon

The Go daemon that mounts a FUSE filesystem and forwards all operations to the Electron app over a Unix domain socket.

## Prerequisites

### Installing Go

The daemon requires Go 1.26+ to build from source.
```bash
wget https://go.dev/dl/go1.26.1.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.1.linux-amd64.tar.gz
```

Add to your `~/.bashrc`:

```bash
export PATH=$PATH:/usr/local/go/bin
```

Then reload:

```bash
source ~/.bashrc
```

## Building

From the repository root:

```bash
npm run build:daemon
```

Or directly:

```bash
cd packages/fuse-daemon
go build -ldflags="-s -w" -o ../../dist/fuse-daemon ./cmd/daemon
```

## Running

The daemon is spawned automatically by Electron, you do not need to run it manually during normal development. Starting the app via `npm run start` or the VS Code `Debug Electron (Full)` launch config handles everything.

If you need to run it manually for debugging:

```bash
INTERNXT_MOUNT=/home/[user]/Internxt \
INTERNXT_SOCKET=/run/[user]/1000/internxt-fuse.sock \
INTERNXT_LOG_FILE=~/.config/internxt/logs/fuse-daemon.log \
./dist/fuse-daemon
```

Or using CLI flags (take precedence over env vars):

```bash
./dist/fuse-daemon \
  --mount /home/[user]/Internxt \
  --socket /run/[user]/1000/internxt-fuse.sock \
  --log-file ~/.config/internxt/logs/fuse-daemon.log
```

## Configuration

| Config | Env var | CLI flag | Required |
|--------|---------|----------|----------|
| Mount point | `INTERNXT_MOUNT` | `--mount` | Yes |
| Socket path | `INTERNXT_SOCKET` | `--socket` | Yes |
| Log file path | `INTERNXT_LOG_FILE` | `--log-file` | Yes |

## Logs

Logs are written to `~/.config/internxt/logs/fuse-daemon.log` alongside other Internxt application logs.

## Unmounting

If the daemon is killed uncleanly and the mount is left orphaned:

```bash
fusermount -u /home/[user]/Internxt
```
