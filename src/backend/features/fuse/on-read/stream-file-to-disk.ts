import fs from 'node:fs';
import { type Readable } from 'node:stream';

export function streamFileToDisk(readable: Readable, filePath: string, onProgress: (bytesWritten: number) => void) {
  let bytesWritten = 0;

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
