import { spawn, ChildProcess } from 'node:child_process';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../../core/electron/paths';

let resolveReady: () => void;
let daemon: ChildProcess | null = null;
const SIGKILL_TIMEOUT_MS = 5_000;

export const daemonReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

export function resolveDaemonReady(): void {
  resolveReady();
}

export function startDaemon(mountPoint: string): Promise<void> {
  const spawnedDaemon = spawn(PATHS.FUSE_DAEMON_BINARY, [], {
    env: {
      ...process.env,
      INTERNXT_MOUNT: mountPoint,
      INTERNXT_SOCKET: PATHS.FUSE_DAEMON_SOCKET,
      INTERNXT_LOG_FILE: PATHS.FUSE_DAEMON_LOG,
    },
  });

  daemon = spawnedDaemon;

  spawnedDaemon.stderr?.on('data', (data: Buffer) => {
    logger.debug({ msg: `[FUSE DAEMON] ${data.toString().trim()}` });
  });

  return new Promise((resolve, reject) => {
    spawnedDaemon.once('exit', (code: number) => {
      if (code !== 0) {
        reject(new Error(`fuse daemon exited before ready with code ${code}`));
      }
    });

    daemonReady.then(resolve);
  });
}

export function stopDaemon(): Promise<void> {
  return new Promise((resolve) => {
    if (!daemon) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      logger.warn({ msg: '[FUSE DAEMON] daemon did not exit after SIGTERM, sending SIGKILL' });
      daemon?.kill('SIGKILL');
    }, SIGKILL_TIMEOUT_MS);

    daemon.once('exit', () => {
      clearTimeout(timeout);
      daemon = null;
      resolve();
    });

    daemon.kill('SIGTERM');
  });
}
