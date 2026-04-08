import fs from 'fs';
import express from 'express';
import { Server } from 'http';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../core/electron/paths';
import { buildDaemonRouter } from './routes/daemon.routes';
import { buildOperationsRouter } from './routes/operations.routes';

let server: Server | null = null;

export function startFuseDaemonServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    app.use('/daemon', buildDaemonRouter());
    app.use('/op', buildOperationsRouter());

    fs.rmSync(PATHS.FUSE_DAEMON_SOCKET, { force: true });

    server = app.listen(PATHS.FUSE_DAEMON_SOCKET, () => {
      logger.debug({ msg: '[FUSE DAEMON] server listening', socket: PATHS.FUSE_DAEMON_SOCKET });
      resolve();
    });
  });
}

export function stopFuseDaemonServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      fs.rmSync(PATHS.FUSE_DAEMON_SOCKET, { force: true });
      server = null;
      resolve();
    });
  });
}
