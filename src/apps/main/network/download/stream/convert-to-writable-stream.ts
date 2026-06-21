import type { WriteStream } from 'node:fs';
import { WritableStream } from 'node:stream/web';

type Props = { writeStream: WriteStream };

export function convertToWritableStream({ writeStream }: Props): WritableStream<Uint8Array> {
  let isClosed = false;

  return new WritableStream<Uint8Array>({
    async write(chunk) {
      if (isClosed || writeStream.writableEnded || writeStream.destroyed) {
        throw new Error('Write stream already closed');
      }

      const buffer = Buffer.from(chunk);

      return new Promise<void>((resolve, reject) => {
        try {
          writeStream.write(buffer, (err) => {
            if (err) {
              reject(err);
              return;
            }

            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    async close() {
      if (isClosed || writeStream.writableEnded || writeStream.destroyed) {
        isClosed = true;
        return;
      }

      return new Promise<void>((resolve, reject) => {
        try {
          writeStream.end((err: Error) => {
            if (err) {
              reject(err);
              return;
            }

            isClosed = true;
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    async abort(reason) {
      isClosed = true;
      writeStream.destroy(reason);
    },
  });
}
