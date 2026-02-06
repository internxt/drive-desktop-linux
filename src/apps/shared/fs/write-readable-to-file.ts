import fs, { PathLike } from 'fs';
import { Readable } from 'stream';

export class WriteReadableToFile {
  static write(
    readable: Readable,
    path: PathLike,
    options?: {
      onProgress?: (bytesWritten: number) => void;
    },
  ): Promise<void> {
    const writableStream = fs.createWriteStream(path);

    let bytesWritten = 0;

    readable.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
      if (options?.onProgress) {
        options.onProgress(bytesWritten);
      }
    });

    readable.pipe(writableStream);

    return new Promise<void>((resolve, reject) => {
      writableStream.on('finish', resolve);
      writableStream.on('error', reject);
    });
  }
}
