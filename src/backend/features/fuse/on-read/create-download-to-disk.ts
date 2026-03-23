import { unlink } from 'node:fs/promises';
import { type Readable } from 'node:stream';
import { createWaiterQueue } from './create-waiter-queue';
import { streamFileToDisk } from './stream-file-to-disk';
import { tryCatch } from '../../../../shared/try-catch';

type DownloadToDiskCallbacks = {
  onProgress: (bytesWritten: number) => void;
  onFinished: () => void;
  onError: (err: Error) => void;
};

export function createDownloadToDisk(
  readable: Readable,
  filePath: string,
  callbacks: DownloadToDiskCallbacks,
): {
  waitForBytes: (position: number, length: number) => Promise<void>;
  getBytesAvailable: () => number;
  destroy: () => Promise<void>;
} {
  const { resolveWaiters, resolveAllWaiters, rejectAllWaiters, waitForBytes, getBytesAvailable } = createWaiterQueue();

  const onProgress = (bytesWritten: number) => {
    resolveWaiters(bytesWritten);
    callbacks.onProgress(bytesWritten);
  };
  const { writeStream, getBytesWritten } = streamFileToDisk(readable, filePath, onProgress);

  writeStream.on('finish', () => {
    resolveWaiters(getBytesWritten());
    resolveAllWaiters();
    callbacks.onFinished();
  });

  writeStream.on('error', (err) => {
    rejectAllWaiters(err);
    callbacks.onError(err);
  });

  readable.on('error', (err) => {
    rejectAllWaiters(err);
    callbacks.onError(err);
  });

  return {
    waitForBytes: (position, length) => waitForBytes(position, length),
    getBytesAvailable,

    async destroy(): Promise<void> {
      readable.destroy();
      writeStream.destroy();
      rejectAllWaiters(new Error('[createDownloadToDisk] Destroyed'));
      await tryCatch(() => unlink(filePath));
    },
  };
}
