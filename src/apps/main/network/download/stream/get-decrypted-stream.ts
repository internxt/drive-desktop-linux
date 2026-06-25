import type { Decipheriv } from 'node:crypto';
import { ReadableStream } from 'node:stream/web';

type Props = {
  encryptedContentSlices: ReadableStream<Uint8Array>[];
  decipher: Decipheriv;
};

export function getDecryptedStream({ encryptedContentSlices, decipher }: Props): ReadableStream<Uint8Array> {
  const encryptedStream = joinReadableBinaryStreams({ streams: encryptedContentSlices });

  let keepReading = true;

  const decryptedStream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return;

      const reader = encryptedStream.getReader();
      const status = await reader.read();

      if (status.done) {
        controller.close();
      } else {
        controller.enqueue(decipher.update(status.value));
      }

      reader.releaseLock();
    },
    cancel() {
      keepReading = false;
    },
  });

  return decryptedStream;
}

type JoinProps = { streams: ReadableStream<Uint8Array>[] };

export function joinReadableBinaryStreams({ streams }: JoinProps): ReadableStream {
  const streamsCopy = streams.map((stream) => stream);
  let keepReading = true;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  const flush = () => {
    streamsCopy.forEach((stream) => stream.cancel());
    void reader?.cancel();
  };

  const stream = new ReadableStream({
    async pull(controller) {
      if (!keepReading) return flush();

      while (keepReading) {
        if (!reader) {
          const downStream = streamsCopy.shift();

          if (!downStream) {
            controller.close();
            return;
          }

          reader = downStream.getReader();
        }

        const status = await reader.read();

        if (status.done) {
          reader.releaseLock();
          reader = undefined;
          continue;
        }

        controller.enqueue(status.value);
        return;
      }

      flush();
    },
    cancel() {
      keepReading = false;
      flush();
    },
  });

  return stream;
}
