import type { WriteStream } from 'node:fs';
import { WritableStream } from 'node:stream/web';

type Props = { writeStream: WriteStream };

export function convertToWritableStream({ writeStream }: Props): WritableStream<Uint8Array> {
  return new WritableStream<Uint8Array>({
    async write(chunk) {
      const buffer = Buffer.from(chunk);
      return new Promise<void>((resolve, reject) => {
        writeStream.write(buffer, (err) => {
          if (err) reject(err);

          resolve();
        });
      });
    },
    async close() {
      return new Promise<void>((resolve, reject) => {
        writeStream.end((err: Error) => {
          if (err) reject(err);

          resolve();
        });
      });
    },
    async abort(reason) {
      writeStream.destroy(reason);
    },
  });
}
