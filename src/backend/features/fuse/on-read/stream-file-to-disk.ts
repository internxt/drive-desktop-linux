import fs from 'node:fs';
import { dirname } from 'node:path';
import { type Readable } from 'node:stream';
import { ensureFolderExists } from '../../../../apps/shared/fs/ensure-folder-exists';

export function streamFileToDisk(readable: Readable, filePath: string, onProgress: (bytesWritten: number) => void) {
  let bytesWritten = 0;

  ensureFolderExists(dirname(filePath));

  const writeStream = fs.createWriteStream(filePath);

  readable.pipe(writeStream);

  const trackProgress = () => {
    bytesWritten = writeStream.bytesWritten;
    onProgress(bytesWritten);
  };

  readable.on('data', trackProgress);
  writeStream.on('drain', trackProgress);

  return {
    writeStream,
    getBytesWritten: () => bytesWritten,
  };
}
