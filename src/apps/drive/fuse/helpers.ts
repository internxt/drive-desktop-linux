import { exec } from 'child_process';
import Fuse from 'fuse-native';
import Logger from 'electron-log';

export function unmountFusedDirectory(mountPoint: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(`umount ${mountPoint}`, (error, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        // If there's anything in stderr, it usually indicates an error
        reject(new Error(stderr));
        return;
      }

      resolve(stdout);
    });
  });
}

export function mountPromise(fuse: Fuse): Promise<void> {
  return new Promise((resolve, reject) => {
    fuse.mount((err: unknown) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export function unmountPromise(fuse: Fuse): Promise<void> {
  return new Promise((resolve, reject) => {
    Logger.info('[helpers] Initiating unmount with timeout');
    const timeout = setTimeout(() => {
      Logger.error('[helpers] Unmount operation timed out');
      reject(new Error('Unmount operation timed out'));
    }, 5000);

    fuse.unmount((err: unknown) => {
      clearTimeout(timeout);
      if (err) {
        Logger.error('[helpers] Unmount failed', err);
        reject(err);
        return;
      }

      Logger.info('[helpers] Unmounted successfully');
      resolve();
    });
  });
}
