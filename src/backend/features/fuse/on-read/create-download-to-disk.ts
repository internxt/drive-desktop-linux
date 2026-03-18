import { unlink } from 'node:fs/promises';
import { type Readable } from 'node:stream';
import { createWaiterQueue } from './create-waiter-queue';
import { streamFileToDisk } from './stream-file-to-disk';
import { tryCatch } from '../../../../shared/try-catch';

export function createDownloadToDisk(
  readable: Readable,
  filePath: string,
  onProgress: (bytesWritten: number) => void,
): {
  waitForBytes: (position: number, length: number) => Promise<void>;
  destroy: () => Promise<void>;
} {
  const { resolveWaiters, rejectAllWaiters, waitForBytes } = createWaiterQueue();

  const { writeStream, getBytesWritten } = streamFileToDisk(readable, filePath, (bytesWritten) => {
    resolveWaiters(bytesWritten);
    onProgress(bytesWritten);
  });

  writeStream.on('finish', () => {
    resolveWaiters(getBytesWritten());
    rejectAllWaiters(new Error('[createDownloadToDisk] Stream ended before all bytes were served'));
  });

  writeStream.on('error', (err) => {
    rejectAllWaiters(err);
  });

  readable.on('error', (err) => {
    rejectAllWaiters(err);
  });

  return {
    waitForBytes: (position, length) => waitForBytes(position, length),

    async destroy(): Promise<void> {
      readable.destroy();
      writeStream.destroy();
      rejectAllWaiters(new Error('[createDownloadToDisk] Destroyed'));
      await tryCatch(() => unlink(filePath));
    },
  };
}
